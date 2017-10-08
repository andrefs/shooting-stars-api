import mongoose         from '../utils/mongoose';
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


/* Creates a new game instance and adds a player and a new game sequence to it.
 * Adds the created game instance to player.currentGameInstance.
 * @param {Player} syncId
 */
GameInstanceSchema.statics.createNew = function(syncId){
  let gameInst = new this({players: { sync: syncId}});
  return Promise.join(
      User.findOne({_id: mongoose.Types.ObjectId(syncId)}).exec(),
      GameSequence.selectNew([gameInst.players.sync])
    )
    .then(([player, gs]) => {
      gameInst.gameSequence = gs;
      player.currentGameInstance = gameInst;
      return Promise.join(
        gameInst.save(),
        player.save()
      );
    })
    .then(([gi, player]) => {
      return gi;
    });
};

GameInstanceSchema.methods.selectAsyncPlayer = function(){
  return User.findOne().where('playedSequences').equals(this.gameSequence)
    .then(user => {
      this.players.async = user;
      return this.save();
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


GameInstanceSchema.methods.nextTurn = function(){
  const totalTurns = this.turns.all.length;
  if(this.turns.current){
    this.turns.previous = this.turns.current;
    this.turns.current = undefined;
  }

  return GameSequence.findOne({_id: mongoose.Types.ObjectId(this.gameSequence)})
    .populate({path: 'triples', model: Triple})
    .exec()
    .then(gs => {
      if(this.turns.all.length === gs.triples.length){
        return this.wrapUp();
      }
      return Turn.create({
        triple: gs.triples[totalTurns]
      })
      .then(turn => {
        this.turns.current = turn;
        this.turns.all.push(turn);
        return this.save();
      });
    });
};


GameInstanceSchema.methods.wrapUp = function(){
  this.isFinished = true;
  return this.populate([{
      path: 'players.sync',
      model: User,
      populate: {
        path: 'playedSequences',
        model: GameSequence
      }
    },{
      path: 'turns.all',
      model: Turn
    }])
    .execPopulate()
    .then(() => {
      return this.players.sync.addPlayedSequence(this.gameSequence);
    })
    .then(() => {
      let playerMoves = [];
      this.turns.all.forEach(t => {
        playerMoves.push({
          player: this.players.sync,
          triple: t.triple,
          pick: t.moves.sync
        });
      });
      return PlayerMove.create(playerMoves);
    })
    .then(() => {
      return this.save();
    });
};

GameInstanceSchema.methods.addMove = function(tripleId, pick){
  return this.populate({path:'turns.current', model:Turn}).execPopulate()
    .then(() => {
      if(!this.turns.current){
        // no current turn, game must be over
        throw new NoCurrentTurnError();
      }
      if(tripleId !== this.turns.current.triple.toString()){
        throw new TripleIdMismatchError();
      }

      this.turns.current.moves.sync = pick;
      this.turns.current.markModified('moves.sync');
      return this.turns.current.save();
    })
    .then(() => this.turns.current.setMoves(this.players))
    .then(() => this.nextTurn())
    .then(() => this.setCurrentScore());
};

GameInstanceSchema.methods.setCurrentScore = function(){
  return this.populate({
      path: 'turns.all',
      model: Turn,
    })
    .execPopulate()
    .then(() => {
      ['sync', 'async', 'bot'].forEach(p => {
        this.currentScore[p] = this.turns.all
          .map(t => t.score[p])
          .reduce((a,b) => a+b);
      });
      return this.save();
    });
};


module.exports = mongoose.model('GameInstance', GameInstanceSchema);
