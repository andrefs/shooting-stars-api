import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Pair             from './Pair';
import Item             from './Item';
import _                from 'lodash';
import config           from '../config';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const RelationSchema = mongoose.Schema({
  pair1: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Pair
  },
  pair2: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Pair
  },
  choicesPair1: {
    type: Number,
    default: 0
  },
  choicesPair2: {
    type: Number,
    default: 0
  },
  confidence: {
    type: Number,
    default: 0
  },
  support: {
    type: Number,
    default: 0
  },
  highestItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: Item
  }
});


RelationSchema.pre('validate', function(next){
  return this.populate([
    {path:'pair1', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
    {path:'pair2', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
  ]).execPopulate()
  .then(doc => {
    // sort pairs by items ids
    const ord = [this.pair1, this.pair2].sort((a, b) => a.cmp(b));
    this.pair1 = ord[0];
    this.pair2 = ord[1];

    this.confidence = Math.abs(this.choicesPair1 - this.choicesPair2);
    this.support = this.choicesPair1 + this.choicesPair2;
    this.highestItem = this.pair1.itemB.id > this.pair2.itemB.id ?
      this.pair1.itemB : this.pair2.itemB;

    return next();
  });
});

// RelationSchema.statics.addChoice = function(pair1, pair2){
//   const ord = [pair1, pair2].sort((a, b) => a.cmp(b));
// 
//   // find existing or create
//   return this.findOne({pair1: ord[0], pair2: ord[1]})
//     .then(rel => {
//       if(!rel) return new this({pair1: ord[0], pair2: ord[1]});
//     })
//     .then(rel => {
//       if(rel.pair1._id === ord[0]){
//         rel.choicesPair1++;
//       } else {
//         rel.choicesPair2++;
//       }
//       return rel.save();
//     });
// }

RelationSchema.index({pair1: 1, pair2: 1}, {unique: true});

module.exports = mongoose.model('Relation', RelationSchema);

