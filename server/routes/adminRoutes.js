const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { listAdministrators, createAdministrator, deactivateAdministrator } = require("../controllers/adminController");

const router = express.Router();

// Only Super Admins can manage administrator accounts
router.use(auth, requireRole("SUPER_ADMIN"));

router.get("/users", listAdministrators);
router.post("/users", createAdministrator);
router.patch("/users/:id/deactivate", deactivateAdministrator);

module.exports = router;
