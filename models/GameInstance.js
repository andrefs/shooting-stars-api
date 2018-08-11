import mongoose         from 'mongoose';
import GameSequence     from './GameSequence';
import Turn             from './Turn';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {log}            from '../lib/logger';
import User             from './User';
import Triple           from './Triple';
import PlayerMove       from './PlayerMove';
import shortid          from '../lib/shortid'; // TODO delete
import Promise          from 'bluebird';
import {NoCurrentTurn, TripleIdMismatchError}  from '../lib/errors';
import config from '../config';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const GameInstanceSchema = mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true
  },
  opponentNames:{
    rand1: {type: String},
    rand2: {type: String}
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
      player: {type: Number, default: 0, required: true},
      rand1:  {type: Number, default: 0, required: true},
      rand2:  {type: Number, default: 0, required: true},
    },
    required: true,
    default: {
      player: 0,
      rand1:  0,
      rand2:  0
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
    @param {Player} pID
 */
GameInstanceSchema.statics.createNew = function(pId){
  let gameInst = new this({player: pId});
  return Promise.join(
      User.findOne({_id: mongoose.Types.ObjectId(pId)}).exec(),
      GameSequence.createNew(gameInst.player)
    )
    .then(([player, gs]) => {
      gameInst.gameSequence = gs;
      player.currentGameInstance = gameInst;
      gameInst.setOpponentNames();
      return Promise.join(
        gameInst.save(),
        player.save()
      );
    })
    .then(([gi]) => gi.nextTurn());
};

GameInstanceSchema.methods.setOpponentNames = function(){
  this.opponentNames.rand1 = 'Alice';
  this.opponentNames.rand2 = 'Alice';
}


GameInstanceSchema.methods.toSanitizedObject = function(){
  return this.populate([{
      path: 'player',
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
    if(obj.player){
      obj.player = {
        _id: obj.player._id,
        username: obj.player.username
      };
    }
    return obj;
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
      player: this.player,
      triple: t.triple,
      pick: t.moves.player
    });
  });
  return PlayerMove.create(playerMoves);
};

GameInstanceSchema.methods.wrapUp = function(){
  this.isFinished = true;
  return this.populate([{
      path: 'player',
      model: User,
      populate: {
        path: 'playedSequences',
        model: GameSequence
      }
    },{
      path: 'turns.previous',
      model: Turn
    },
    {
      path: 'gameSequence',
      model: 'GameSequence',
    }])
    .execPopulate()
    .then(() => this.player.addPlayedSequence(this.gameSequence))
    .then(() => this.player.addToTotalScore(this.currentScore.player))
    .then(() => this.saveMoves())
    .then(moves => Triple.updateTripleScores(moves))
    .then(() => this.save());
};

GameInstanceSchema.methods.addMove = function(pick){
  return this.populate({
    path:'turns.current',
    model:Turn,
    populate: {
      path: 'triple',
      model: 'Triple'
    }
  }).execPopulate()
    .then(() => {
      if(!this.turns.current){
        // no current turn, game must be over
        return Promise.reject(new NoCurrentTurn());
      }

      this.turns.current.moves.player = pick;
      this.turns.current.markModified('moves.player');
      return this.turns.current.setMoves();
    })
    .then(() =>  this.nextTurn())
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
      ['player', 'rand1', 'rand2'].forEach(p => {
        this.currentScore[p] = this.turns.previous
          .map(t => t.score[p])
          .reduce((a,b) => a+b);
      });
      this.markModified('currentScore');

      return this.save();
    });
};


GameInstanceSchema.statics.newGamesByMonth = function(){
  return this.aggregate([
    //{$project: {month: {$month: "$created"}, year: {$year: "created"}}},
    {$project: {month: {$month: "$created"}, year: {$year: "$created"}}},
    {$group: {
      _id: {month: "$month", year: "$year"},
      total: {$sum: 1}}
    }
  ])
  .then(aggs => aggs.map(agg => ({
    total: agg.total,
    month: agg._id.month,
    year: agg._id.year
  })));
};

module.exports = mongoose.model('GameInstance', GameInstanceSchema);
