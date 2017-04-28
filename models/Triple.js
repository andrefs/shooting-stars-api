'use strict';

import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import mongooseTypeUrl  from 'mongoose-type-url';
import Item             from './Item';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const TripleSchema = mongoose.Schema({
  itemA: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Item
  },
  itemB: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Item
  },
  itemC: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Item
  }
});

module.exports = mongoose.model('Triple', TripleSchema);
