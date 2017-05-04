'use strict';

import mongoose         from 'mongoose';
import GameSequence     from './GameSequence';
import Turn             from './Turn';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const today = new Date();
const GameInstanceSchema = mongoose.Schema({
  gameSequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameSequence,
    required: true
  },
  previousTurns: [
    [{
      type: mongoose.Schema.Types.ObjectId,
      ref: Turn
    }]
  ],
  currentTurn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: Turn,
    required: true
  }]
});

module.exports = mongoose.model('GameInstance', GameInstanceSchema);
