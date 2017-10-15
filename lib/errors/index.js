import inherits from 'inherits';
import SystemError from './system-error';
import {BadRequestError} from 'restify-errors';

/*****************
 * System Errors *
 *****************/

/**
 * No current turn
 */

class NoCurrentTurnError extends SystemError {
  constructor(...args){
    super(...args);
  }
}

/**
 * Triple id mismatch
 */

class TripleIdMismatchError extends SystemError {
  constructor(...args){
    super(...args);
  }
}


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
