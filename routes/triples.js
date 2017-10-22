import Triple from '../models/Triple';
import Item from '../models/Item';
import errors from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose from 'mongoose';
import {InvalidObjectId} from '../lib/errors';

module.exports = function(app){

  app.get('/triples', function(req, res, next){
    let options = {
      offset:  0,
      limit : 10,
      lean  : true,
    };
    if(req.params.includeItems){
      options.populate = {path: 'itemA itemB itemC', model: Item};
    }
    if(req.params.limit){
      options.limit = parseInt(req.params.limit, 10);
    }

    Triple.paginate({}, options)
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result);
        return next();
      });
  });


  app.get('/triples/:id', function(req, res, next){
    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
      return next(new InvalidObjectId(req.params.id));
    }
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    Triple.findOne(query).lean().exec()
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
