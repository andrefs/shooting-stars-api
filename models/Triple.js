import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';
import Pair             from './Pair';
import max              from 'lodash/max';


const PickSchema = mongoose.Schema({
  // TODO do we need this?
  // pair: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Pair',
  //   required: true
  // },
  count: {
    type: 'Number',
    default: 0
  }
});

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const TripleSchema = mongoose.Schema({
  itemA: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  itemB: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  itemC: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  support: {
    type: 'Number',
    default: 0,
  },
  picks: {
    type: {
      AB: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: PickSchema
      },
      AC: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: PickSchema
      },
      BC: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: PickSchema
      },
    },
    required: true,
    default: {
      AB: 0,
      AC: 0,
      BC: 0,
    }
  },
  ambiguity: {
    type: 'Number',
    default: 0
  },

  // ---------------------------
  highestItemId: {
    required: true,
    type: Number
  },
  randomSeq: {
    type: 'String',
    required: true
  },
});

/* Sort items by ObjectId, making sure that item order is irrelevant */

TripleSchema.pre('validate', function(next){
  return require('./Item').find()
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
    });
});

TripleSchema.statics.getUnplayedTriples = function(howMany, players){
  // currently returning *always* the first 10 triples
  // TODO: implement logic which takes into account triples already
  //    played by any of the players and intended distribution
  return Triple.find().limit(howMany).exec();
};

TripleSchema.statics.updateTripleScores = function(moves){
  return Promise.map(moves,
    r => m.populate({
        path:'triple',
        model:'Triple',
        populate:[
          {path: 'picks.AB', model: PickSchema},
          {path: 'picks.AC', model: PickSchema},
          {path: 'picks.BC', model: PickSchema},
        ]
        })
    ).then(moves => {
      moves.forEach(m => m.triple.updatePicks(m.pick))
      return Promise.map(moves, m => m.triple.save());
    });
};

// TODO use update $set and post('find') hook
TripleSchema.methods.updatePicks = function(pick){
  this.picks[pick].count++;
  this.support++;
  this.ambiguity = max([
    this.picks.AB.count,
    this.picks.AC.count,
    this.picks.BC.count,
  ]);
};

TripleSchema.methods.getPairs = function(){
  return Pair.find({
      '$or': [
        {itemA: this.itemA, itemB: this.itemB},
        {itemA: this.itemA, itemB: this.itemC},
        {itemA: this.itemB, itemB: this.itemC}
      ]
    }).limit(3).populate([{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}])
    .then(pairs => pairs.sort((a, b) => a.cmp(b)));
};

TripleSchema.index({itemA: 1, itemB: 1, itemC: 1}, {unique: true});

module.exports = mongoose.model('Triple', TripleSchema);
