import mongoose from 'mongoose';
import pagPlugin from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified from 'mongoose-createdmodified';
import Triple from './Triple';
import PlayerMove from './PlayerMove';
import _ from 'lodash';
import config from '../config';
import randProb from '../lib/randProb';

const ScoreSchema = mongoose.Schema({
  player: { type: Number, default: 0 },
  rand1: { type: Number, default: 0 },
  rand2: { type: Number, default: 0 }
});

const MovesSchema = mongoose.Schema({
  player: { type: String, enum: ['AB', 'BC', 'AC'] },
  rand1: { type: String, enum: ['AB', 'BC', 'AC'] },
  rand2: { type: String, enum: ['AB', 'BC', 'AC'] }
});

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, { index: true });

const TurnSchema = mongoose.Schema({
  triple: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple
  },
  moves: {
    type: MovesSchema,
    default: () => ({})
  },
  score: {
    type: ScoreSchema,
    default: () => ({})
  }
}, { minimize: false });

TurnSchema.methods.setMoves = function() {
  const m1 = this._generateWeightedRandomMove();
  const m2 = this._generateWeightedRandomMove();
  this.moves.rand1 = m1;
  this.moves.rand2 = m2;

  this.markModified('moves.rand1');
  this.markModified('moves.rand2');

  this.setScores();
  return this.save();
};

TurnSchema.methods._generateWeightedRandomMove = function() {
  const picks = [
    this.triple.picks.AB.count,
    this.triple.picks.AC.count,
    this.triple.picks.BC.count
  ];

  const randPos = randProb(picks);

  const moves = ['AB', 'AC', 'BC'];
  return moves[randPos];
}


TurnSchema.methods.setScores = function() {
  const picks = [this.moves.player, this.moves.rand1, this.moves.rand2];
  let correctAnswer;
  if (picks[0] === picks[1] || picks[0] === picks[2]) {
    correctAnswer = picks[0];
  } else if (picks[1] === picks[2]) {
    correctAnswer = picks[1];
  } else {
    correctAnswer = undefined;
  }

  if (correctAnswer) {
    if (this.moves.player === correctAnswer) {
      this.score.player = config.game.scores.win || 10;
    }
    if (this.moves.rand1 === correctAnswer) {
      this.score.rand1 = config.game.scores.win || 10;
    }
    if (this.moves.rand2 === correctAnswer) {
      this.score.rand2 = config.game.scores.win || 10;
    }
  }
  this.markModified('score');
};

module.exports = mongoose.model('Turn', TurnSchema);
