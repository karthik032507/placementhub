const jwt = require("jsonwebtoken");
const User = require("../models/User");

// AUTHENTICATION: "Who is making this request?"
// Reads "Authorization: Bearer <token>", verifies the JWT and attaches req.user.
async function auth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required. Please log in." });
  }

  const token = header.slice("Bearer ".length).trim();

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const message = error.name === "TokenExpiredError" ? "Your session has expired. Please log in again." : "Invalid authentication token.";
    return res.status(401).json({ success: false, message });
  }

  // Look the user up so a deactivated account stops working immediately,
  // and so the role always comes from the database, never from the client.
  const user = await User.findById(decoded.userId).select("_id role isActive");
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: "Account not found or deactivated." });
  }

  req.user = { id: user._id.toString(), role: user.role };
  next();
}

module.exports = auth;
