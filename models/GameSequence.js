import mongoose         from 'mongoose';
import Triple           from './Triple';
import Pair             from './Pair';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';
import MongooseSequence from 'mongoose-sequence';
import config           from '../config';
import max               from 'lodash/max';


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
  //ambiguity: {
  //  required: true,
  //  default:0,
  //  type: Number
  //}
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

GameSequenceSchema.statics.createNew = function(playerId){
  const pId = mongoose.Types.ObjectId(playerId._id || playerId);
  log.info('Creating new game sequence for player', pId.toString());
  let player;
  let maxScore;
  let normScore;

  return require('./User').findOne()
    .where({_id: pId}).select('playedTriples totalScore').lean().exec()
    .then(_player => {
      player = _player;
      maxScore = config.game.scores.win
        * config.game.size
        * player.playedTriples.length;
      normScore = maxScore ? player.totalScore/maxScore : 0.5;

      return Triple.find()
        .where('_id').nin(player.playedTriples)
        .countDocuments();
    })
    .then(availableTriples => {
      // No triples unplayed by this player, need to generate more
      if(availableTriples < config.game.size){
        log.info(`No triples available for player ${pId}, generating new`);
       return Pair.rebuildOrder()
        .then(() => this.createNew(pId));
      }

      let skip = Math.floor(availableTriples * normScore);
      skip = skip-config.game.size/2;
      skip = skip < 0 ? 0 : skip;

      return Triple.find()
        .skip(skip)
        .where('_id').nin(player.playedTriples)
        .select('ambiguity')
        .sort('ambiguity')
        .limit(config.game.size)
        .then((triples) => this.create({triples}));
     });
};

module.exports = mongoose.model('GameSequence', GameSequenceSchema);
