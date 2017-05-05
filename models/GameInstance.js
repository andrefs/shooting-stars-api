import mongoose         from 'mongoose';
import GameSequence     from './GameSequence';
import Turn             from './Turn';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import log      from '../utils/log';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const GameInstanceSchema = mongoose.Schema({
  gameSequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameSequence,
    required: true
  },
  previousTurns: {
    type: [
      [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Turn
      }]
    ],
    default: []
  },
  currentTurn: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: Turn,
      required: true
    }],
    default: []
  }
});

GameInstanceSchema.statics.createNew = function(playerIDs){
  let gameInst = new this();
  return GameSequence.selectNew(playerIDs)
    .then(gameSeq => {
      gameInst.gameSequence = gameSeq;
      return gameInst.save();
    })
    .catch(err => {
      log.error(err);
    });
}

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
}


module.exports = mongoose.model('GameInstance', GameInstanceSchema);
