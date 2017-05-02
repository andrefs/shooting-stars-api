'use strict';

import mongoose         from 'mongoose';
import User             from './User';
import GameSequence     from './GameSequence';
import Triple           from './GameSequence';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const today = new Date();
const GameInstance = mongoose.Schema({
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: false
  }],
  gameSequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameSequence,
    required: true
  },
  turns: [
    triple: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Triple,
      required: true
    },
    choices: [
      type: mongoose.Schema.Types.ObjectId,
      ref: Choice,
      required: true
    ],
    required: true
  ]
});

module.exports = mongoose.model('GameInstance', GameInstanceSchema);
