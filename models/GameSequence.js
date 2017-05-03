'use strict';

import mongoose         from 'mongoose';
import Triple           from './Triple';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const GameSequenceSchema = mongoose.Schema({
  // TODO: validate array length
  triples: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Triple'
  }]
});


GameSequenceSchema.post('save', function(doc, next){
  doc.populate({path: 'triples'}, next);
});

module.exports = mongoose.model('GameSequence', GameSequenceSchema);
