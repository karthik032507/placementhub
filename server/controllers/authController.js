const jwt = require("jsonwebtoken");
const User = require("../models/User");
const httpError = require("../utils/httpError");
const { isCollegeEmail, isValidEmailShape, isStrongEnoughPassword } = require("../utils/validators");

function signToken(user) {
  // Only non-sensitive identifiers go into the token.
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

// POST /api/auth/register  (students only)
async function register(req, res) {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    throw httpError(400, "Name, email, password and confirm password are required.");
  }
  if (!isCollegeEmail(email)) {
    throw httpError(400, "Please use your IIITS college email ending with @iiits.in.");
  }
  if (!isStrongEnoughPassword(password)) {
    throw httpError(400, "Password must be at least 8 characters long.");
  }
  if (password !== confirmPassword) {
    throw httpError(400, "Passwords do not match.");
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw httpError(409, "An account with this email already exists.");
  }

  // Role is always STUDENT here: nobody can register as an admin through this endpoint.
  const user = await User.create({ name: name.trim(), email, password, role: "STUDENT", isActive: true });

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    data: { token: signToken(user), user: user.toSafeObject() },
  });
}

// POST /api/auth/login
// loginAs: "STUDENT" or "ADMIN" (the tab chosen in the UI). It is only used to make
// sure a student is not signing in through the admin tab and vice versa. The real
// role always comes from the database record.
async function login(req, res) {
  const { email, password, loginAs } = req.body;

  if (!email || !password) {
    throw httpError(400, "Email and password are required.");
  }
  if (!isValidEmailShape(email)) {
    throw httpError(400, "Please enter a valid email address.");
  }

  // password has select:false, so we must ask for it explicitly.
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

  // Same message for wrong email and wrong password so we do not reveal which one failed.
  if (!user || !(await user.comparePassword(password))) {
    throw httpError(401, "Invalid email or password.");
  }
  if (!user.isActive) {
    throw httpError(401, "This account has been deactivated. Please contact the placement cell.");
  }

  if (loginAs === "STUDENT" && user.role !== "STUDENT") {
    throw httpError(403, "This is an administrator account. Please use the Admin login.");
  }
  if (loginAs === "ADMIN" && user.role === "STUDENT") {
    throw httpError(403, "This is a student account. Please use the Student login.");
  }

  res.json({
    success: true,
    message: "Logged in successfully.",
    data: { token: signToken(user), user: user.toSafeObject() },
  });
}

// GET /api/auth/me  - returns the currently logged-in user (fresh from the database)
async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found.");
  res.json({ success: true, data: { user: user.toSafeObject() } });
}

module.exports = { register, login, me };
