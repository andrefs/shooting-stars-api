import passport                    from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import User                        from './models/User';
import config                      from './config';
import mongoose                    from 'mongoose';
import log                         from './utils/log';

// User register

passport.use('local-register', new LocalStrategy(
  {usernameField: 'username'},
  (username, password, cb){
    User.findOne({'username':username}).exec()
      .catch(err => {
        log.error(err);
        return cb(err);
      })
      .then(user => {
        // Check if user already exists
        if(user){ return cb(null, false); }

        // Create new user
        else {
          let user = new User();
          user.username = username;
          user.local.username = username;
          user.local.password = User.calcPasswordHash(password);
          user.save(function(err, user){
            if(err){ throw err; }

            // Add user to #general
            Channel.update({'name':'#general'}, {
              $addToSet: {
                participants: mongoose.Types.ObjectId(user._id)
              },
            },{},function(err, numAffected){

              if(err){ throw err; }
              return cb(null, user);
            });
          });
        }
      });
  })
);

// User login
passport.use('local-login', new LocalStrategy(
  {usernameField: 'username'},
  function(username, password, cb) {
    User.findOne({'local.username': username}).exec()
      .catch(err => {
        log.error(err);
        cb(err);
      })
      .then(user => {
        // No user
        if(!user){ return cb(null, false); }

        // Password invalid
        if(!user.passwordIsValid(password)){
          return cb(null, false);
        }

        return cb(null, user);
      });
  }
));

module.exports = passport;
