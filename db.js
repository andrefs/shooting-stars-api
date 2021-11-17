import config   from './config';
import mongoose from 'mongoose';
import Promise  from 'bluebird';
import {log}    from './lib/logger';
import Lock     from './models/Lock';

// Get correct URI
let auth = '';
if(config.db.user){ auth += user+':'; }
if(config.db.pass){ auth += pass+'@' }
const uri = `mongodb://${auth}${config.db.host}:${config.db.port}/${config.db.name}`

// TODO compare with Bluebird
// Set Promise library
mongoose.Promise = Promise;
if(config.log.db){
  mongoose.set('debug', true);
}


// Database connection

const connect = () => {
  mongoose.connect(uri, {useNewUrlParser: true});
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
