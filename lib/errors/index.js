import inherits from 'inherits';
import SystemError from './system-error';
import {BadRequestError, ConflictError} from 'restify-errors';

/*****************
 * System Errors *
 *****************/

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

/**
 * UnfinishedGameInstanceExists
 */

class UnfinishedGameInstance extends ConflictError {
  constructor(invalidId){
    super({
      code: 'UnfinishedGameInstance',
      message: 'Cannot create new Game Instance: an unfinished game instance already exists',
    });
  }
}

/**
 * No current turn
 */

class NoCurrentTurn extends ConflictError {
  constructor(invalidId){
    super({
      code: 'NoCurrentTurn',
      message: 'There is no turn currently active',
    });
  }
}



export {
  TripleIdMismatchError,
  NoCurrentTurn,
  InvalidObjectId,
  UnfinishedGameInstance
};
