'use strict';

import GameInstance from '../models/GameInstance';
import errors          from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose        from 'mongoose';
import {InvalidObjectId, UnfinishedGameInstance} from '../lib/errors';
import User            from '../models/User';

module.exports = function(app){

  app.get('/gameInstances/current', function(req, res, next){
    return User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
      .then(user => {
        return GameInstance.findOne({'_id': user.currentGameInstance})
          .select('-gameSequence')
          .populate([{
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
            populate: {
              path: 'triple',
              model: 'Triple',
              populate: {
                path: 'itemAitemB itemC',
                model: 'Item'
              }
            },
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
          }]).lean();
      })
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
      .then(gi => {
        return GameInstance.findOne({_id: gi._id})
          .select('-gameSequence')
          .populate([{
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
            populate: {
              path: 'triple',
              model: 'Triple',
              populate: {
                path: 'itemAitemB itemC',
                model: 'Item'
              }
            },
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
          }]).lean();
      })
      .then(gi => {
        res.send(gi);
        return next();
      });
  });

  // TODO add verification -- playerId must be same player from auth
  app.post('/gameInstances/move/:pick', function(req, res, next){
    return User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
      .then(user => {
        return GameInstance.findOne({'_id': user.currentGameInstance});
      })
      .then(gi => {
        return gi.addMove(req.params.pick);
      })
      .then(gi => {
        res.send(200, gi.turns);
        return next();
      });
  });
};
