import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';
import MongooseSequence from 'mongoose-sequence';

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
};


PairSchema.statics._order = function(){
  let ps = new PairSorter();

  return Promise.join(
    this.find({isOrdered:  true}).sort('order seqNum'),
    this.find({isOrdered: false}).sort('seqNum')
  )
  .then(([ord, unord]) => this._insertPairs([...ord, ...unord], 0, ps))
  .then(() => {
    const relevantPairs = ps.getRelevantPairs()
    return relevantPairs;
  });
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
