'use strict';

import GameInstance from '../models/GameInstance';
import errors          from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose        from 'mongoose';
import {InvalidObjectId, UnfinishedGameInstance, NoCurrentGame} from '../lib/errors';
import User            from '../models/User';

module.exports = function(app){

  app.get('/gameInstances/current', function(req, res, next){
    return User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
      .then(user => {
        return GameInstance.findOne({'_id': user.currentGameInstance})
      })
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(gi => {
        if(!gi){
          res.send(404);
          return;
        }
        return gi.toSanitizedObject();
      })
      .then(obj => {
        if(obj){ res.send(obj); }
        return next();
      });
  });

  /**
   * Create new
   */

  app.post('/gameInstances/current', function(req, res, next){
    return User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
      .then(user => {
        if(user.currentGameInstance){
          return GameInstance.findOne({'_id': user.currentGameInstance})
            .then(gi => {
              if(!gi.isFinished){
                return next(new UnfinishedGameInstance());
              }
              return GameInstance.createNew(user._id);
            });
        }
        return GameInstance.createNew(user._id);
      })
      .then(gi => gi.toSanitizedObject())
      .then(obj => {
        res.send(obj);
        return next();
      })
      .catch(err => {
        log.error(err);
        return next(err);
      })
  });

  app.post('/gameInstances/currentTurn/:pick', function(req, res, next){
    return User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
      .then(user => GameInstance.findOne({'_id': user.currentGameInstance}))
      .then(gi => {
        if(!gi){ throw new NoCurrentGame(); }
        return gi.addMove(req.params.pick);
      })
      .then(gi => gi.toSanitizedObject())
      .then(obj => {
        res.send(200, obj);
        return next();
      })
      .catch(err => {
        log.error(err);
        return next(err);
      })
  });


  app.get('/gameInstances/:id', function(req, res, next){
    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
      return next(new InvalidObjectId(req.params.id));
    }
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    GameInstance.findOne(query).lean().exec()
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(gi => {
        if(!gi){
          return res.send(404);
        }
        res.send(gi);
        return next();
      });
  });
};
