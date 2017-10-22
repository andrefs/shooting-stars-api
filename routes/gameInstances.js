'use strict';

import GameInstance from '../models/GameInstance';
import errors          from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose        from 'mongoose';
import {InvalidObjectId} from '../lib/errors';

module.exports = function(app){

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
        select: 'triple',
        populate: [{
            path: 'triple',
            model: 'Triple',
            populate: {
              path: 'itemA itemB itemC',
              model: 'Item'
            },
            select: 'triple'
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


  // // TODO add verification -- playerId must be same player from auth
  // app.post('/gameInstances/move/:pick', function(req, res, next){
  //   
  //   User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
  //     .then(user => {
  //       return GameInstances.findOne({'_id': user.currentGameInstance});
  //     })
  //     .then(gi => {
  //       gi.addMove(
  //     });

  //   DisposableRoom.findOne({
  //     id: req.params.id,
  //     'players.sync': 
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
