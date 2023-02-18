import mongoose from 'mongoose';
import * as db from '../db';

let conn;

beforeAll(done => {
  conn = db.connect();
  return done();
});


afterAll(async () => {
  db.disconnect();
});

export { conn };
