'use strict';

import Room     from '../models/Room';
import User     from '../models/User';
import errors   from 'restify-errors';
import Promise  from 'bluebird';
import log      from '../utils/log';
import mongoose from 'mongoose';

module.exports = function(app){

  // POST  /rooms - create new room
  // POST /rooms/roomID/players - add player to room
  // DELETE /rooms/roomID/players - remove player from room
  // POST /rooms/roomdID/players/choice - choose an answer
  // GET /rooms - get all the information: previousTurns, currentTurn, gameSequence, players

  app.post('/rooms', function(req, res, next){
    User.findOne({_id: mongoose.Types.ObjectId(req.auth.sub)}).lean().exec()
      .then(user => {
        let room = new Room({players: [req.auth.sub]});
        return room.save();
      })
      .then(room => {
        res.send(201, room);
        return next();
      })
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
  });

  app.post('/rooms/:id/players', function(req, res, next){
    // Get room and current user
    Promise.all([
      Room.findOne({id: req.params.id}),
      User.findOne({username: req.auth.sub})
    ])
    .then(([room, user]) => {
      // Check if user has already joined this room
      if(room.players.map(x => x.toString()).includes(req.auth.sub)){
        throw new errors.ConflictError('This player already joined this room');
      }
      // Add user to room and save
      room.players.push(req.auth.sub);
      return room.save();
    })
    .then(room => {
      const opts = {
        path: 'players',
        select: '_id username',
        model: User
      };
      // Populate before returning
      return room.populate(opts).execPopulate();
    })
    .then(room => {
      res.send(200, room);
      return next();
    })
    .catch(err => {
      log.error(err);
      res.send(err);
    });

  });

};
