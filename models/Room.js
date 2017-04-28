'use strict';

import mongoose         from 'mongoose';
import User             from './User';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import shortid          from '../utils/shortid';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const today = new Date();
const nextweek = new Date(today.getFullYear(), today.getMonth(), today.getDate()+7);
const RoomSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  expireDate: {
    type: Date,
    required: true
  },
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: false
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: false
  },
});


RoomSchema.pre('validate', function(next) {
  let doc = this;
  doc.id = shortid();
  doc.expireDate = nextweek;
  return next();
});

module.exports = mongoose.model('Room', RoomSchema);
