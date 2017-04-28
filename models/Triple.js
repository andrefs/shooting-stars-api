'use strict';

import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import mongooseTypeUrl  from 'mongoose-type-url';
import Item             from './Item';
import _                from 'lodash';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const TripleSchema = mongoose.Schema({
  itemA: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Item
  },
  itemB: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Item
  },
  itemC: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Item
  }
});

/* Sort items by ObjectId, making sure that item order is irrelevant */

TripleSchema.pre('validate', function(next){
  console.log('XXXXXXXXXXX 7');
  const compFunc = (a, b) => {
    return a.id > b.id ? 1 : b.id > a.id ? -1 : 0;
  };

  Item.find()
    .where('_id')
    .in([this.itemA, this.itemB, this.itemC])
    .limit(3)
    .sort([['id', 'ascending']])
    .select('_id')
    .exec((err, items) => {
      this.itemA = items[0]._id;
      this.itemB = items[1]._id;
      this.itemC = items[2]._id;

      console.log('XXXXXXXXXXx 8');
      return next();
    });
});


TripleSchema.index({itemA: 1, itemB: 1, itemC: 1}, {unique: true});

module.exports = mongoose.model('Triple', TripleSchema);
