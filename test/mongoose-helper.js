import mongoose from 'mongoose';

let conn;

before(done => {
  conn = require('../db');
  return done();
});


after(done => {
  mongoose.disconnect();
  return done();
});
