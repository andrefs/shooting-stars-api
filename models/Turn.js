import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Triple           from './Triple';
import PlayerMove       from './PlayerMove';
import _                from 'lodash';
import config           from '../config';

const ScoreSchema = mongoose.Schema({
  sync:  {type: Number, default: 0},
  async: {type: Number, default: 0},
  bot:   {type: Number, default: 0}
});


const MovesSchema = mongoose.Schema({
  sync:  {type: String, enum: ['AB', 'BC', 'AC']},
  async: {type: String, enum: ['AB', 'BC', 'AC']},
  bot:   {type: String, enum: ['AB', 'BC', 'AC']}
});

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
    type: MovesSchema,
    default: MovesSchema
  },
  score: {
    type: ScoreSchema,
    default: ScoreSchema
  }
}, {minimize:false});

TurnSchema.methods.setMoves = function(players){
  return this.setAsyncPlayerMove(players.async)
    .then(() => {
      this.setBotMove();
      this.setScores();
      return this.save();
    });
};

function generateBotMove(){
  const picks = ['AB','BC','AC'];
  return picks[Math.floor(Math.random()*picks.length)];
};


TurnSchema.methods.setAsyncPlayerMove = function(playerId){
  if(!playerId){
    this.moves.async = generateBotMove();
    this.markModified('moves.async');
    return Promise.resolve(this);
  }

  return PlayerMove.findOne({player: playerId, triple: this.triple})
    .exec()
    .then(pm => {
      this.moves.async = pm.pick;
      this.markModified('moves.async');
    });
};

TurnSchema.methods.setBotMove = function(){
  this.moves.bot = generateBotMove();
  this.markModified('moves.bot');
};


TurnSchema.methods.setScores = function(){
  const picks = [this.moves.sync, this.moves.async, this.moves.bot];
  let correctAnswer;
  if(picks[0] === picks[1] || picks[0] === picks[2]){
    correctAnswer = picks[0];
  } else if (picks[1] === picks[2]){
    correctAnswer = picks[1];
  } else {
    correctAnswer = undefined;
  }

  if(correctAnswer){
    if(this.moves.sync === correctAnswer){
      this.score.sync = config.game.scores.win || 10;
    }
    if(this.moves.async === correctAnswer){
      this.score.async = config.game.scores.win || 10;
    }
    if(this.moves.bot === correctAnswer){
      this.score.bot = config.game.scores.win || 10;
    }
  }
  this.markModified('score');
};

mongoose.model('Moves', MovesSchema);
mongoose.model('Score', ScoreSchema);

module.exports = mongoose.model('Turn', TurnSchema);
