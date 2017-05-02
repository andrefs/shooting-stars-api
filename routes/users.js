'use strict';

import User from '../models/User';
import errors from 'restify-errors';

module.exports = function(app){

  app.get('/users', function(req, res, next){
    let offset =  0;
    let limit  = 10;
    User.paginate({},{offset, limit}).exec()
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(result => {
        res.send(result.docs);
        return next();
      });
  });

  app.route('/register')
  .post(passport.authenticate('local-register', {session:false}), function(req, res){
    debug(`User registered with local-register: ${req.user.local.username}`);
    let token = get_jwt(req.user);
    debug(`User logged in with local-login: ${req.user.local.username}`);
    res.status(201).json({
      token: token,
      user: {
        _id: req.user['_id'],
        username: req.user.username
      }
    });
  });

  app.route('/login')
  .post(passport.authenticate('local-login', {session:false}), function(req, res, next){
    let token = get_jwt(req.user);
    debug(`User logged in with local-login: ${req.user.local.username}`);
    res.json({
      token: token,
      user: {
        _id: req.user['_id'],
        username: req.user.username
      }
    });
  });

  function get_jwt(user){
    const now = Date.now();
    const week_later = now + 7*24*60*60;
    const claims = {
      sub: user.id,
      iat: now,
      exp: week_later
    };
    let token = jwt.encode(claims, config.auth.jwt.secret);
    return token;
  }
};
