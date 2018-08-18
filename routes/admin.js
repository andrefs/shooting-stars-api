import errors   from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose from 'mongoose';
import config   from '../config';
import Promise          from 'bluebird';
import Pair from '../models/Pair';

module.exports = function(app, passport){
  // TODO auth
  app.get('/admin/rebuildOrder', function(req, res, next){
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
