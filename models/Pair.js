import mongoose from 'mongoose';
import pagPlugin from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified from 'mongoose-createdmodified';
import { createHash } from 'crypto';
import { log } from '../lib/logger';
import Promise from 'bluebird';
import MongooseSequence from 'mongoose-sequence';
import Item from './Item';
import Lock from './Lock';
import config from '../config';


mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
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

PairSchema.pre('validate', function(next) {
  return require('./Item').find()
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


PairSchema.statics.rebuildOrder = function() {
  let lock;
  let lockStart;
  let rebuildStart;
  let lockWait;
  let rebuildTime;

  lockStart = process.hrtime();
  return Lock.acquire('pairOrder', process.pid)
    .then(_l => {
      lockWait = process.hrtime(lockStart);
      rebuildStart = process.hrtime();
      lock = _l;
      return Promise.join(
        this.estimatedDocumentCount(),
        this.countDocuments({ isOrdered: true })
      );
    })
    .then(([pairs, ord]) => {
      // all pairs are ordered
      if (pairs === ord) {
        // activate next item and rebuild pairs order
        return Item.activateNext()
          .then(() => this._rebuildOrder());
      }
      return this._rebuildOrder();
    })
    .then(res => {
      rebuildTime = process.hrtime(rebuildStart);
      return Promise.join(
        require('./Triple').countDocuments({ isRelevant: true }),
        this.find({ isOrdered: true }).select('seqNum order').sort('order').lean()
      );
    })
    .then(([triples, pairs]) => {
      log.info(`Pairs order rebuilt, waited ${lockWait}s for the lock and took ${rebuildTime}s to produce ${triples} relevant triples and ${pairs.length} ordered pairs`);
      return Promise.resolve({
        rebuildTime,
        lockWait,
        relevantTriples: triples,
        totalOrderedPairs: pairs.length,
        pairs: pairs.map(p => p.seqNum)
      });
    })
    .finally(() => lock ? lock.release() : Promise.resolve());
};

PairSchema.statics._rebuildOrder = function() {
  return Promise.join(
    require('./User').findOne().sort('-totalGamesPlayed').select('totalGamesPlayed'),
    require('./Triple').estimatedDocumentCount()
  )
    .then(([u, totalTriples]) => {
      // triples generated = triples played + current game instance
      const tripGend = ((u.totalGamesPlayed || 0) + 1) * config.game.size;

      if (totalTriples < tripGend + config.game.size) {
        return Item.activateNext()
          .then(() => this._rebuildOrder());
      }
      return this._order();
    });
};


PairSchema.statics._order = function() {
  const PairSorter = require('../lib/PairSorter').default;
  let ps = new PairSorter();
  let tIds;

  return this.find().sort('seqNum').lean()
    .then(pairs => {
      log.info('Iterating until no pairs can be inserted');
      return this._insertPairs(pairs, ps);
    })
    // reset old order
    .then(() => this.updateMany({}, { $set: { isOrdered: false } }))
    // save new order
    .then(() => {
      const updates = ps.keys()
        .map((sn, i) => [{ seqNum: sn }, { order: 1 + i, isOrdered: true }]);
      return Promise.each(updates, ([query, update]) => this.update(query, update));
    })
    .then(() => ps.getRelevantTriples())
    .then(triples => {
      tIds = triples.map(t => t._id);
      return require('./Triple').updateMany({}, { $set: { isRelevant: false } });
    })
    .then(() => require('./Triple').updateMany({ _id: { $in: tIds } }, { $set: { isRelevant: true } }));
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

module.exports = mongoose.model('Pair', PairSchema);
