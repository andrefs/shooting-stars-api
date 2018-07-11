import User     from '../models/User';
import errors   from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose from 'mongoose';
import config   from '../config';
import {getJwt} from '../lib/jwt';
import Promise          from 'bluebird';

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

  app.post('/auth/register', function(req, res, next){
    return User.findOne({'username':req.body.username}).lean().exec()
      .then(user => {
        // Check if user already exists
        if(user){ res.send(400, {error:'User already exists'}); }

        // Create new user
        return User.create({username: req.body.username});
      })
      .then(user => {
        let token = getJwt(req.body.username, config.auth.jwt.secret);
        res.send(201,{
          token,
          user: {
            _id: user['_id'],
            username: user.username
          }
        });
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

  app.get('/players/bestScores', function(req, res, next){
    return User.findOne({_id: mongoose.Types.ObjectId(req.auth.sub)})
      .then(user => {
        return Promise.join(
          User.globalBestScores(3),
          user.playerNearestScores(3)
        );
      })
      .then(([global, player]) => {
        res.send({global, player});
        return next();
      });
  });



  app.get('/players/usernames', function(req, res, next){
    return User.find().select('username').lean()
      .then(users => {
        res.send(users.map(u => u.username));
        return next();
      });
  });

};
