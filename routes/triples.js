import Triple from '../models/Triple';
import Item from '../models/Item';
import errors from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose from 'mongoose';

module.exports = function(app){

  app.get('/triples', function(req, res, next){
    let options = {
      offset:  0,
      limit : 10,
      lean  : true
    };
    if(req.params.includeItems){
      options.populate = {path: 'itemA itemB itemC', model: Item};
    }

    Triple.paginate({}, options)
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result.docs);
        return next();
      });
  });
};
