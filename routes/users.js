import User     from '../models/User';
import errors   from 'restify-errors';
import log      from '../utils/log';
import config   from '../config';
import {getJwt} from '../utils/jwt';

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

  app.post('/register',
    passport.authenticate('local-register', {session:false}),
    function(req, res){
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

  app.post('/login',
    passport.authenticate('local-login', {session:false}),
    function(req, res){
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
};
