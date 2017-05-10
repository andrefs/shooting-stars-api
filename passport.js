import passport                    from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import User                        from './models/User';
import config                      from './config';
import mongoose                    from 'mongoose';
import log                         from './utils/log';

// User register

passport.use('local-register', new LocalStrategy(
  {usernameField: 'username'},
  function(username, password, cb){
    User.findOne({'username':username}).lean().exec()
      .then(user => {
        // Check if user already exists
        if(user){ return cb(null, false); }

        // Create new user
        else {
          let user = new User();
          user.username = username;
          return User.calcPasswordHash(password);
        }
      })
      .then(() => {
        return user.save()
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

module.exports = passport;
