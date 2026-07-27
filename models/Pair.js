import mongoose from 'mongoose';
import pagPlugin from 'mongoose-paginate';
import createdModified from 'mongoose-createdmodified';
import { createHash } from 'crypto';
import { log } from '../lib/logger.js';
import Promise from 'bluebird';
import MongooseSequence from 'mongoose-sequence';
import Item from './Item.js';
import Lock from './Lock.js';
import config from '../config/index.cjs';
import Triple from './Triple.js';
import User from './User.js';
import PairSorter from '../lib/PairSorter.js';


mongoose.plugin(pagPlugin);
mongoose.plugin(createdModified.createdModifiedPlugin, { index: true });
const autoIncrement = MongooseSequence(mongoose);

const PairSchema = mongoose.Schema({
  itemA: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  itemB: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  isOrdered: {
    required: true,
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: null
  }
});

PairSchema.plugin(autoIncrement, { id: 'pair_counter', 'inc_field': 'seqNum' });

/* Sort items by ObjectId, making sure that item order is irrelevant */

PairSchema.pre('validate', async function(next) {
  await Item.find()
    .where('_id')
    .in([this.itemA, this.itemB])
    .limit(2)
    .sort([['seqNum', 'ascending']])
    .select('_id seqNum')
    .exec()
    .then(items => {
      this.itemA = items[0]._id;
      this.itemB = items[1]._id;

      return next();
    })
});

PairSchema.methods.cmp = function(otherPair) {
  if (this.itemA.seqNum > otherPair.itemA.seqNum) { return 1; }
  if (this.itemA.seqNum < otherPair.itemA.seqNum) { return -1; }
  if (this.itemB.seqNum > otherPair.itemB.seqNum) { return 1; }
  if (this.itemB.seqNum < otherPair.itemB.seqNum) { return -1; }
  return 0; // this sould never happen
};


PairSchema.statics.rebuildOrder = async function() {
  let lockStart = process.hrtime();
  let lock;
  let err;

  try {
    lock = await Lock.acquire('pairOrder', process.pid);
    let lockWait = process.hrtime(lockStart);
    let rebuildStart = process.hrtime();

    let pairs = await this.estimatedDocumentCount();
    let ord = await this.countDocuments({ isOrdered: true });
    // all pairs are ordered
    if (pairs === ord) {
      // activate next item and rebuild pairs order
      await Item.activateNext()
    }
    await this._rebuildOrder();

    let rebuildTime = process.hrtime(rebuildStart);
    let triples = Triple.countDocuments({ isRelevant: true });
    pairs = await this.find({ isOrdered: true }).select('seqNum order').sort('order').lean()



    log.info(`Pairs order rebuilt, waited ${lockWait}s for the lock and took ${rebuildTime}s to produce ${triples} relevant triples and ${pairs.length} ordered pairs`);
    return Promise.resolve({
      rebuildTime,
      lockWait,
      relevantTriples: triples,
      totalOrderedPairs: pairs.length,
      pairs: pairs.map(p => p.seqNum)
    });
  } catch (e) {
    err = e;
  }
  finally {
    lock && lock.release();
    return err ? Promise.reject(err) : Promise.resolve();
  }
};

PairSchema.statics._rebuildOrder = async function() {
  const u = await User.findOne().sort('-totalGamesPlayed').select('totalGamesPlayed');
  const totalTriples = await Triple.estimatedDocumentCount()
  // triples generated = triples played + current game instance
  const tripGend = ((u.totalGamesPlayed || 0) + 1) * config.game.size;

  if (totalTriples < tripGend + config.game.size) {
    await Item.activateNext()
    await this._rebuildOrder();
    this._order();


  };
}


PairSchema.statics._order = async function() {
  let ps = new PairSorter();
  let tIds;

  let pairs = await this.find().sort('seqNum').lean();

  log.info('Iterating until no pairs can be inserted');
  await this._insertPairs(pairs, ps);

  // reset old order
  await this.updateMany({}, { $set: { isOrdered: false } });
  // save new order
  const updates = ps.keys().map((sn, i) => [{ seqNum: sn }, { order: 1 + i, isOrdered: true }]);

  await Promise.each(updates, ([query, update]) => this.updateOne(query, update));
  const triples = await ps.getRelevantTriples();

  tIds = triples.map(t => t._id);

  await Triple.updateMany({}, { $set: { isRelevant: false } });
  return Triple.updateMany({ _id: { $in: tIds } }, { $set: { isRelevant: true } });
};


PairSchema.statics._insertPairs = function(pairs, ps) {
  if (pairs.length === 0) {
    log.info('There are no pairs to insert');
    return Promise.resolve();
  }

  let unordPairs = [];

  return Promise.each(pairs, p => {
    return ps.tryInsert(p)
      .catch(() => unordPairs.push(p));
  })
    .then(() => {
      if (pairs.length === unordPairs.length) {
        log.info('    no pairs were inserted');
        return Promise.resolve();
      }
      log.info('    total ' + (pairs.length - unordPairs.length) + ' pairs inserted');
      return this._insertPairs(unordPairs, ps);
    });
};

PairSchema.methods._setOrder = function(n) {
  this.order = n;
  this.isOrdered = true;
  return this.save();
};

PairSchema.methods._removeOrder = function() {
  this.order = undefined;
  this.isOrdered = false;
  return this.save();
};


PairSchema.index({ itemA: 1, itemB: 1 }, { unique: true });

export default mongoose.model('Pair', PairSchema);
