import config from './config/index.cjs';
import mongoose from 'mongoose';
import Promise from 'bluebird';
import { log } from './lib/logger.js';
import Lock from './models/Lock.js';

let uri = process.env.MONGO_URI;
if (!uri && config && config.db && config.db.uri) {
  uri = config.db.uri;
} else if (!uri && config && config.db && config.db.host) {
  let auth = '';
  if (config.db.user) { auth += config.db.user + ':'; }
  if (config.db.pass) { auth += config.db.pass + '@'; }
  uri = `mongodb://${auth}${config.db.host}:${config.db.port}/${config.db.name}`;
}
if (!uri) {
  uri = 'mongodb://localhost/shooting-stars_noconfig';
  log.warn(`MongoDB URI not set, using hardcoded default: ${uri} ...`);
}

// TODO compare with Bluebird
// Set Promise library
mongoose.Promise = Promise;
if (config.log.db) {
  mongoose.set('debug', true);
}


// Database connection
const connect = async () => {
  log.info('Connecting to MongoDB ' + uri);
  return mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
};

const disconnect = async () => {
  // cleanup
  await Lock.releaseAllFromClient(process.pid)
  log.info('Disconnecting from MongoDB');
  await mongoose.disconnect();
};


export { mongoose, connect, disconnect, uri };
