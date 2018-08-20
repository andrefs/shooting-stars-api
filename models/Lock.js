import mongoose from 'mongoose';
import {log}    from '../lib/logger';
import Promise  from 'bluebird';
import {LockNotOwnedException} from '../lib/errors';

const LockSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: {unique: true}
  },
  clientId: {
    type: String,
    required: true
  }
});


LockSchema.statics.acquire = function(lockId, clientId, options = {}){
  return this.findOneAndUpdate(
      {name: lockId},
      {$setOnInsert: {clientId}},
      {new: true, upsert: true}
    )
    .then(lock => {
      if(lock.clientId !== clientId.toString()){
        log.verbose(`Client ${clientId} could not acquire lock ${lockId}, will retry...`);
        return timeoutPromise(options.timeout || 5000)
          .then(() => this.acquire(lockId, clientId, options));
      }
      return Promise.resolve(lock);
    });
};

LockSchema.methods.release = function(){
  return this.constructor.deleteOne({name: this.name, clientId: this.clientId})
    .then(res => {
      if(res.n === 1){
        log.verbose(`Client ${this.clientId} released lock ${this.name}`);
        return Promise.resolve();
        }
      if(res.n === 0){ throw new LockNotOwnedException(); }
      return Promise.reject(res.ok);
    });
};

LockSchema.statics.releaseAllFromClient = function(clientId){
  log.info(`Releasing all locks from client ${clientId}`);
  return this.deleteMany({clientId});
};

function timeoutPromise(delay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
}

module.exports = mongoose.model('Lock', LockSchema);
