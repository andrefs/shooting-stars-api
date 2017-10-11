'use strict';

import Item from '../models/Item';
import errors from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose from 'mongoose';

module.exports = function(app){

  app.post('/items', function(req, res, next){
    let item = new Item();
    item.name = req.params.name;
    item.description = req.params.description;
    item.imageUrl = req.params.imageUrl;

    item.save()
      .then((doc) => {
        res.send(201, doc);
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
    let lean = true;

    Item.paginate({},{offset, limit, lean})
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result.docs);
        return next();
      });
  });


  app.get('/items/:id', function(req, res, next){
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    Item.findOne(query).lean().exec()
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
