import config   from './config';
import mongoose from 'mongoose';
import Promise  from 'bluebird';
import {log}    from './lib/logger';
import Lock     from './models/Lock';

// Get correct URI
let mongo_uri = process.env.MONGO_URI;
if(!mongo_uri && config && config.db && config.db.uri){
    mongo_uri = config.db.uri;
} else {
    mongo_uri = 'mongodb://localhost/shooting-stars_noconfig';
    log.warn(`MongoDB URI not set, using hardcoded default: ${mongo_uri} ...`);
}

// TODO compare with Bluebird
// Set Promise library
mongoose.Promise = Promise;
if(config.log.db){
  mongoose.set('debug', true);
}


// Database connection

const connect = () => {
  mongoose.connect(mongo_uri, {useNewUrlParser: true});
  const conn = mongoose.connection;

  conn.on('error', (err) => {
    log.error('Mongoose default connection error: ' + err);
    process.exit(1)
  });
  return conn;
};

const disconnect = () => {
  // cleanup
  return Lock.releaseAllFromClient(process.pid)
    .then(() => {
      log.info('Disconnecting from MongoDB');
      mongoose.disconnect();
    });
};


export {mongoose, connect, disconnect};
