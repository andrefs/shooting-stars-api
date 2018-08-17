import mongoose from 'mongoose';
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
  return this.findOne({name: lockId})
    .then(lock => {
      if(!lock){ return this.create({name: lockId, clientId}); }
      return timeoutPromise(options.timeout || 5000)
        .then(() => this.acquire(lockId, clientId, options));
    });
};

LockSchema.methods.release = function(){
  return this.constructor.deleteOne({name: this.name, clientId: this.clientId})
    .then(res => {
      if(res.n === 1){ return Promise.resolve(); }
      if(res.n === 0){ throw new LockNotOwnedException(); }
      return Promise.reject(res.ok);
    });
};

function timeoutPromise(delay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
}

module.exports = mongoose.model('Lock', LockSchema);
