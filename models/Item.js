import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import kcomb            from 'foreach-combination';
import {reject}         from 'lodash';
import MongooseSequence from 'mongoose-sequence';
import Triple           from './Triple';

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
    type: 'String',
    required: true
  }
});

ItemSchema.plugin(autoIncrement, {id: 'item_counter', 'inc_field': 'id'});

const generateTriples = (doc, items) => {
  let triples = [];
  const otherItems = reject(items, i => i.id === doc.id);
  kcomb(otherItems, 2, (a,b) => {
    triples.push({
      itemA: doc,
      itemB: a,
      itemC: b,
    });
  });
  return triples;
};

ItemSchema.statics.generateTriples = generateTriples;

ItemSchema.pre('save', function(next){
  this.wasNew = this.isNew;
  return next();
});

ItemSchema.post('save', function(doc, next){
  const createTriples = (item, callback) => {
    let triples = [];
    item.constructor.find().exec((err, items) => {
      const triples = generateTriples(doc, items);
      Triple.create(triples, callback);
    });
  };
  if(doc.wasNew){
    return createTriples(doc, next);
  }
});

module.exports = mongoose.model('Item', ItemSchema);
