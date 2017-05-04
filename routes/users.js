'use strict';

import User   from '../models/User';
import errors from 'restify-errors';
import log    from '../utils/log';
import jwt    from 'jwt-simple';
import config from '../config';

module.exports = function(app, passport){

  app.get('/users', function(req, res, next){
    const options = {
      offset : 0,
      limit  : 10,
      lean   : true
    };
    User.paginate({},options)
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result.docs);
        return next();
      });
  });

  app.post('/register', passport.authenticate('local-register', {session:false}), function(req, res){
    log.info(`User registered with local-register: ${req.user.username}`);
    let token = getJwt(req.user, config.auth.jwt.secret);
    log.info(`User logged in with local-login: ${req.user.username}`);
    res.send(201, {
      token: token,
      user: {
        _id: req.user['_id'],
        username: req.user.username
      }
    });
  });

  app.post('/login', passport.authenticate('local-login', {session:false}), function(req, res, next){
    let token = getJwt(req.user, config.auth.jwt.secret);
    log.info(`User logged in with local-login: ${req.user.username}`);
    res.send({
      token: token,
      user: {
        _id: req.user['_id'],
        username: req.user.username
      }
    });
  });

  function getJwt(user, secret){
    const now = Date.now();
    const nextWeek = now + 7*24*60*60;
    const claims = {
      sub: user.id,
      iat: now,
      exp: nextWeek
    };
    let token = jwt.encode(claims, secret);
    return token;
  }
};
