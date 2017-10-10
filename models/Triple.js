import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import Item             from './Item';
import log              from '../utils/log';

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
  },
  highestItemId: {
    required: true,
    type: Number
  },
  randomSeq: {
    type: 'String',
    required: true
  }
});

/* Sort items by ObjectId, making sure that item order is irrelevant */

TripleSchema.pre('validate', function(next){
  return Item.find()
    .where('_id')
    .in([this.itemA, this.itemB, this.itemC])
    .limit(3)
    .sort([['id', 'ascending']])
    .select('_id id')
    .exec()
    .then(items => {
      this.itemA = items[0]._id;
      this.itemB = items[1]._id;
      this.itemC = items[2]._id;

      this.highestItemId = items[2].id;
      this.randomSeq = createHash('md5').update(this._id.toString()).digest("hex");

      return next();
    })
    .catch(err => {
      log.error(err);
      return next(err);
    });
});

TripleSchema.statics.getUnplayedTriples = function(howMany, players){
  // currently returning *always* the first 10 triples
  // TODO: implement logic which takes into account triples already
  //    played by any of the players and intended distribution
  return Triple.find().limit(howMany).exec();
};

TripleSchema.index({itemA: 1, itemB: 1, itemC: 1}, {unique: true});

module.exports = mongoose.model('Triple', TripleSchema);
