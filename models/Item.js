import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
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

// const generatePairs = (doc, items) => {
//   let pairs = [];
//   const otherItems = reject(items, i => i.id === doc.id);
//   kcomb(otherItems, 2, (a,b) => {
//     triples.push({
//       itemA: doc,
//       itemB: a,
//     });
//   });
//   return triples;
// }


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
