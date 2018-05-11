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
  status: {
    required: true,
    type: String,
    default: 'unplayed',
    enum: ['candidate', 'stable', 'unplayed']
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


PairSchema.statics.addNextCandidate = function(){
  return this.findOne({status: 'unplayed'}).sort('seqNum').exec()
    .then(pair => {
      if(!pair){
        return require('./Item').activateNext()
          .then(() => this.addNextCandidate());
      }
      return this.findOneAndUpdate(
        {seqNum: pair.seqNum},
        {$set: {status: 'candidate'}}, {new: true}
      );
    })
};

PairSchema.methods.markAsCandidate = function(){
  return this.constructor.findOneAndUpdate(
    {seqNum: this.seqNum},
    {$set: {status: 'candidate'}}, {new: true}
  );
};

PairSchema.methods.markAsStable = function(){
  return this.constructor.findOneAndUpdate(
    {seqNum: this.seqNum},
    {$set: {status: 'stable'}}, {new: true}
  );
};

PairSchema.index({itemA: 1, itemB: 1}, {unique: true});

module.exports = mongoose.model('Pair', PairSchema);
