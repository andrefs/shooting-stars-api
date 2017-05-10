import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import kcomb            from 'foreach-combination';
import autoIncrement    from 'mongoose-sequence';
import {createHash}     from 'crypto';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

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
  },
  random: {
    type: 'String',
    required: true
  }
});

ItemSchema.pre('validate', function(next){
  this.random = createHash('md5').update(this._id.toString()).digest("hex");
  return next();
});

ItemSchema.plugin(autoIncrement, {id: 'item_counter', 'inc_field': 'id'});

ItemSchema.pre('save', function(next){
  this.wasNew = this.isNew;
  return next();
});

ItemSchema.post('save', function(doc){
  const generateTriples = (item, callback) => {
    let triples = [];
    item.constructor.find().exec((err, items) => {
      kcomb(items, 3, (a,b,c) => {
        triples.push({
          itemA: a,
          itemB: b,
          itemC: c,
        });
      });
      require('./Triple').create(triples, callback);
    });
  };
  if(doc.wasNew){
    return generateTriples(doc);
  }
});

module.exports = mongoose.model('Item', ItemSchema);
