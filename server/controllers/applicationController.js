const path = require("path");
const Application = require("../models/Application");
const { saveUploadedFile, copyStoredFile, sendStoredFile } = require("../middleware/upload");
const Company = require("../models/Company");
const User = require("../models/User");
const Notification = require("../models/Notification");
const httpError = require("../utils/httpError");

const { APPLICATION_STATUSES } = Application;

// Multer keeps the upload in memory (req.file.buffer) and writes nothing anywhere.
// The bytes are only persisted after every check below has passed, so a rejected
// application cannot leave a stray file behind.

// Which status changes an administrator may perform.
const ADMIN_TRANSITIONS = {
  APPLIED: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["SELECTED", "REJECTED"],
  SELECTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

// Human-readable notification text for each admin status change.
function statusNotification(status, companyName) {
  switch (status) {
    case "SHORTLISTED":
      return { title: "You have been shortlisted", message: `You have been shortlisted for ${companyName}.` };
    case "SELECTED":
      return { title: "Congratulations, you are selected", message: `Congratulations! You have been selected by ${companyName}.` };
    case "REJECTED":
      return { title: "Application update", message: `Your application for ${companyName} was not shortlisted.` };
    default:
      return { title: "Application update", message: `Your application status for ${companyName} is now ${status}.` };
  }
}

// POST /api/applications  (STUDENT)  multipart/form-data:
//   companyId, password, and EITHER resumeId (a saved profile resume) OR resume (a new PDF file).
//   saveToProfile="true" also stores a newly uploaded file in the profile (if there is room).
async function createApplication(req, res) {
  const { companyId, password, resumeId, saveToProfile } = req.body;
  const file = req.file;

  if (!companyId) throw httpError(400, "companyId is required.");

  const company = await Company.findById(companyId);
  if (!company) throw httpError(404, "Company not found.");
  if (company.status !== "OPEN") throw httpError(400, "This company is no longer accepting applications.");
  if (new Date() >= company.applicationDeadline) throw httpError(400, "The application deadline for this company has passed.");

  // The student identity always comes from the verified token, never from the body.
  const existing = await Application.findOne({ student: req.user.id, company: company._id });
  if (existing) throw httpError(409, "You have already applied to this company.");

  if (!file && !resumeId) throw httpError(400, "Please choose a saved resume or upload a new PDF resume.");

  // Extra confirmation step: the student re-enters their account password.
  if (!password) throw httpError(400, "Please confirm your password to submit the application.");
  const student = await User.findById(req.user.id).select("+password");
  if (!student || !(await student.comparePassword(password))) {
    throw httpError(400, "Incorrect password. Application was not submitted.");
  }

  // Work out which file belongs to THIS application. The application always gets its own copy,
  // so later deleting a saved resume from the profile cannot affect it.
  let resume;
  let savedToProfile = false;
  if (file) {
    resume = { ...(await saveUploadedFile(file)), uploadedAt: new Date() };
    if (saveToProfile === "true" && student.resumes.length < User.MAX_RESUMES) {
      const copy = await copyStoredFile(resume.file);
      const label = path.basename(file.originalname, path.extname(file.originalname));
      student.resumes.push({ label, ...copy });
      await student.save();
      savedToProfile = true;
    }
  } else {
    const saved = student.resumes.id(resumeId);
    if (!saved) throw httpError(404, "Saved resume not found.");
    resume = { ...(await copyStoredFile(saved.file)), uploadedAt: new Date() };
  }

  const application = await Application.create({ student: req.user.id, company: company._id, resume });

  res.status(201).json({
    success: true,
    message: savedToProfile ? "Application submitted. The resume was also saved to your profile." : "Application submitted successfully.",
    data: { application, savedToProfile },
  });
}

// GET /api/applications/my  (STUDENT)
async function getMyApplications(req, res) {
  const applications = await Application.find({ student: req.user.id })
    .sort({ appliedAt: -1 })
    .populate("company", "name jobRole package location workMode status applicationDeadline")
    .lean();

  res.json({ success: true, data: { applications } });
}

// PATCH /api/applications/:id/withdraw  (STUDENT, owner only, only while APPLIED)
async function withdrawApplication(req, res) {
  const application = await Application.findById(req.params.id).populate("company", "name");
  if (!application) throw httpError(404, "Application not found.");

  if (application.student.toString() !== req.user.id) {
    throw httpError(403, "You can only withdraw your own applications.");
  }
  if (application.status !== "APPLIED") {
    throw httpError(400, `Applications can only be withdrawn while status is APPLIED (current: ${application.status}).`);
  }

  application.status = "WITHDRAWN";
  await application.save();

  res.json({ success: true, message: "Application withdrawn.", data: { application } });
}

// GET /api/companies/:companyId/applications  (ADMIN, SUPER_ADMIN)
// Query params: search, branch, status, sortBy (cgpa | appliedAt), order (asc | desc)
async function getCompanyApplications(req, res) {
  const company = await Company.findById(req.params.companyId).select("name jobRole status");
  if (!company) throw httpError(404, "Company not found.");

  const { search = "", branch = "", status = "", sortBy = "appliedAt", order = "desc" } = req.query;

  // 1) Validate query parameters instead of passing them straight to the database.
  const ALLOWED_SORT = ["cgpa", "appliedAt"];
  if (!ALLOWED_SORT.includes(sortBy)) throw httpError(400, `sortBy must be one of: ${ALLOWED_SORT.join(", ")}.`);
  if (!["asc", "desc"].includes(order)) throw httpError(400, "order must be asc or desc.");
  if (status && !APPLICATION_STATUSES.includes(status)) throw httpError(400, "Invalid status filter.");

  // 2) Search / branch filter act on the User collection, so first find matching student IDs.
  const applicationFilter = { company: company._id };
  if (status) applicationFilter.status = status;

  if (String(search).trim() || String(branch).trim()) {
    const userFilter = { role: "STUDENT" };
    if (String(branch).trim()) userFilter.branch = String(branch).trim();
    if (String(search).trim()) {
      // Escape regex special characters so user input is treated literally.
      const safe = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safe, "i");
      userFilter.$or = [{ name: regex }, { email: regex }, { rollNumber: regex }];
    }
    const matchingStudents = await User.find(userFilter).select("_id").lean();
    applicationFilter.student = { $in: matchingStudents.map((s) => s._id) };
  }

  // 3) Fetch applications with the student details populated (never the password).
  const query = Application.find(applicationFilter).populate("student", "name email rollNumber branch cgpa");
  if (sortBy === "appliedAt") query.sort({ appliedAt: order === "asc" ? 1 : -1 });

  const applications = await query.lean();

  // 4) CGPA lives on the populated student document, so sort it here (lists are small per company).
  if (sortBy === "cgpa") {
    const direction = order === "asc" ? 1 : -1;
    applications.sort((a, b) => ((a.student?.cgpa ?? -1) - (b.student?.cgpa ?? -1)) * direction);
  }

  res.json({ success: true, data: { company, applications, total: applications.length } });
}

