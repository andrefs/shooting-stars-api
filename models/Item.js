import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {reject}         from 'lodash';
import MongooseSequence from 'mongoose-sequence';
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

const generateTriples = (doc, otherItems) => {
  let triples = [];
  if(otherItems.length < 2){ return []; }
  for(let i=0; i<otherItems.length-1; i++){
    for(let j=i+1; j<otherItems.length; j++){
      triples.push({
        itemA: doc,
        itemB: otherItems[i],
        itemC: otherItems[j]
      });
    }
  }
  return triples;
};

ItemSchema.statics.activateNext = function(){
  let newItem;
  let oldItems;

  return Promise.join(
    this.findOne({isActive: false}).sort('seqNum').exec(),
    this.find({isActive:true}).exec()
  )
  .then(([_newItem, _oldItems]) => {
    newItem  = _newItem;
    oldItems = _oldItems;
    if(!newItem){ return Promise.reject(new NoMoreItemsError()); }
    return newItem.update({$set: {isActive:true}});
  })
  .then(() => this.findOne({_id: newItem._id}))
  .then(_item => {
    newItem = _item;
    const pairs   = generatePairs(newItem,   oldItems || []);
    return require('./Pair').create(pairs);
  })
  .then(() => {
    const triples = generateTriples(newItem, oldItems || []);
    return require('./Triple').create(triples)
  });
};

module.exports = mongoose.model('Item', ItemSchema);
