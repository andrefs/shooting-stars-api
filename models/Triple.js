import mongoose         from 'mongoose';
import Promise          from 'bluebird';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import {createHash}     from 'crypto';
import {log}            from '../lib/logger';
import Pair             from './Pair';
import Item             from './Item';
import max              from 'lodash/max';
import PairSorter       from '../lib/PairSorter';
import {MissingPairsRelationException} from '../lib/errors';

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
    AB: {
      count: {type: Number, default: 0},
      pair:  {type: mongoose.Schema.Types.ObjectId, ref: 'Pair'}
    },
    AC: {
      count: {type: Number, default: 0},
      pair:  {type: mongoose.Schema.Types.ObjectId, ref: 'Pair'}
    },
    BC: {
      count: {type: Number, default: 0},
      pair:  {type: mongoose.Schema.Types.ObjectId, ref: 'Pair'}
    },
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
  return Item.find()
    .where('_id')
    .in([this.itemA, this.itemB, this.itemC])
    .limit(3)
    .sort([['seqNum', 'ascending']])
    .select('_id seqNum')
    .exec()
    .then(items => {
      this.itemA = items[0];
      this.itemB = items[1];
      this.itemC = items[2];

      this.highestItemId = items[2].seqNum;
      this.randomSeq = createHash('md5').update(this._id.toString()).digest("hex");
      this.updateAmbiguity();

      return Pair.find()
      .where({$or:[
          {itemA: this.itemA, itemB: this.itemB},
          {itemA: this.itemA, itemB: this.itemC},
          {itemA: this.itemB, itemB: this.itemC},
        ]})
        .sort([['seqNum', 'ascending']])
        .limit(3)
        .select('_id seqNum');

    })
    .then(pairs => {
      this.picks.AB.pair = pairs[0]._id;
      this.picks.AC.pair = pairs[1]._id;
      this.picks.BC.pair = pairs[2]._id;

      return next();
    });
});

TripleSchema.statics.getUnplayedTriples = function(numTotal, players){
  // currently returning *always* the first 10 triples
  // TODO: implement logic which takes into account triples already
  //    played by any of the players and intended distribution
  return Triple.find().limit(numTotal).exec();
};

TripleSchema.statics.updateTripleScores = function(moves){
  return Promise.map(moves,
    m => m.populate({
        path:'triple',
        model:'Triple',
        //populate:[
        //  {path: 'picks.AB', model: PickSchema},
        //  {path: 'picks.AC', model: PickSchema},
        //  {path: 'picks.BC', model: PickSchema},
        //]
        }).execPopulate()
    ).then(moves => {
      moves.forEach(m => m.triple.addPick(m.pick));
      return Promise.map(moves, m => m.triple.save());
    });
};

// TODO use update $set and post('find') hook
TripleSchema.methods.addPick = function(pick){
  this.picks[pick].count++;
  this.support++;
  this.updateAmbiguity();
  return this;
};

TripleSchema.methods.updateAmbiguity = function(){
  this.ambiguity = max([
    this.picks.AB.count,
    this.picks.AC.count,
    this.picks.BC.count,
  ]);
  return this;
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


TripleSchema.statics._insertPairs = function(pairs, numTotal, created, ps){
  if(pairs.length === 0){ return Promise.resolve(); }

  const p = pairs.shift();
  return ps.tryInsert(p)
    .catch(e => {
      if(e instanceof MissingPairsRelationException){
        let triples = e.getTriples();
        return this.insertMany(triples, {ordered: false})
          .then(triples => created.push(...triples))
          .catch(e => {
            e.writeErrors.forEach(err => { triples[e.index] = null; });
            triples.forEach(t => { if(t){ created.push(t); } });
          });
      } else {
        throw e;
      }
    })
    .finally(() => {
      if(created.length < numTotal && pairs.length){
        return this._insertPairs(pairs, numTotal, created, ps);
      }
      return Promise.resolve();
   });
};

TripleSchema.statics._insertStable = function(numTotal, triples, ps){
  return Pair.find({status: 'stable'})
    .then(pairs => this._insertPairs(pairs, numTotal, triples, ps));
};

TripleSchema.statics._insertCandidates = function(numTotal, triples, ps){
  return Pair.find({status: 'candidate'})
    .then(pairs => this._insertPairs(pairs, numTotal, triples, ps));
};

TripleSchema.statics._addNextCandidate = function(numTotal, triples, ps){
  return Pair.addNextCandidate()
    .then(p =>  this._insertPairs(p ? [p] : [], numTotal, triples, ps))
    .then(() => {
      if(triples.length < numTotal){ return this._addNextCandidate(numTotal, triples, ps); }
      return Promise.resolve(triples);
    });
};

// condicao: triples.length < numTotal
// cond failed: Promise.resolve()
// cond true: f -> pairs -> insertPairs

TripleSchema.statics._generateNewTriples = function(numTotal, created, ps, methods){
  const self = this;
  if(methods.length === 0){ return Promise.resolve(created); }

  return methods.shift().call(this, numTotal, created, ps)
    .then(() => {
      if(numTotal === created.length){ return Promise.resolve(created); }
      return this._generateNewTriples(numTotal, created, ps, methods);
    })
};

TripleSchema.statics.generateNew = function(numTotal){
  let created = [];
  let ps      = new PairSorter();

  return this._generateNewTriples(numTotal, created, ps, [
    this._insertStable,
    this._insertCandidates,
    this._addNextCandidate
  ]);
};

TripleSchema.index({itemA: 1, itemB: 1, itemC: 1}, {unique: true});

module.exports = mongoose.model('Triple', TripleSchema);
