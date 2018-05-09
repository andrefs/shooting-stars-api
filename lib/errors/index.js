import inherits from 'inherits';
import SystemError     from './system-error';
import SystemException from './system-exception';
import {BadRequestError, ConflictError} from 'restify-errors';
import uniqBy                from 'lodash/uniqBy';

/**************
 * Exceptions *
 **************/

/**
 * No information regarding the relation between these two pairs
 */

class MissingPairsRelationException extends SystemException {
  constructor(pair1, pair2){
    super('Pairs cannot be compared');
    this.pair1 = pair1;
    this.pair2 = pair2;
  }

  getItems(){
    const items = [
      this.pair1.itemA,
      this.pair1.itemB,
      this.pair2.itemA,
      this.pair2.itemB
    ];
    return uniqBy(items, a => a.id)
      .sort((a,b) => a.id > b.id ? 1 : a.id < b.id ? -1 : 0);
  }

  getTriples(){
    const Triple = require('../../models/Triple');

    const items = this.getItems();  // items come sorted
    const triples =[new Triple({
      itemA: items[0],
      itemB: items[1],
      itemC: items[2]
    })];
    if(items.length > 3){
      triples.push(new Triple({itemA: items[0], itemB: items[1], itemC: items[3]}));
      triples.push(new Triple({itemA: items[0], itemB: items[2], itemC: items[3]}));
      triples.push(new Triple({itemA: items[1], itemB: items[2], itemC: items[3]}));
    }
    return triples;
  }

}

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

class NoMoreItemsError extends SystemError {
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

/**
 * No current game
 */
class NoCurrentGame extends ConflictError {
  constructor(invalidId){
    super({
      code: 'NoCurrentGame',
      message: 'There is no game currently active',
    });
  }
}

/**
 * No game sequences left
 */
class NoGameSequencesLeft extends ConflictError {
  constructor(invalidId){
    super({
      code: 'NoGameSequencesLeft',
      message: 'There are no game sequences left',
    });
  }
}


export {
  TripleIdMismatchError,
  NoMoreItemsError,
  NoCurrentTurn,
  NoCurrentGame,
  InvalidObjectId,
  UnfinishedGameInstance,
  NoGameSequencesLeft,
  MissingPairsRelationException
};
