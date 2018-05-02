import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {reject}         from 'lodash';
import MongooseSequence from 'mongoose-sequence';
import Pair             from './Pair';
import Promise  from 'bluebird';
import {NoMoreItemsError}  from '../lib/errors';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});
const autoIncrement = MongooseSequence(mongoose);

const ItemSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  imageUrl: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false,
    required: true
  }
});

ItemSchema.plugin(autoIncrement, {id: 'item_counter', 'inc_field': 'seqNum'});

const generatePairs = (doc, otherItems) => {
  if(otherItems.length < 1){ return []; }
  return otherItems.map(other => ({
    itemA: doc,
    itemB: other
  }));
};

ItemSchema.pre('save', function(next){
  this.wasNew = this.isNew;
  return next();
});

ItemSchema.statics.activateNext = function(){
  return Promise.join(
    this.findOne({isActive: false}).sort('seqNum').exec(),
    this.find({isActive:true}).exec()
  )
  .then(([newItem, oldItems]) => {
    if(!newItem){ return Promise.reject(new NoMoreItemsError()); }
    const pairs = generatePairs(newItem, oldItems || []);
    return Promise.join(
      newItem.update({$set: {isActive:true}}),
      Pair.create(pairs)
    );
  })
};

module.exports = mongoose.model('Item', ItemSchema);
