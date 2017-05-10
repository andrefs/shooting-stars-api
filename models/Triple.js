import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Item             from './Item';

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
  Item.find()
    .where('_id')
    .in([this.itemA, this.itemB, this.itemC])
    .limit(3)
    .sort([['id', 'ascending']])
    .select('_id')
    .exec()
    .catch(err => {
      log.error(err);
      return next(err);
    })
    .then(items => {
      this.itemA = items[0]._id;
      this.itemB = items[1]._id;
      this.itemC = items[2]._id;

      return next();
    });
});

TripleSchema.index({itemA: 1, itemB: 1, itemC: 1}, {unique: true});

module.exports = mongoose.model('Triple', TripleSchema);
