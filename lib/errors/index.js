import inherits from 'inherits';
import SystemError from './system-error';
import {BadRequestError} from 'restify-errors';

/*****************
 * System Errors *
 *****************/

/**
 * No current turn
 */

const NoCurrentTurnError = (message, details) => {
  SystemError.call(this);

  this.message = message;
  this.details = details;
}
inherits(NoCurrentTurnError, SystemError);


/**
 * Triple id mismatch
 */

const TripleIdMismatchError = (message, details) => {
  SystemError.call(this);

  this.message = message;
  this.details = details;
}
inherits(TripleIdMismatchError, SystemError);

/*************************
 * Restify Custom Errors *
 *************************/

/**
 * Invalid object id
 */

class InvalidObjectId extends BadRequestError {
  constructor(invalidId){
    super({
      code: 'InvalidObjectId',
      message: 'Invalid id: it must be a string of 24 hex characters',
    });
  }
}


export {
  TripleIdMismatchError,
  NoCurrentTurnError,
  InvalidObjectId
};
