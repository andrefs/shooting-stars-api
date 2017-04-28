'use strict';

import Item from '../models/Item';
import errors from 'restify-errors';

module.exports = function(app){

  app.post('/items', function(req, res, next){
    let item = new Item();
    item.name = req.body.name;
    item.description = req.body.description;
    item.imageUrl = req.body.imageUrl;

    item.save()
      .then(() => {
        res.send(201);
        return next();
      })
      .catch((err) => {
        log.error(err)
        return next(new errors.InternalError(err.message));
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
