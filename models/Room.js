'use strict';

import mongoose         from 'mongoose';
import User             from './User';
import GameInstance     from './GameInstance';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import shortid          from '../utils/shortid';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const today = new Date();
const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate()+7);

const RoomSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  expireDate: {
    type: Date,
    required: true,
    default: nextWeek
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: false
  }],
  waitingForPlayers: {
    type: Boolean,
    default: true
  },
  previousGameInstances: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: GameInstance,
    required: true
  }],
  currentGameInstance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameInstance,
    required: true
  }
});


// doc.id always get written by the system
RoomSchema.pre('validate', function(next) {
  let doc = this;
  doc.id = shortid();
  return next();
});

module.exports = mongoose.model('Room', RoomSchema);
