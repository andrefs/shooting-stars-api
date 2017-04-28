'use strict';

import Item from '../models/Item';
import GameSequence from '../models/GameSequence';
import errors from 'restify-errors';

module.exports = function(app){

  app.post('/gameSequences', function(req, res, next){
    let gameSeq = new GameSequence();
    gameSeq.triples = req.params.triples;
    gameSeq.save()
      .then(() => {
        res.send(201);
        return next();
      })
      .catch((err) => {
        log.error(err)
        return next(new errors.InternalError(err.message));
      });
  });


  app.get('/gameSequences', function(req, res, next){
    let offset =  0;
    let limit  = 10;
    Item.paginate({},{offset, limit}, function(err, result){
      if(err){
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      }
      res.send(result.docs);
      next();
    });
  });


  app.get('/gameSequences/:id', function(req, res, next){
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    GameSequence.findOne(query, function(err, result){
      if(err){
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      }
      res.send(result.docs);
      next();
    });
  });
};
