import mongoose         from 'mongoose';
import GameSequence     from './GameSequence';
import Turn             from './Turn';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import log              from '../utils/log';
import User             from './User';
import Triple           from './Triple';
import PlayerMove       from './PlayerMove';
import Item             from './Item';
import shortid          from '../utils/shortid';
import Promise          from 'bluebird';
import {NoCurrentTurnError, TripleIdMismatchError}  from '../utils/errors';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const GameInstanceSchema = mongoose.Schema({
  players: {
    sync: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
      required: true
    },
    async: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User
    },
  },
  gameSequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameSequence,
    required: true
  },
  turns: {
    all: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Turn
      }],
      default: []
    },
    previous: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Turn
    },
    current: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Turn
    }
  },
  currentScore: {
    type: {
      sync:  {type: Number, default: 0, required: true},
      async: {type: Number, default: 0, required: true},
      bot:   {type: Number, default: 0, required: true},
    },
    required: true,
    default: {
      sync:  0,
      async: 0,
      bot:   0
    }
  },
  isFinished: {
    type: Boolean,
    default: false,
    required: true
  }
});

GameInstanceSchema.statics.createNew = function(gi){
  let gameInst = new this(gi);
  return GameSequence.selectNew([gameInst.players.sync])
    .then(gs => {
      gameInst.gameSequence = gs;
      return gameInst.save();
    })
    .catch(err => {
      log.error(err);
    });
};

GameInstanceSchema.methods.nextTurn = function(){
  let turnCount;

  // No more turns
  if(this.previousTurns.length === this.gameSequence.triples.length){
    return Promise.reject('Game is finished');
  }

  if(this.currentTurn){
    this.previousTurns.push(this.currentTurn);
  }
  turnCount = this.previousTurns.length;

  let turn = new Turn({
    triple: this.triples[turnCount]
  });

  turn.save()
    .then(turn => {
      this.currentTurn = turn;
      return this.save();
    });
};


module.exports = mongoose.model('GameInstance', GameInstanceSchema);
