'use strict'

function httpError(status, defaultMessage) {
  return function(message) {
    this.status = status;
    this.message = message || defaultMessage;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  NotFound: httpError(404, 'Not found'),
  InternalError: httpError(500, 'Bad request'),
  Bad: httpError(400, 'Bad request'),
  Validation: httpError(400, 'Validation fails')
}
