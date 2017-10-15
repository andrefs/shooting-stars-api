'use strict';

import Item from '../models/Item';
import GameSequence from '../models/GameSequence';
import errors from 'restify-errors';
import mongoose from 'mongoose';
import {InvalidObjectId} from '../lib/errors';

module.exports = function(app){

  // save a game sequence object
  // return the created game sequence
  app.post('/gameSequences', function(req, res, next){
    let gameSeq = new GameSequence();
    gameSeq.triples = req.params.triples;
    gameSeq.save()
      .then(doc => {
        res.send(201, doc);
        return next();
      })
      .catch((err) => {
        log.error(err)
        return next(new errors.InternalError(err.message));
      });
  });


  // return list of sequences, don't populate 'triples' field
  app.get('/gameSequences', function(req, res, next){
    let offset =  0;
    let limit  = 10;
    let lean = true;
    GameSequence.paginate({},{offset, limit, lean})
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result.docs);
        return next();
      });
  });


  // return a sequence with 'triples' field populated
  app.get('/gameSequences/:id', function(req, res, next){
    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
      return next(new InvalidObjectId(req.params.id));
    }
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    GameSequence.findOne(query).populate({path: 'triples'}).lean()
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
};
