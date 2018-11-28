import passport                     from 'passport';
import {Strategy as LocalStrategy}  from 'passport-local';
import {Strategy as CustomStrategy} from 'passport-custom';
import User                         from '../models/User';
import config                       from '../config';
import mongoose                     from 'mongoose';
import {log}                        from '../lib/logger';
import {parseJwt}                   from '../lib/jwt';

// User register
passport.use('local-register', new CustomStrategy(
  function(req, cb){
    const {username, password, token} = req.body;
    console.log('XXXXXXXXXXXXXXXXXXXx body', username, password, token);
    return User.findOne({username}).lean().exec()
      .then(user => {
        // Check if user already exists
        if(user){ return cb(null, false); }

        if(token){
          const _id = parseJwt(req.body.token, config.auth.jwt.secret).sub;
          return User.findOne({_id: mongoose.Types.ObjectId(_id)})
            .then(user => {
              user.username = req.body.username;
              user.password = req.body.password;
              user.isGuest  = false;
              return user.save();
            });
        }

        // Create new user
        return User.create({username, password, isGuest: false});
      })
      .then(user => {
        return cb(null, user);
      })
      .catch(err => {
        log.error(err);
        return cb(err);
      });
  })
);

// User login
passport.use('local-login', new LocalStrategy(
  {usernameField: 'username'},
  function(username, password, cb) {
    User.findOne({'username': username}).exec()
      .then(user => {
        // No user
        if(!user){ return cb(null, false); }

        // Password invalid
        if(!user.comparePassword(password)){
          return cb(null, false);
        }

        return cb(null, user);
      })
      .catch(err => {
        log.error(err);
        cb(err);
      });
  }
));

export default passport;
