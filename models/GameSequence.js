'use strict';

import mongoose         from 'mongoose';
import Triple           from './Triple';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import config           from '../config';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const GameSequenceSchema = mongoose.Schema({
  // TODO: validate array length
  triples: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Triple',
    required: true
  }]
});


GameSequenceSchema.post('save', function(doc, next){
  doc.populate({path: 'triples'}, next);
});

GameSequenceSchema.statics.selectNew = function(playerIDs){
  let gameSeqIDs = new Set();
  const pIDs = playerIDs.map(x => mongoose.Types.ObjectId(x))

  return require('./User').find().where('_id').in(pIDs).select('playedSequences').lean().exec()
    .then(players => {
      players.forEach(p => {
        p.playedSequences.forEach(gs => {
          gameSeqIDs.add(mongoose.Types.ObjectId(gs));
        });
      });

      return this.findOne().where('_id').nin([...gameSeqIDs]).exec();
    })
};

module.exports = mongoose.model('GameSequence', GameSequenceSchema);
