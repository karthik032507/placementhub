const path = require("path");
const User = require("../models/User");
const httpError = require("../utils/httpError");
const { saveUploadedFile, deleteStoredFile, sendStoredFile } = require("../middleware/upload");

const { MAX_RESUMES } = User;

// GET /api/users/profile
async function getProfile(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found.");
  res.json({ success: true, data: { user: user.toSafeObject() } });
}

// PUT /api/users/profile
// Only name / rollNumber / branch / cgpa can be changed. role, isActive and email are ignored on purpose.
async function updateProfile(req, res) {
  const { name, rollNumber, branch, cgpa } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found.");

  if (name !== undefined) {
    if (!String(name).trim()) throw httpError(400, "Name cannot be empty.");
    user.name = String(name).trim();
  }

  // Academic fields only make sense for students
  if (user.role === "STUDENT") {
    if (rollNumber !== undefined) user.rollNumber = String(rollNumber).trim();
    if (branch !== undefined) user.branch = String(branch).trim();
    if (cgpa !== undefined) {
      if (cgpa === "" || cgpa === null) {
        user.cgpa = null;
      } else {
        const value = Number(cgpa);
        if (Number.isNaN(value) || value < 0 || value > 10) throw httpError(400, "CGPA must be a number between 0 and 10.");
        user.cgpa = value;
      }
    }
  }

  await user.save();
  res.json({ success: true, message: "Profile updated successfully.", data: { user: user.toSafeObject() } });
}

// POST /api/users/resumes  (STUDENT)  multipart: resume (PDF), label (optional)
async function addResume(req, res) {
  if (!req.file) throw httpError(400, "Please choose a PDF resume to upload.");

  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found.");
  if (user.resumes.length >= MAX_RESUMES) {
    throw httpError(400, `You can save up to ${MAX_RESUMES} resumes. Delete one before uploading another.`);
  }

  // Everything is validated before the bytes are written, so a rejected upload stores nothing.
  const stored = await saveUploadedFile(req.file);
  const label = String(req.body.label || "").trim() || path.basename(req.file.originalname, path.extname(req.file.originalname));
  user.resumes.push({ label, ...stored });
  await user.save();

  res.status(201).json({ success: true, message: "Resume saved to your profile.", data: { user: user.toSafeObject() } });
}

// DELETE /api/users/resumes/:resumeId  (STUDENT)
// Applications hold their own copy of the file, so this never affects a submitted application.
async function deleteResume(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found.");

  const resume = user.resumes.id(req.params.resumeId);
  if (!resume) throw httpError(404, "Resume not found.");

  await deleteStoredFile(resume.file);
  resume.deleteOne();
  await user.save();

  res.json({ success: true, message: "Resume removed.", data: { user: user.toSafeObject() } });
}

// GET /api/users/resumes/:resumeId/download  (owner only)
async function downloadSavedResume(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found.");

  const resume = user.resumes.id(req.params.resumeId);
  if (!resume) throw httpError(404, "Resume not found.");

  await sendStoredFile(res, resume.file, resume.originalName);
}

module.exports = { getProfile, updateProfile, addResume, deleteResume, downloadSavedResume };
