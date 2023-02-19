import errors from 'restify-errors';
import { log } from '../lib/logger.js';
import mongoose from 'mongoose';
import config from '../config/index.cjs';
import Promise from 'bluebird';
import Pair from '../models/Pair.js';

export default function(app, passport) {
  // TODO auth
  app.get('/admin/rebuildOrder', function(req, res, next) {
    const start = process.hrtime();
    return Pair.rebuildOrder()
      .then(resp => {
        res.send(resp);
        return next();
      })
      .catch(err => {
        log.error(err);
        return next(err);
      });
  });

};
