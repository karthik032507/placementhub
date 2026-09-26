const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { uploadPdf } = require("../middleware/upload");
const {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  closeCompany,
  uploadJobDescription,
  deleteJobDescription,
  downloadJobDescription,
} = require("../controllers/companyController");
const { getCompanyApplications } = require("../controllers/applicationController");
const { sendCompanyNotification } = require("../controllers/notificationController");

const router = express.Router();

// Every company route needs a logged-in user
router.use(auth);

router.get("/", listCompanies);
router.get("/:id", getCompany);
router.get("/:id/job-description", downloadJobDescription);

// Administrator-only operations
const admins = requireRole("ADMIN", "SUPER_ADMIN");
router.post("/", admins, createCompany);
router.put("/:id", admins, updateCompany);
router.patch("/:id/close", admins, closeCompany);
router.post("/:id/job-description", admins, uploadPdf.single("file"), uploadJobDescription);
router.delete("/:id/job-description", admins, deleteJobDescription);

// Applicants of a company + company-specific notifications
router.get("/:companyId/applications", admins, getCompanyApplications);
router.post("/:companyId/notifications", admins, sendCompanyNotification);

module.exports = router;
