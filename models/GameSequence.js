import mongoose         from 'mongoose';
import Triple           from './Triple';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import autoIncrement    from 'mongoose-sequence';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const GameSequenceSchema = mongoose.Schema({
  // TODO: validate array length
  triples: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple,
    required: true
  }]
});

GameSchema.plugin(autoIncrement, {
  id: 'game_sequence_counter',
  'inc_field': 'id'
});

GameSequenceSchema.post('save', function(doc, next){
  doc.populate({path: 'triples'}, next);
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
    });
};

module.exports = mongoose.model('GameSequence', GameSequenceSchema);