// PATCH /api/applications/:id/status  (ADMIN, SUPER_ADMIN)  body: { status }
async function updateApplicationStatus(req, res) {
  const { status } = req.body;
  if (!APPLICATION_STATUSES.includes(status)) throw httpError(400, "Invalid status.");
  if (status === "WITHDRAWN") throw httpError(400, "Only the student can withdraw an application.");

  const application = await Application.findById(req.params.id)
    .populate("company", "name")
    .populate("student", "name email rollNumber branch cgpa");
  if (!application) throw httpError(404, "Application not found.");

  const allowed = ADMIN_TRANSITIONS[application.status] || [];
  if (!allowed.includes(status)) {
    throw httpError(400, `Cannot change status from ${application.status} to ${status}.`);
  }

  application.status = status;
  await application.save();

  // Store a notification for the student; they will see it on their next fetch.
  const text = statusNotification(status, application.company.name);
  await Notification.create({
    user: application.student._id,
    company: application.company._id,
    type: "APPLICATION_STATUS",
    title: text.title,
    message: text.message,
  });

  res.json({ success: true, message: `Status updated to ${status}.`, data: { application } });
}

// GET /api/applications/:id/resume  (owner student, or any administrator)
async function downloadResume(req, res) {
  const application = await Application.findById(req.params.id).select("student resume");
  if (!application) throw httpError(404, "Application not found.");

  const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  const isOwner = application.student.toString() === req.user.id;
  if (!isAdmin && !isOwner) throw httpError(403, "You are not allowed to view this resume.");

  await sendStoredFile(res, application.resume.file, application.resume.originalName);
}

module.exports = {
  createApplication,
  getMyApplications,
  withdrawApplication,
  getCompanyApplications,
  updateApplicationStatus,
  downloadResume,
  ADMIN_TRANSITIONS,
};
