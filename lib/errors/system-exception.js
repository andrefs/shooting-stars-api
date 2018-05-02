
class SystemException extends Error {
  constructor(message, status) {
    super(message, status);
    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }

  toJSON() {
    let error = {
      sys: {
        type: 'Exception',
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
  }
};

export default SystemException;
