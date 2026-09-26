const mongoose = require("mongoose");

// Students (and preferably admins) must use the college email domain.
const COLLEGE_EMAIL_DOMAIN = "@iiits.in";

function isCollegeEmail(email) {
  if (typeof email !== "string") return false;
  const value = email.trim().toLowerCase();
  // Basic shape check "something@iiits.in" (at least one character before the @)
  return value.length > COLLEGE_EMAIL_DOMAIN.length && value.endsWith(COLLEGE_EMAIL_DOMAIN) && value.indexOf("@") === value.length - COLLEGE_EMAIL_DOMAIN.length;
}

function isValidEmailShape(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Minimum password rule for the project: at least 8 characters.
function isStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = { COLLEGE_EMAIL_DOMAIN, isCollegeEmail, isValidEmailShape, isStrongEnoughPassword, isValidObjectId };
