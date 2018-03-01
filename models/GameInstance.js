import mongoose         from 'mongoose';
import GameSequence     from './GameSequence';
import Relation         from './Relation';
import Turn             from './Turn';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {log}            from '../lib/logger';
import User             from './User';
import Triple           from './Triple';
import PlayerMove       from './PlayerMove';
import Item             from './Item';
import shortid          from '../lib/shortid';
import Promise          from 'bluebird';
import {NoCurrentTurn, TripleIdMismatchError}  from '../lib/errors';

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
    previous: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Turn
      }],
      default: []
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


/** Creates a new game instance and adds a player and a new game sequence to it.
    Adds the created game instance to player.currentGameInstance.
    @param {Player} syncId
 */
GameInstanceSchema.statics.createNew = function(syncId){
  let gameInst = new this({players: {sync: syncId}});
  return Promise.join(
      User.findOne({_id: mongoose.Types.ObjectId(syncId)}).exec(),
      GameSequence.selectNew(gameInst.players.sync)
    )
    .then(([player, gs]) => {
      gameInst.gameSequence = gs;
      player.currentGameInstance = gameInst;
      return Promise.join(
        gameInst.save(),
        player.save()
      );
    })
    .then(([gi, player]) => gi.selectAsyncPlayer())
    .then(gi => gi.nextTurn());
};

GameInstanceSchema.methods.toSanitizedObject = function(){
  return this.populate([{
      path: 'players.sync',
      select: 'username',
      model: 'User'
    },{
      path: 'players.async',
      select: 'username',
      model: 'User'
    },{
      path: 'turns.previous',
      model: 'Turn',
      populate: {
        path: 'triple',
        model: 'Triple',
        populate: {
          path: 'itemA itemB itemC',
          model: 'Item'
        }
      },
    },{
      path: 'turns.current',
      model: 'Turn',
      select: 'triple',
      populate: [{
          path: 'triple',
          model: 'Triple',
          populate: {
            path: 'itemA itemB itemC',
            model: 'Item'
          },
        }
      ]
    }])
  .execPopulate()
  .then(gi => {
    let obj = gi.toObject();
    delete obj.gameSequence;
    if(obj.turns.current){
      delete obj.turns.current.score;
      delete obj.turns.current.moves;
    }
    if(obj.players.sync){
      obj.players.sync = {
        _id: obj.players.sync._id,
        username: obj.players.sync.username
      };
    }
    if(obj.players.async){
      obj.players.async = {
        _id: obj.players.async._id,
        username: obj.players.async.username
      };
    }
    return obj;
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
  const totalTurns = this.turns.previous.length + (this.turns.current ? 1 : 0);
  if(this.turns.current){
    this.turns.previous.push(this.turns.current);
    this.turns.current = undefined;
  }

  return GameSequence.findOne({_id: mongoose.Types.ObjectId(this.gameSequence)})
    .populate({path: 'triples', model: Triple})
    .exec()
    .then(gs => {
      if(this.turns.previous.length === gs.triples.length){
        return this.wrapUp();
      }
      return Turn.create({
        triple: gs.triples[totalTurns]
      })
      .then(turn => {
        this.turns.current = turn;
        return this.save();
      });
    });
};

GameInstanceSchema.methods.saveMoves = function(){
  // player moves are only added to db at end of game instance
  let playerMoves = [];
  this.turns.previous.forEach(t => {
    playerMoves.push({
      player: this.players.sync,
      triple: t.triple,
      pick: t.moves.sync
    });
  });
  return PlayerMove.create(playerMoves);
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
      path: 'turns.previous',
      model: Turn
    }])
    .execPopulate()
    .then(() => this.players.sync.addPlayedSequence(this.gameSequence))
    .then(() => this.players.sync.addToTotalScore(this.currentScore.sync))
    .then(() => this.saveMoves())
    .then(moves => Relation.extractChoicesFromMoves(moves))
    //.then(() => Relation.printAll())
    .then(() => this.save());
};

GameInstanceSchema.methods.addMove = function(pick){
  return this.populate({path:'turns.current', model:Turn}).execPopulate()
    .then(() => {
      if(!this.turns.current){
        // no current turn, game must be over
        return Promise.reject(new NoCurrentTurn());
      }

      this.turns.current.moves.sync = pick;
      this.turns.current.markModified('moves.sync');
      return this.turns.current.setMoves(this.players);
    })
    .then(() => this.nextTurn())
    .then(() => this.setCurrentScore()) // current score is calculated over finished turns only
    ;
};

GameInstanceSchema.methods.setCurrentScore = function(){
  return this.populate({
      path: 'turns.previous',
      model: Turn,
    })
    .execPopulate()
    .then(() => {
      ['sync', 'async', 'bot'].forEach(p => {
        this.currentScore[p] = this.turns.previous
          .map(t => t.score[p])
          .reduce((a,b) => a+b);
      });
      this.markModified('currentScore');

      return this.save();
    });
};


module.exports = mongoose.model('GameInstance', GameInstanceSchema);
