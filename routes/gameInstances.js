'use strict';

import GameInstance from '../models/GameInstance';
import errors          from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose        from 'mongoose';
import {InvalidObjectId} from '../lib/errors';

module.exports = function(app){
  // POST  /rooms - create new room
  // POST /rooms/roomID/players - add player to room
  // DELETE /rooms/roomID/players - remove player from room
  // POST /rooms/roomdID/players/choice - choose an answer
  // GET /rooms - get all the information:
  //                previousTurns, currentTurn, gameSequence, players

  // // Create new room
  // app.post('/rooms', function(req, res, next){
  //   User.findOne({_id: mongoose.Types.ObjectId(req.auth.sub)}).lean().exec()
  //     .then(() => {
  //       let room = new Room({players: [req.auth.sub]});
  //       return room.save();
  //     })
  //     .then(room => {
  //       res.send(201, room);
  //       return next();
  //     })
  //     .catch(err => {
  //       log.error(err);
  //       return next(new errors.InvalidContentError(err.errors.name.message));
  //     });
  // });

  // TODO check if player can ask for this game -- auth
  // TODO remove fields before returning
  app.get('/gameInstances/:id', function(req, res, next){
    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
      return next(new InvalidObjectId(req.params.id));
    }
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    GameInstance.findOne(query).populate([{
        path: 'players.sync',
        select: 'username',
        model: 'User'
      },{
        path: 'players.async',
        select: 'username',
        model: 'User'
      },{
        path: 'turns.all',
        model: 'Turn',
        populate: [{
            path: 'triple',
            model: 'Triple',
            populate: {
              path: 'itemA itemB itemC',
              model: 'Item'
            }
          },{
            path: 'moves',
            model: 'Moves',
          },{
            path: 'score',
            model: 'Score',
          }
        ]
      },{
        path: 'turns.previous',
        model: 'Turn',
        populate: [{
            path: 'triple',
            model: 'Triple',
            populate: {
              path: 'itemA itemB itemC',
              model: 'Item'
            }
          },{
            path: 'moves',
            model: 'Moves',
          },{
            path: 'score',
            model: 'Score',
          }
        ]
      },{
        path: 'turns.current',
        model: 'Turn',
        populate: [{
            path: 'triple',
            model: 'Triple',
            populate: {
              path: 'itemA itemB itemC',
              model: 'Item'
            }
          },{
            path: 'moves',
            model: 'Moves',
          },{
            path: 'score',
            model: 'Score',
          }
        ]
      }]).lean()
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(doc => {
        if(!doc){
          return res.send(404);
        }
        res.send(doc);
        return next();
      });
  });


  // // Add player to room
  // app.post('/rooms/:id/players', function(req, res, next){
  //   // Get room
  //   Room.findOne({id: req.params.id}).exec()
  //     .then(room => {
  //       return room.addPlayer(req.auth.sub);
  //     })
  //     .then(room => {
  //       res.send(200, room);
  //       next();
  //     })
  //     .catch(err => {
  //       log.error(err);
  //       res.send(err);
  //       next();
  //     });
  // });

  // // Perform room operations such as:
  // // - start game
  // //
  // app.patch('/rooms/:id', function (req, res, next) {
  //   // Get room
  //   Room.findOne({id: req.params.id}).exec()
  //     .then(room => {
  //       if(req.params.startGame){
  //         return room.startGame();
  //       }
  //     })
  //     .then(room => {
  //       res.send(room);
  //       next();
  //     })
  //     .catch(err => {
  //       log.error(err);
  //       res.send(err);
  //       next();
  //     });
  // });


  // app.post('/quick-games',
  //   function(req, res){
  //     DisposableRoom.createNew({
  //       players: {
  //         sync: req.auth.sub
  //       }
  //     })
  //     .then(room => {
  //       res.send({room});
  //     })
  //     .catch(err => {
  //       log.error(err);
  //       return next(new errors.InvalidContentError(err.errors.name.message));
  //     });
  //   }
  // );

  // app.get('/quick-games/:id', function(req, res, next){
  //   let include = {};
  //   if(req.params.full){
  //     include.allTurns = true;
  //     include.gameSequence = true;
  //   }
  //   DisposableRoom.findOne({
  //     id: req.params.id,
  //     'players.sync': mongoose.Types.ObjectId(req.auth.sub)
  //   })
  //   .then(dr => dr.fixFields({include}))
  //   .then(dr => {
  //     res.send(dr);
  //     next();
  //   })
  //   .catch(err => {
  //     log.error(err);
  //     res.send(err);
  //     next();
  //   });
  // });

  // app.post('/quick-games/:id/moves', function(req, res, next){
  //   DisposableRoom.findOne({
  //     id: req.params.id,
  //     'players.sync': mongoose.Types.ObjectId(req.auth.sub)
  //   })
  //   .then(dr => {
  //     if(dr.isFinished){
  //       return Promise.reject('Game is already finished');
  //     }
  //     return dr.addMove(req.params.tripleId, req.params.pick);
  //   })
  //   .then(dr => {
  //     res.send(dr);
  //     next();
  //   })
  //   .catch(err => {
  //     log.error(err);
  //     res.send(err);
  //     next();
  //   });
  // });
};
