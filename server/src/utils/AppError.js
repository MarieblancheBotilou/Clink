// An error we throw on purpose (bad input, not logged in, ...).
// The error handler turns it into the standard error format from docs/api.md:
//   { "error": { "code": "INVALID_AMOUNT", "message": "Amount must be greater than $0." } }
class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

module.exports = AppError;
