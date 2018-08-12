import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Triple           from './Triple';
import PlayerMove       from './PlayerMove';
import _                from 'lodash';
import config           from '../config';

const ScoreSchema = mongoose.Schema({
  player: {type: Number, default: 0},
  rand1:  {type: Number, default: 0},
  rand2:  {type: Number, default: 0}
});

const MovesSchema = mongoose.Schema({
  player: {type: String, enum: ['AB', 'BC', 'AC']},
  rand1:  {type: String, enum: ['AB', 'BC', 'AC']},
  rand2:  {type: String, enum: ['AB', 'BC', 'AC']}
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

TurnSchema.methods.setMoves = function(){
  this.moves.rand1 = this._generateWeightedRandomMove();
  this.moves.rand2 = this._generateWeightedRandomMove();

  this.markModified('moves.rand1');
  this.markModified('moves.rand2');

  this.setScores();
  return this.save();
};

TurnSchema.methods._generateWeightedRandomMove = function(){
  const cumProbs = [];
  cumProbs[0] = this.triple.picks.AB;
  cumProbs[1] = cumProbs[0] + this.triple.picks.AC;
  cumProbs[2] = cumProbs[0] + cumProbs[1] + this.triple.picks.BC;
  const totalProb = cumProbs[0] + cumProbs[1] + cumProbs[2];

  const rand = Math.floor(Math.random()*Math.floor(totalProb));

  let equalProb = [];
  if(cumProbs[0] >= rand){ equalProb.push('AB'); }
  if(cumProbs[1] >= rand){ equalProb.push('AC'); }
  if(cumProbs[2] >= rand){ equalProb.push('BC'); }

  const moveRandPos = Math.floor(Math.random() * equalProb.length);
  return equalProb[moveRandPos];
}


TurnSchema.methods.setScores = function(){
  const picks = [this.moves.player, this.moves.rand1, this.moves.rand2];
  let correctAnswer;
  if(picks[0] === picks[1] || picks[0] === picks[2]){
    correctAnswer = picks[0];
  } else if (picks[1] === picks[2]){
    correctAnswer = picks[1];
  } else {
    correctAnswer = undefined;
  }

  if(correctAnswer){
    if(this.moves.player === correctAnswer){
      this.score.player = config.game.scores.win || 10;
    }
    if(this.moves.rand1 === correctAnswer){
      this.score.rand1 = config.game.scores.win || 10;
    }
    if(this.moves.rand2 === correctAnswer){
      this.score.rand2 = config.game.scores.win || 10;
    }
  }
  this.markModified('score');
};

mongoose.model('Moves', MovesSchema);
mongoose.model('Score', ScoreSchema);

module.exports = mongoose.model('Turn', TurnSchema);
