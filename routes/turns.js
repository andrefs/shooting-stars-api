import Choice from '../models/Choice';
import errors from 'restify-errors';
import log from '../utils/log';
import mongoose from 'mongoose';

module.exports = function(app){
  app.post('/choices', function(req, res, next){
    let choice = new Choice();
    choice.triple = req.params.triple;
    choice.player = req.auth.sub;
    choice.pick = req.params.pick;
    choice.gameSequence = req.params.gameSequence;

    choice.save()
      .catch((err) => {
        log.error(err);
        return next(new errors.InternalError(err.message));
      })
      .then(() => {
        Choice.find().exec()
          .then((choices) => {

          });
      });
  });


  app.get('/items', function(req, res, next){
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


  app.get('/items/:id', function(req, res, next){
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    Item.findOne(query, function(err, result){
      if(err){
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      }
      res.send(result.docs);
      next();
    });
  });
};
