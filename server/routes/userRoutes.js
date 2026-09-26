const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { uploadPdf } = require("../middleware/upload");
const { getProfile, updateProfile, addResume, deleteResume, downloadSavedResume } = require("../controllers/userController");

const router = express.Router();

router.use(auth);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// Saved resumes in the student's profile (multipart field name: "resume")
router.post("/resumes", requireRole("STUDENT"), uploadPdf.single("resume"), addResume);
router.delete("/resumes/:resumeId", requireRole("STUDENT"), deleteResume);
router.get("/resumes/:resumeId/download", requireRole("STUDENT"), downloadSavedResume);

module.exports = router;
