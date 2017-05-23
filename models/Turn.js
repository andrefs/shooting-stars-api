import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Triple           from './Triple';
import PlayerMove       from './PlayerMove';
import _                from 'lodash';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const TurnSchema = mongoose.Schema({
  triple: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple
  },
  moves: {
    type: {
      sync: {
        type: String,
        enum: ['AB', 'BC', 'AC']
      },
      async: {
        type: String,
        enum: ['AB', 'BC', 'AC']
      },
      bot: {
        type: String,
        enum: ['AB', 'BC', 'AC']
      }
    }
  },
  correctAnswer: {
    type: String,
    enum: ['AB', 'BC', 'AC']
  }
});

TurnSchema.methods.setMoves = function(players){
  return this.setAsyncPlayerMove(players.async)
    .then(() => this.setBotMove())
    .then(() => this.setCorrectAnswer());
};


function generateBotMove(){
  const picks = ['AB','BC','AC'];
  return picks[Math.floor(Math.random()*picks.length)];
};


TurnSchema.methods.setAsyncPlayerMove = function(playerId){
  if(!playerId){
    this.moves.async = generateBotMove();
    this.markModified('moves.async');
    return this.save();
  }

  return PlayerMove.findOne({player: playerId, triple: this.triple})
    .exec()
    .then(pm => {
      this.moves.async = pm.pick;
      this.markModified('moves.async');
      return this.save();
    });
};

TurnSchema.methods.setBotMove = function(){
  this.moves.bot = generateBotMove();
  this.markModified('moves.bot');
  return this.save();
};


TurnSchema.methods.setCorrectAnswer = function(){
  const picks = _.map(this.moves);
  if(picks[0] === picks[1] || picks[0] === picks[2]){
    this.correctAnswer = picks[0];
  } else if (picks[1] === picks[2]){
    this.correctAnswer = picks[1];
  } else {
    this.correctAnswer = undefined;
  }

  return this.save();
};

module.exports = mongoose.model('Turn', TurnSchema);
