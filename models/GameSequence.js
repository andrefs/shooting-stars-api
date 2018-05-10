import mongoose         from 'mongoose';
import Triple           from './Triple';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';
import MongooseSequence from 'mongoose-sequence';
import {NoGameSequencesLeft}  from '../lib/errors';
import config           from '../config';


mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});
const autoIncrement = MongooseSequence(mongoose);

const GameSequenceSchema = mongoose.Schema({
  triples: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple,
    required: true
  }],
  highestItemId: {
    required: true,
    type: Number
  },
  randomSeq: {
    type: String,
    required: true
  },
  ambiguity: {
    required: true,
    default:0,
    type: Number
  }
});

GameSequenceSchema.plugin(autoIncrement, {
  id: 'game_sequence_counter', inc_field: 'seqNum'
});

GameSequenceSchema.pre('validate', function(next){
  return this.populate({path: 'triples', model: Triple}).execPopulate()
    .then(gs => {
      gs.randomSeq = createHash('md5')
        .update(this._id.toString())
        .digest('hex');
      gs.highestItemId = 1;
      gs.triples.forEach(t => {
        if(t.highestItemId > gs.highestItemId){
          gs.highestItemId = t.highestItemId;
        }
        return next();
      });
    });
});

GameSequenceSchema.post('save', function(doc, next){
  return doc.populate({path: 'triples', model: Triple}, next);
});

GameSequenceSchema.statics.selectNew = function(playerID){
  const pID = mongoose.Types.ObjectId(playerID);

  // TODO adapt sequence to player level

  return require('./User').findOne()
    .where({_id: pID}).select('playedSequences').lean().exec()
    .then(player => this.findOne()
      .where('_id').nin(player.playedSequences)
      .select('ambiguity triples')
      .populate({path: 'triples', model: 'Triple'})
      .sort('ambiguity'))
    .then(gs => gs || this.generateNew());
};

GameSequenceSchema.statics.generateNew = function(){
  const self = this;
  return Triple.generateNew(config.game.size)
    .then(triples => self.create({triples}));
}

GameSequenceSchema.methods.updateAmbiguity = function(){
  const self = this;
  return self.populate({path: 'triples', model: 'Triple'}).execPopulate()
    .then(() => {
      self.ambiguity = self.triples.reduce((prev, cur) => prev+cur.ambiguity, 0);
      return self.save();
    });
};

module.exports = mongoose.model('GameSequence', GameSequenceSchema);
