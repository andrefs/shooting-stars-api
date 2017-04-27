'use strict';

import User from '../models/User';
import errors from 'restify-errors';

module.exports = function(app){

  app.get('/users', function(req, res, next){
    let offset =  0;
    let limit  = 10;
    User.paginate({},{offset, limit}, function(err, result){
      if(err){
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      }
      res.send(result.docs);
      next();
    });
  });

};
