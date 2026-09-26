// Small helper so controllers can write:  throw httpError(404, "Company not found.")
// The central error handler turns it into { success: false, message } with that status.
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = httpError;
