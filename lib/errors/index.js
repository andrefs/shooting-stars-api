import inherits from 'inherits';
import SystemError from './system-error.js';
import SystemException from './system-exception.js';
import errors from 'restify-errors';
import _ from 'lodash';

/**************
 * Exceptions *
 **************/

/**
 * No information regarding the relation between these two pairs
 */

console.log('XXXXXXXxx 1', errors)

class PairsRelationException extends SystemException {
  constructor(pair1, pair2) {
    super('Pairs cannot be compared');
    this.pair1 = pair1;
    this.pair2 = pair2;
  }

  getItems() {
    const items = [
      this.pair1.itemA,
      this.pair1.itemB,
      this.pair2.itemA,
      this.pair2.itemB
    ];
    return _.uniqBy(items, a => a.id)
      .sort((a, b) => a.id > b.id ? 1 : a.id < b.id ? -1 : 0);
  }

  getTriples() {
    const Triple = require('../../models/Triple');

    const items = this.getItems();  // items come sorted
    const triples = [new Triple({
      itemA: items[0],
      itemB: items[1],
      itemC: items[2]
    })];
    if (items.length > 3) {
      triples.push(new Triple({ itemA: items[0], itemB: items[1], itemC: items[3] }));
      triples.push(new Triple({ itemA: items[0], itemB: items[2], itemC: items[3] }));
      triples.push(new Triple({ itemA: items[1], itemB: items[2], itemC: items[3] }));
    }
    return triples;
  }
}

class MissingPairsRelationException extends PairsRelationException { }
class AmbiguousPairsRelationException extends PairsRelationException { }

/*****************
 * System Errors *
 *****************/

/**
 * Triple id mismatch
 */

class TripleIdMismatchError extends SystemError {
  constructor(...args) {
    super(...args);
  }
}

class NoMoreItemsError extends SystemError {
  constructor(...args) {
    super(...args);
  }
}

/*************************
 * Restify Custom Errors *
 *************************/

/**
 * Invalid object id
 */

class InvalidObjectId extends errors.BadRequestError {
  constructor(invalidId) {
    super({
      code: 'InvalidObjectId',
      message: 'Invalid id: it must be a string of 24 hex characters',
    });
  }
}

/**
 * UnfinishedGameInstanceExists
 */

class UnfinishedGameInstance extends errors.ConflictError {
  constructor(invalidId) {
    super({
      code: 'UnfinishedGameInstance',
      message: 'Cannot create new Game Instance: an unfinished game instance already exists',
    });
  }
}

/**
 * No current turn
 */

class NoCurrentTurn extends errors.ConflictError {
  constructor(invalidId) {
    super({
      code: 'NoCurrentTurn',
      message: 'There is no turn currently active',
    });
  }
}

/**
 * No current game
 */
class NoCurrentGame extends errors.ConflictError {
  constructor(invalidId) {
    super({
      code: 'NoCurrentGame',
      message: 'There is no game currently active',
    });
  }
}

/**
 * No current game
 */
class CurrentTurnMismatch extends errors.ConflictError {
  constructor(invalidId) {
    super({
      code: 'CurrentTurnMismatch',
      message: 'The current turn is not the one reported'
    });
  }
}

class LockNotOwnedException extends SystemException {
  constructor(...args) {
    super(...args);
  }
}

//  constructor(){
//    super({
//      code: 'LockNotOwned',
//      message: 'This lock does not exist or is not currently owned by this client'
//    })
//  }
//}

export {
  TripleIdMismatchError,
  NoMoreItemsError,
  NoCurrentTurn,
  NoCurrentGame,
  CurrentTurnMismatch,
  InvalidObjectId,
  UnfinishedGameInstance,
  MissingPairsRelationException,
  AmbiguousPairsRelationException,
  LockNotOwnedException
};
