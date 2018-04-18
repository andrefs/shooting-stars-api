import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

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
});

/* Sort items by ObjectId, making sure that item order is irrelevant */

PairSchema.pre('validate', function(next){
  return require('./Item').find()
    .where('_id')
    .in([this.itemA, this.itemB])
    .limit(2)
    .sort([['id', 'ascending']])
    .select('_id id')
    .exec()
    .then(items => {
      this.itemA = items[0]._id;
      this.itemB = items[1]._id;

      return next();
    })
});

PairSchema.methods.cmp = function(otherPair){
  if(this.itemA.id > otherPair.itemA.id){ return  1; }
  if(this.itemA.id < otherPair.itemA.id){ return -1; }
  if(this.itemB.id > otherPair.itemB.id){ return  1; }
  if(this.itemB.id < otherPair.itemB.id){ return -1; }
  return 0; // this sould never happen
};


PairSchema.index({itemA: 1, itemB: 1}, {unique: true});

module.exports = mongoose.model('Pair', PairSchema);
