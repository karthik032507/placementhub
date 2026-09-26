const User = require("../models/User");
const httpError = require("../utils/httpError");
const { isCollegeEmail, isStrongEnoughPassword } = require("../utils/validators");

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

// GET /api/admin/users  (SUPER_ADMIN) - list all administrator accounts
async function listAdministrators(req, res) {
  const admins = await User.find({ role: { $in: ADMIN_ROLES } }).sort({ createdAt: -1 });
  res.json({ success: true, data: { administrators: admins.map((a) => a.toSafeObject()) } });
}

// POST /api/admin/users  (SUPER_ADMIN) - create ADMIN or SUPER_ADMIN
async function createAdministrator(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) throw httpError(400, "Name, email, password and role are required.");
  if (!ADMIN_ROLES.includes(role)) throw httpError(400, "Role must be ADMIN or SUPER_ADMIN.");
  if (!isCollegeEmail(email)) throw httpError(400, "Administrator email must end with @iiits.in.");
  if (!isStrongEnoughPassword(password)) throw httpError(400, "Password must be at least 8 characters long.");

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) throw httpError(409, "An account with this email already exists.");

  const admin = await User.create({ name: name.trim(), email, password, role, isActive: true });

  res.status(201).json({
    success: true,
    message: `${role === "SUPER_ADMIN" ? "Super Admin" : "Admin"} account created.`,
    data: { user: admin.toSafeObject() },
  });
}

// PATCH /api/admin/users/:id/deactivate  (SUPER_ADMIN)
async function deactivateAdministrator(req, res) {
  if (req.params.id === req.user.id) throw httpError(400, "You cannot deactivate your own account.");

  const target = await User.findById(req.params.id);
  if (!target || !ADMIN_ROLES.includes(target.role)) throw httpError(404, "Administrator not found.");
  if (!target.isActive) throw httpError(400, "This administrator is already deactivated.");

  if (target.role === "SUPER_ADMIN") {
    const activeSuperAdmins = await User.countDocuments({ role: "SUPER_ADMIN", isActive: true });
    if (activeSuperAdmins <= 1) throw httpError(400, "Cannot deactivate the last active Super Admin.");
  }

  // Soft delete: the record (and everything they created) stays in the database.
  target.isActive = false;
  await target.save();

  res.json({ success: true, message: `${target.name} has been deactivated.`, data: { user: target.toSafeObject() } });
}

module.exports = { listAdministrators, createAdministrator, deactivateAdministrator };
