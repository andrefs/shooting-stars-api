import config   from './config';
import mongoose from 'mongoose';
import log      from './utils/log';

// Database connection

// Get correct URI
let mongo_uri = process.env.MONGO_URI;
if(!mongo_uri && config && config.db && config.db.uri){
    mongo_uri = config.db.uri;
} else {
    mongo_uri = 'mongodb://localhost/shooting-stars_noconfig';
    log.info(`MongoDB URI not set, using hardcoded default: ${mongo_uri} ...`);
}

// TODO compare with Bluebird
// Set Promise library
mongoose.Promise = global.Promise;

mongoose.connect(mongo_uri, {useMongoClient: true});
const db = mongoose.connection;

db.on('error', (err) => {
  log.error('Mongoose default connection error: ' + err);
  process.exit(1)
});
if(process.env.NODE_ENV === 'development'){
  mongoose.set('debug', true);
}

export default db;
