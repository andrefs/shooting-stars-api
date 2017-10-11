import mongoose         from 'mongoose';
import Triple           from './Triple';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';
import MongooseSequence from 'mongoose-sequence';

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
    type: 'String',
    required: true
  }
});

GameSequenceSchema.plugin(autoIncrement, {
  id: 'game_sequence_counter',
  'inc_field': 'id'
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

GameSequenceSchema.statics.selectNew = function(playerIDs){
  let gameSeqIDs = new Set();
  const pIDs = playerIDs.map(x => mongoose.Types.ObjectId(x));

  return require('./User').find()
    .where('_id').in(pIDs).select('playedSequences').lean().exec()
    .then(players => {
      players.forEach(p => {
        p.playedSequences.forEach(gs => {
          gameSeqIDs.add(mongoose.Types.ObjectId(gs));
        });
      });

      return this.findOne().where('_id').nin([...gameSeqIDs]).exec();
    })
    .then(gs => {
      if(!gs){ throw new Error("Could not select a new GameSequence"); }
      return gs;
    });
};

GameSequenceSchema.statics.generate = function(howMany, sequenceSize, highestItemId){
  return Triple.find()
    .where('highestItemId')
    .lte(highestItemId)
    .limit(howMany*sequenceSize)
    .sort('randomSeq').exec()
    .then(triples => {
      let gameSeqs = [];
      while(triples.length >= sequenceSize){
        gameSeqs.push(new this({
          triples: triples.splice(0,sequenceSize)
        }));
      }

      log.debug('GameSequence('+howMany+','+sequenceSize+','+highestItemId+
        ') called, creating '+gameSeqs.length+' game sequences...');

      return this.create(gameSeqs);
    });
};

module.exports = mongoose.model('GameSequence', GameSequenceSchema);
