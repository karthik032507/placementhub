const Company = require("../models/Company");
const { saveUploadedFile, deleteStoredFile, sendStoredFile } = require("../middleware/upload");
const Application = require("../models/Application");
const User = require("../models/User");
const Notification = require("../models/Notification");
const httpError = require("../utils/httpError");

const { WORK_MODES, COMPANY_STATUSES } = Company;
const REQUIRED_FIELDS = ["name", "description", "jobRole", "package", "location", "workMode", "applicationDeadline"];

// Reads and validates company fields from the request body.
// Used by both create and update so the rules live in one place.
function readCompanyFields(body, { requireAll }) {
  const data = {};

  for (const field of REQUIRED_FIELDS) {
    const value = body[field];
    if (value === undefined) {
      if (requireAll) throw httpError(400, `${field} is required.`);
      continue;
    }
    if (typeof value !== "string" || !value.trim()) throw httpError(400, `${field} cannot be empty.`);
    data[field] = value.trim();
  }

  if (data.workMode && !WORK_MODES.includes(data.workMode)) {
    throw httpError(400, `workMode must be one of: ${WORK_MODES.join(", ")}.`);
  }

  if (data.applicationDeadline) {
    const deadline = new Date(data.applicationDeadline);
    if (Number.isNaN(deadline.getTime())) throw httpError(400, "applicationDeadline is not a valid date.");
    data.applicationDeadline = deadline;
  }

  if (body.jobDescription !== undefined) data.jobDescription = String(body.jobDescription).trim();
  if (body.companyWebsite !== undefined) data.companyWebsite = String(body.companyWebsite).trim();

  if (body.status !== undefined) {
    if (!COMPANY_STATUSES.includes(body.status)) throw httpError(400, "status must be OPEN or CLOSED.");
    data.status = body.status;
  }

  return data;
}

// GET /api/companies  (any logged-in user)
async function listCompanies(req, res) {
  const companies = await Company.find().sort({ createdAt: -1 }).populate("createdBy", "name").lean();

  if (req.user.role === "STUDENT") {
    // Attach the student's own application status to each company so the UI can show
    // "Application Submitted" instead of "Apply Now" without extra requests.
    const myApplications = await Application.find({ student: req.user.id }).select("company status").lean();
    const statusByCompany = new Map(myApplications.map((a) => [a.company.toString(), a.status]));
    for (const company of companies) {
      company.myApplicationStatus = statusByCompany.get(company._id.toString()) || null;
    }
  } else {
    // Admins see how many students applied to each company.
    const counts = await Application.aggregate([{ $group: { _id: "$company", count: { $sum: 1 } } }]);
    const countByCompany = new Map(counts.map((c) => [c._id.toString(), c.count]));
    for (const company of companies) {
      company.applicantCount = countByCompany.get(company._id.toString()) || 0;
    }
  }

  res.json({ success: true, data: { companies } });
}

// GET /api/companies/:id
async function getCompany(req, res) {
  const company = await Company.findById(req.params.id).populate("createdBy", "name").lean();
  if (!company) throw httpError(404, "Company not found.");

  if (req.user.role === "STUDENT") {
    const myApplication = await Application.findOne({ student: req.user.id, company: company._id }).select("status appliedAt").lean();
    company.myApplication = myApplication || null;
  } else {
    company.applicantCount = await Application.countDocuments({ company: company._id });
  }

  res.json({ success: true, data: { company } });
}

// POST /api/companies  (ADMIN, SUPER_ADMIN)
async function createCompany(req, res) {
  const data = readCompanyFields(req.body, { requireAll: true });

  if (data.applicationDeadline <= new Date()) {
    throw httpError(400, "Application deadline must be in the future.");
  }

  const company = await Company.create({ ...data, status: "OPEN", createdBy: req.user.id });

  // Notify every active student. No sockets: they see it the next time they fetch notifications.
  const students = await User.find({ role: "STUDENT", isActive: true }).select("_id").lean();
  if (students.length > 0) {
    await Notification.insertMany(
      students.map((student) => ({
        user: student._id,
        company: company._id,
        type: "NEW_COMPANY",
        title: "New company added",
        message: `${company.name} is now hiring for ${company.jobRole}. Apply before ${company.applicationDeadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`,
      }))
    );
  }

  res.status(201).json({ success: true, message: "Company created successfully.", data: { company } });
}

// PUT /api/companies/:id  (ADMIN, SUPER_ADMIN)
async function updateCompany(req, res) {
  const company = await Company.findById(req.params.id);
  if (!company) throw httpError(404, "Company not found.");

  const data = readCompanyFields(req.body, { requireAll: false });
  Object.assign(company, data);
  await company.save();

  res.json({ success: true, message: "Company updated successfully.", data: { company } });
}

// PATCH /api/companies/:id/close  (ADMIN, SUPER_ADMIN)
async function closeCompany(req, res) {
  const company = await Company.findById(req.params.id);
  if (!company) throw httpError(404, "Company not found.");
  if (company.status === "CLOSED") throw httpError(400, "Company is already closed.");

  company.status = "CLOSED";
  await company.save();

  res.json({ success: true, message: "Company closed. No new applications will be accepted.", data: { company } });
}

// POST /api/companies/:id/job-description  (ADMIN, SUPER_ADMIN)  multipart: file (PDF)
// Uploading again replaces the previous PDF.
async function uploadJobDescription(req, res) {
  if (!req.file) throw httpError(400, "Please choose a PDF file to upload.");

  const company = await Company.findById(req.params.id);
  if (!company) throw httpError(404, "Company not found.");

  const previous = company.jobDescriptionFile;
  const stored = await saveUploadedFile(req.file);
  company.jobDescriptionFile = { ...stored, uploadedAt: new Date() };
  await company.save();

  // Only drop the old PDF once the new one is safely saved.
  if (previous) await deleteStoredFile(previous.file);

  res.status(201).json({ success: true, message: "Job description PDF uploaded.", data: { company } });
}

// DELETE /api/companies/:id/job-description  (ADMIN, SUPER_ADMIN)
async function deleteJobDescription(req, res) {
  const company = await Company.findById(req.params.id);
  if (!company) throw httpError(404, "Company not found.");
  if (!company.jobDescriptionFile) throw httpError(404, "This company has no job description PDF.");

  await deleteStoredFile(company.jobDescriptionFile.file);
  company.jobDescriptionFile = null;
  await company.save();

  res.json({ success: true, message: "Job description PDF removed.", data: { company } });
}

// GET /api/companies/:id/job-description  (any logged-in user)
async function downloadJobDescription(req, res) {
  const company = await Company.findById(req.params.id).select("name jobDescriptionFile");
  if (!company) throw httpError(404, "Company not found.");
  if (!company.jobDescriptionFile) throw httpError(404, "This company has no job description PDF.");

  await sendStoredFile(res, company.jobDescriptionFile.file, company.jobDescriptionFile.originalName);
}

module.exports = { listCompanies, getCompany, createCompany, updateCompany, closeCompany, uploadJobDescription, deleteJobDescription, downloadJobDescription };
