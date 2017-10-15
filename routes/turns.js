import Turn from '../models/Turn';
import errors from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose from 'mongoose';
import {InvalidObjectId} from '../lib/errors';

module.exports = function(app){
  app.get('/turns', function(req, res, next){
    let offset =  0;
    let limit  = 10;
    let lean = true;

    Turn.paginate({},{offset, limit, lean})
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result.docs);
        return next();
      });
  });


  app.get('/turns/:id', function(req, res, next){
    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
      return next(new InvalidObjectId(req.params.id));
    }
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    Turn.findOne(query).lean().exec()
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



  // app.post('/choices', function(req, res, next){
  //   let choice = new Choice();
  //   choice.triple = req.params.triple;
  //   choice.player = req.auth.sub;
  //   choice.pick = req.params.pick;
  //   choice.gameSequence = req.params.gameSequence;

  //   choice.save()
  //     .catch((err) => {
  //       log.error(err);
  //       return next(new errors.InternalError(err.message));
  //     })
  //     .then(() => {
  //       Choice.find().exec()
  //         .then((choices) => {

  //         });
  //     });
  // });
};
