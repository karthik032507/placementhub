const multer = require("multer");

// 404 for unknown API routes
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Express 5 forwards rejected promises from async
// controllers here automatically, so controllers can simply `throw`.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong.";

  // Invalid MongoDB ObjectId in a URL, e.g. /api/companies/abc
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format.";
  }

  // Mongoose schema validation failed
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(" ");
  }

  // Duplicate key (unique index) violation
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyPattern || {});
    if (fields.includes("email")) message = "An account with this email already exists.";
    else if (fields.includes("student") && fields.includes("company")) message = "You have already applied to this company.";
    else message = "Duplicate value.";
  }

  // JWT problems that were not caught in the auth middleware
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token.";
  }

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") message = "Resume must be smaller than 5 MB.";
    else if (err.code === "LIMIT_UNEXPECTED_FILE") message = "Unexpected file field. Use the field name 'resume'.";
    else message = `Upload error: ${err.message}`;
  }

  if (statusCode === 500) {
    console.error(err); // full details only in the server log
    if (process.env.NODE_ENV === "production") message = "Internal server error.";
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
