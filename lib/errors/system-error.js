
class SystemError extends Error {
  constructor(...args){
    super(...args);
    Error.captureStackTrace(this, SystemError);
  }

  toJSON() {
    let error = {
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
  }
};

export default SystemError;
