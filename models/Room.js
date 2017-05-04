'use strict';

import mongoose         from 'mongoose';
import User             from './User';
import GameInstance     from './GameInstance';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import shortid          from '../utils/shortid';
import errors           from 'restify-errors';

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
    default: []
  }],
  currentGameInstance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameInstance
  }
});


// doc.id always get written by the system
RoomSchema.pre('validate', function(next) {
  let doc = this;
  if(!doc.id){
    doc.id = shortid();
  }
  return next();
});

// instance method
RoomSchema.methods.addPlayer = function(playerID){
  // Check if user has already joined this room
  if(this.players.map(x => x.toString()).includes(playerID)){
    return Promise.reject(new errors.ConflictError('This player already joined this room'));
  }

  const pID = mongoose.Types.ObjectId(playerID);
  return User.findOne({_id: pID}).select('_id').lean().exec()
    .then(player => {
      if(!player){
        return Promise.reject(new errors.ConflictError('Unknown player ID'));
      }
      // Add user to room and save
      this.players.push(playerID);
      return this.save();
    })
    .then(() => {
      const opts = {
        path: 'players',
        select: '_id username',
        model: User
      };
      // Populate before returning
      return this.populate(opts).lean().execPopulate();
    });
}

RoomSchema.methods.startGame = function(){
  // There must be no game instances yet
  if(this.currentGameInstance || this.previousGameInstances.length){
    return Promise.reject(new errors.ConflictError('This room already has a game in progress'));
  }

  this.waitingForPlayers = false;
  return this.newGameInstance();
}

RoomSchema.methods.newGameInstance = function(){
  if(this.currentGameInstance){
    this.previousGameInstances.push(this.currentGameInstance);
  }
  return GameInstance.createNew(this.players)
    .then(gameInst => {
      this.currentGameInstance = gameInst;
      return this.save();
    })
    .then(room => {
      return room
        .populate({path: 'currentGameInstance', model: GameInstance})
        .populate({path: 'players', model: User})
        .execPopulate();
    });
}



module.exports = mongoose.model('Room', RoomSchema);
