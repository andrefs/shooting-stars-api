import mongoose from 'mongoose';
import * as db  from '../db';

let conn;

before(done => {
  conn = db.connect();
  return done();
});


after(done => {
  db.disconnect();
  return done();
});

export {conn};
