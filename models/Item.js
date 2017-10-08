import mongoose         from '../utils/mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import kcomb            from 'foreach-combination';
import {reject}         from 'lodash';
import MongooseSequence from 'mongoose-sequence';

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

ItemSchema.pre('save', function(next){
  this.wasNew = this.isNew;
  return next();
});

ItemSchema.post('save', function(doc, next){
  const generateTriples = (item, callback) => {
    let triples = [];
    item.constructor.find().exec((err, items) => {
      const otherItems = reject(items, i => i.id === doc.id);
      kcomb(otherItems, 2, (a,b) => {
        triples.push({
          itemA: doc,
          itemB: a,
          itemC: b,
        });
      });
      require('./Triple').create(triples, callback);
    });
  };
  if(doc.wasNew){
    return generateTriples(doc, next);
  }
});

module.exports = mongoose.model('Item', ItemSchema);
