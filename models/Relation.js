import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Promise          from 'bluebird';
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

RelationSchema.statics.extractChoicesFromMoves = function(moves){
  let relations = [];
  return Promise.mapSeries(moves,
      m => m.populate({path: 'triple', model: 'Triple'})
            .execPopulate()
            .then(m => m.triple.getPairs()))
    .then(pairsList => {
      moves.forEach((m, i) => {
        const pairs = pairsList[i];
        if(m.pick === 'AB'){
          relations.push([pairs[0], pairs[1]]);
          relations.push([pairs[0], pairs[2]]);
        }
        if(m.pick === 'AC'){
          relations.push([pairs[1], pairs[0]]);
          relations.push([pairs[1], pairs[2]]);
        }
        if(m.pick === 'BC'){
          relations.push([pairs[2], pairs[0]]);
          relations.push([pairs[2], pairs[1]]);
        }
      });

      return Promise.mapSeries(relations, r => this.addChoice(r[0], r[1]));
    }
  );
};

RelationSchema.statics.addChoice = function(pair1, pair2){
  const popArgs = [{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}];
  const ord = [pair1, pair2].sort((a, b) => a.cmp(b));

  return Promise.join(ord[0].populate(popArgs), ord[1].populate(popArgs))
  .then(() => {
    // find existing or create
    return this.findOne({pair1: ord[0], pair2: ord[1]})
      .then(rel => {
        return rel ? Promise.resolve(rel) : this.create({pair1: ord[0], pair2: ord[1]});
      })
  })
  .then(rel => rel.populate([
    {path:'pair1', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
    {path:'pair2', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
  ]).execPopulate())
  .then(rel => {
    if(rel.pair1._id.equals(pair1._id)){ rel.choicesPair1++; }
    else { rel.choicesPair2++; }
    return rel.save();
  });
}

RelationSchema.statics.printAll = function(){
  this.find().populate([
    {path:'pair1', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
    {path:'pair2', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
  ]).exec()
  .then(rels => {
    rels.forEach(r => {
      console.log([r.pair1.itemA.id,r.pair1.itemB.id],[r.pair2.itemA.id,r.pair2.itemB.id]);
      console.log('    confidence:', r.confidence);
      console.log('    support:   ', r.support);
    });
  });
};

RelationSchema.index({pair1: 1, pair2: 1}, {unique: true});

module.exports = mongoose.model('Relation', RelationSchema);

