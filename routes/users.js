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

  app.get('/user', function(req, res, next){
    return User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
      .lean()
      .then(user => {
        return GameInstance.findOne({'_id': user.currentGameInstance});
      })
      .catch(err => {
        log.error(err);
        return next(new errors.InvalidContentError(err.errors.name.message));
      })
      .then(user => {
        if(!user){
          res.send(404);
          return;
        }
        res.send(user);
        return next();
      });
  });

  app.patch('/user', function(req, res, next){
    return User.findOne({'_id': mongoose.Types.ObjectId(req.auth.sub)})
      .then(user => user.addOptionalInfo(
        req.body.email,
        req.body.gender,
        req.body.birthYear,
        req.body.topicKnowledge
      ))
      .then(() => {
        res.send(204);
        return next();
      });
  });

  app.post('/auth/register',
    passport.authenticate('local-register', {session: false}),
    function(req, res, next){
      let token = getJwt(req.user._id, config.auth.jwt.secret);
      log.info(`User registered in with local-register: ${req.user.username}`);
      res.send(201,{
        token,
        user: {
          _id: req.user['_id'], // TODO should we really send the _id?
          username: req.user.username,
          isGuest: false
        }
      });
      return next();
    });

  app.post('/auth/registerGuest', function(req, res, next){
    return User.estimatedDocumentCount()
      .then(userCount => User.create({
        username: 'guest'+(userCount+1),
        isGuest: true
      }))
      .then(user => {
        let token = getJwt(user._id, config.auth.jwt.secret);
        res.send(201,{
          token,
          user: {
            _id: user['_id'], // TODO should we really send the _id?
            username: user.username,
            isGuest: true
          }
        });
        return next();
      });
  });

  app.post('/auth/login',
    passport.authenticate('local-login', {session:false}),
    function(req, res){
      let token = getJwt(req.user._id, config.auth.jwt.secret);
      log.info(`User logged in with local-login: ${req.user.username}`);
      res.send({
        token: token,
        user: {
          _id: req.user['_id'], // TODO should we really send the _id?
          username: req.user.username,
          isGuest: false
        }
      });
      return next();
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

