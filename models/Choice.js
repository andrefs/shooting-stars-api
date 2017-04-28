'use strict';

import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import mongooseTypeUrl  from 'mongoose-type-url';
import Triple           from './Triple';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const ChoiceSchema = mongoose.Schema({
  triple: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple
  },
  pick: {
    required: true,
    type: String,
    enum: ['AB', 'BC', 'CA']
  },


  player: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: User
  }
});

module.exports = mongoose.model('Choice', ChoiceSchema);
