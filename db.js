import config from './config/index.cjs';
import mongoose from 'mongoose';
import Promise from 'bluebird';
import { log } from './lib/logger.js';
import Lock from './models/Lock.js';

// Get correct URI
let mongo_uri = process.env.MONGO_URI;
if (!mongo_uri && config && config.db && config.db.uri) {
  mongo_uri = config.db.uri;
} else {
  mongo_uri = 'mongodb://localhost/shooting-stars_noconfig';
  log.warn(`MongoDB URI not set, using hardcoded default: ${mongo_uri} ...`);
}

// TODO compare with Bluebird
// Set Promise library
mongoose.Promise = Promise;
if (config.log.db) {
  mongoose.set('debug', true);
}


// Database connection

const connect = () => {
  mongoose.connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const conn = mongoose.connection;

  conn.on('error', (err) => {
    log.error('Mongoose default connection error: ' + err);
    process.exit(1)
  });
  return conn;
};

const disconnect = async () => {
  // cleanup
  await Lock.releaseAllFromClient(process.pid)
  log.info('Disconnecting from MongoDB');
  await mongoose.disconnect();
};


export { mongoose, connect, disconnect };
