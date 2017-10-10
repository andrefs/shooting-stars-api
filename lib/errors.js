
import inherits from 'inherits';

exports.NoCurrentTurnError = NoCurrentTurnError;
exports.TripleIdMismatchError = TripleIdMismatchError;

function SystemError () {
  this.name = this.constructor.name.replace(/Error$/, '');

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  }
}
inherits(SystemError, Error);

SystemError.prototype.toJSON = function () {
  var error = {
    sys: {
      type: 'Error',
      id: this.id || this.name
    }
  };

  if (this.message) {
    error.message = this.message;
  }

  if (this.details) {
    error.details = this.details;
  }
  return error;
};


function NoCurrentTurnError(message, details) {
  SystemError.call(this);

  this.message = message;
  this.details = details;
}
inherits(NoCurrentTurnError, SystemError);

function TripleIdMismatchError(message, details) {
  SystemError.call(this);

  this.message = message;
  this.details = details;
}
inherits(TripleIdMismatchError, SystemError);
