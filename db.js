import config   from './config';
import mongoose from 'mongoose';
import log      from './utils/log';

// Database connection

let mongo_uri = process.env.MONGO_URI;
if(!mongo_uri && config && config.db && config.db.uri){
    mongo_uri = config.db.uri;
} else {
    mongo_uri = 'mongodb://localhost/catequil_noconfig';
    log.info(`MongoDB URI not set, using hardcoded default: ${mongo_uri} ...`);
}

let db = mongoose.connect(config.db.uri, {useMongoClient: true});
log.info(`Connection to ${config.db.uri}`);

if(process.env.NODE_ENV === 'development'){
  mongoose.set('debug', true);
}

export default db;
