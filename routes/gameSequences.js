'use strict';

import Item from '../models/Item';
import GameSequence from '../models/GameSequence';
import errors from 'restify-errors';

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
    Item.paginate({},{offset, limit})
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
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    const options = {
      populate: 'triples',
      lean: true
    };

    GameSequence.findOne(query)
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(doc => {
        res.send(doc);
        return next();
      });
  });
};
