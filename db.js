import config   from './config';
import mongoose from 'mongoose';

// Database connection

let mongo_uri = process.env.MONGO_URI;
if(!mongo_uri && config && config.db && config.db.uri){
    mongo_uri = config.db.uri;
} else {
    mongo_uri = 'mongodb://localhost/catequil_noconfig';
    log.info(`MongoDB URI not set, using hardcoded default: ${mongo_uri} ...`);
}

let db = mongoose.connect(config.db.uri).connection;
db.on('error', function(err) {
  log.error('Mongoose default connection error: ' + err)
  process.exit(1)
});
if(process.env.NODE_ENV === 'development'){
  mongoose.set('debug', true);
}

export default db;
