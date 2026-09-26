const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { uploadPdf } = require("../middleware/upload");
const {
  createApplication,
  getMyApplications,
  withdrawApplication,
  updateApplicationStatus,
  downloadResume,
} = require("../controllers/applicationController");

const router = express.Router();

router.use(auth);

// Student: apply with a resume (multipart field name: "resume")
router.post("/", requireRole("STUDENT"), uploadPdf.single("resume"), createApplication);
router.get("/my", requireRole("STUDENT"), getMyApplications);
router.patch("/:id/withdraw", requireRole("STUDENT"), withdrawApplication);

// Administrator: change status one application at a time
router.patch("/:id/status", requireRole("ADMIN", "SUPER_ADMIN"), updateApplicationStatus);

// Resume download (owner or administrator; checked inside the controller)
router.get("/:id/resume", downloadResume);

module.exports = router;
