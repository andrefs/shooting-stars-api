import Room     from '../models/Room';
import User     from '../models/User';
import errors   from 'restify-errors';
import log      from '../utils/log';
import mongoose from 'mongoose';

module.exports = function(app){
  // POST  /rooms - create new room
  // POST /rooms/roomID/players - add player to room
  // DELETE /rooms/roomID/players - remove player from room
  // POST /rooms/roomdID/players/choice - choose an answer
  // GET /rooms - get all the information:
  //                previousTurns, currentTurn, gameSequence, players

  // Create new room
  app.post('/rooms', function(req, res, next){
    User.findOne({_id: mongoose.Types.ObjectId(req.auth.sub)}).lean().exec()
      .then(() => {
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
      });
  });

  // Get room info
  app.get('/rooms/:id', function(req, res, next){
    Room.findOne({id: req.params.id})
      .populate({path: 'players', model: User}).lean().exec()
      .then(room => {
        res.send(200, room);
        next();
      })
      .catch(err => {
        log.error(err);
        res.send(err);
        next();
      });
  });

  // Add player to room
  app.post('/rooms/:id/players', function(req, res, next){
    // Get room
    Room.findOne({id: req.params.id}).exec()
      .then(room => {
        return room.addPlayer(req.auth.sub);
      })
      .then(room => {
        res.send(200, room);
        next();
      })
      .catch(err => {
        log.error(err);
        res.send(err);
        next();
      });
  });

  // Perform room operations such as:
  // - start game
  //
  app.patch('/rooms/:id', function (req, res, next) {
    // Get room
    Room.findOne({id: req.params.id}).exec()
      .then(room => {
        if(req.params.startGame){
          return room.startGame();
        }
      })
      .then(room => {
        res.send(room);
        next();
      })
      .catch(err => {
        log.error(err);
        res.send(err);
        next();
      });
  });
};
