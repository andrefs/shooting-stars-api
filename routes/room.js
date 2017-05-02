'use strict';

import Room from '../models/Room';
import errors from 'restify-errors';
import async  from 'async';

module.exports = function(app){

  app.post('/rooms', function(req, res, next){
    Users.findOne({username: req.user.sub}, (err, user){
      if(err){
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      }
      let room = new Room({players: [user._id]});
      room.save((err, room) => {
        if(err){
          log.error(err);
          return next(new errors.InvalidContentError(err.errors.name.message));
        }
        res.send(201, room);
        return next();
      });
    });
  });

  app.post('/rooms/:id', function(req, res, next){
    if(req.params.addPlayer){
      Promise.all(
        Room.findOne({id: req.params.id}),
        User.findOne({username: req.user.sub})
      )
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then([room, user] => {
        if(room.players.includes(req.user.id)){
          log.error(err);
          return next(new errors.InvalidContentError('This player already joined this room'));
        }
        room.players.push(req.user.id);
        room.save((err, room) => {
          res.send(200, room);
          return next();
        });
      });
    }
    return next();
  });

};
