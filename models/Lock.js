import mongoose from 'mongoose';
import { log } from '../lib/logger';
import Promise from 'bluebird';
import { LockNotOwnedException } from '../lib/errors';

const LockSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: { unique: true }
  },
  clientId: {
    type: String,
    required: true
  },
  execId: {
    type: String,
    required: true
  }
});


LockSchema.statics.acquire = async function(lockId, clientId, options = {}) {
  const execId = 0 + Date.now();


  const lock = await this.findOneAndUpdate(
    { name: lockId },
    { $setOnInsert: { clientId, execId } },
    { new: true, upsert: true }
  );
  if (lock.clientId === clientId.toString() && lock.execId === execId.toString()) {
    log.verbose(`Client ${clientId} acquired lock ${lockId} with execId ${execId}`);
    return lock;
  }

  log.verbose(`Client ${clientId} could not acquire lock ${lockId}, will retry...`);
  await timeoutPromise(options.timeout || 5000);

  return this.acquire(lockId, clientId, options);
};

LockSchema.methods.release = function() {
  return this.constructor.deleteOne({
    name: this.name,
    clientId: this.clientId,
    execId: this.execId
  })
    .then(res => {
      if (res.n === 1) {
        log.verbose(`Client ${this.clientId} released lock ${this.name} with execId ${this.execId}`);
        return Promise.resolve();
      }
      if (res.n === 0) { throw new LockNotOwnedException(); }
      return Promise.reject(res.ok);
    });
};

LockSchema.statics.releaseAllFromClient = function(clientId) {
  log.info(`Releasing all locks from client ${clientId}`);
  return this.deleteMany({ clientId });
};

function timeoutPromise(delay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
}

module.exports = mongoose.model('Lock', LockSchema);
