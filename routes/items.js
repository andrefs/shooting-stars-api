'use strict';

import Item from '../models/Item.js';
import errors from 'restify-errors';
import { log } from '../lib/logger.js';
import mongoose from 'mongoose';
import { InvalidObjectId } from '../lib/errors/index.js';

export default function(app) {

  // Create item
  app.post('/items', function(req, res, next) {
    let item = new Item();
    item.name = req.params.name;
    item.description = req.params.description;
    item.imageUrl = req.params.imageUrl;

    if (req.files && req.files.image) {
      item.tmpPath = req.files.image.path;
      Item.loadItem(item)
        .then(doc => {
          res.send(201, doc);
          return next();
        })
        .catch((err) => {
          log.error(err);
          return next(new errors.InternalError(err.message));
        });
    } else {
      item.save()
        .then((doc) => {
          res.send(201, doc);
          return next();
        })
        .catch((err) => {
          log.error(err);
          return next(new errors.InternalError(err.message));
        });
    }
  });


  // Get list of items
  app.get('/items', function(req, res, next) {
    let offset = 0;
    let limit = 10;
    let lean = true;

    Item.paginate({}, { offset, limit, lean })
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result.docs);
        return next();
      });
  });


  // Get item by ID
  app.get('/items/:id', function(req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(new InvalidObjectId(req.params.id));
    }
    const query = {
      _id: mongoose.Types.ObjectId(req.params.id)
    };
    Item.findOne(query).lean().exec()
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(doc => {
        if (!doc) {
          return res.send(404);
        }
        res.send(doc);
        return next();
      });
  });

};
