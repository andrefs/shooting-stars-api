import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';
import Promise          from 'bluebird';
import MongooseSequence from 'mongoose-sequence';
import Item from './Item';
import Lock from './Lock';
import config from '../config';


mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});
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

PairSchema.plugin(autoIncrement, {id: 'pair_counter', 'inc_field': 'seqNum'});

/* Sort items by ObjectId, making sure that item order is irrelevant */

PairSchema.pre('validate', function(next){
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

PairSchema.methods.cmp = function(otherPair){
  if(this.itemA.seqNum > otherPair.itemA.seqNum){ return  1; }
  if(this.itemA.seqNum < otherPair.itemA.seqNum){ return -1; }
  if(this.itemB.seqNum > otherPair.itemB.seqNum){ return  1; }
  if(this.itemB.seqNum < otherPair.itemB.seqNum){ return -1; }
  return 0; // this sould never happen
};


PairSchema.statics.rebuildOrder = function(){
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
        this.countDocuments({isOrdered: true})
      );
    })
    .then(([pairs, ord]) => {
      if(pairs === ord){
        return Item.activateNext()
          .then(() => this._rebuildOrder());
      }
      return this._rebuildOrder();
    })
    .then(res => {
      rebuildTime = process.hrtime(rebuildStart);
      return Promise.join(
        require('./Triple').countDocuments({isRelevant: true}),
        this.countDocuments({isOrdered: true})
      );
    })
    .then(([triples, pairs]) => {
      log.info(`Pairs order rebuilt, waited ${lockWait}s for the lock and took ${rebuildTime}s to produce ${triples} relevant triples and ${pairs} ordered pairs`);
      return Promise.resolve({
        rebuildTime,
        lockWait,
        relevantTriples: triples,
        orderedPairs: pairs
      });
    })
    .catch(err => log.error('XXXXXXXXXXXXXXXXXXX ERR', err))
    .finally(() => lock.release());
};

PairSchema.statics._rebuildOrder = function(){
  return Promise.join(
    require('./User').findOne().sort('-totalGamesPlayed').select('totalGamesPlayed'),
    require('./Triple').estimatedDocumentCount()
  )
  .then(([u, totalTriples]) => {
    // triples generated = triples played + current game instance
    const tripGend = ((u.totalGamesPlayed || 0)+1) * config.game.size;

    if(totalTriples < tripGend + config.game.size){
      return Item.activateNext()
        .then(() => this._rebuildOrder());
    }
    return this._order();
  });
};


PairSchema.statics._order = function(){
  const PairSorter = require('../lib/PairSorter').default;
  let ps = new PairSorter();
  let tIds;

  return Promise.join(
    this.find({isOrdered:  true}).sort('order seqNum'),
    this.find({isOrdered: false}).sort('seqNum')
  )
  .then(([ord, unord]) => this._insertPairs([...ord, ...unord], 0, ps))
  .then(() => ps.getRelevantTriples())
  .then(triples => {
    tIds = triples.map(t => t._id);
    return require('./Triple').update({}, {$set: {isRelevant: false}}, {multi:true});
  })
  .then(() => require('./Triple').update({_id: {$in: tIds}}, {$set:{isRelevant:true}}, {multi:true}));
};


PairSchema.statics._insertPairs = function(pairs, order, ps){
  if(pairs.length === 0){ return Promise.resolve(); }

  const p = pairs.shift();
  return ps.tryInsert(p)
    .then(() => {
      order++;
      return p._setOrder(order);
    })
    .catch(()   => p._removeOrder())
    .finally(() => this._insertPairs(pairs, order, ps));
};

PairSchema.methods._setOrder = function(n){
  this.order = n;
  this.isOrdered = true;
  return this.save();
};

PairSchema.methods._removeOrder = function(){
  this.order = undefined;
  this.isOrdered = false;
  return this.save();
};


PairSchema.index({itemA: 1, itemB: 1}, {unique: true});

module.exports = mongoose.model('Pair', PairSchema);
