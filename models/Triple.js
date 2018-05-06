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
      pair:  {type: mongoose.Schema.Types.ObjectId,ref: 'Pair'}
    },
    AC: {
      count: {type: Number, default: 0},
      pair:  {type: mongoose.Schema.Types.ObjectId,ref: 'Pair'}
    },
    BC: {
      count: {type: Number, default: 0},
      pair:  {type: mongoose.Schema.Types.ObjectId,ref: 'Pair'}
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

TripleSchema.statics.getUnplayedTriples = function(howMany, players){
  // currently returning *always* the first 10 triples
  // TODO: implement logic which takes into account triples already
  //    played by any of the players and intended distribution
  return Triple.find().limit(howMany).exec();
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


const _insertPairs = (pairs, howMany, triples, ps) => {
  if(pairs.length === 0){ return Promise.resolve(); }

  return ps.tryInsert(pairs.shift())
    .catch(e => triples.push(...e.getTriples()))
    .finally(() => {
      if(triples.length < howMany && pairs.length){
        return _insertPairs(pairs, howMany, triples, ps);
      }
      return Promise.resolve();
   });
};

const _insertStable = (howMany, triples, ps) => {
  return Pair.find({status: 'stable'})
    .then(pairs => _insertPairs(pairs, howMany, triples, ps));
};

const _insertCandidates = (howMany, triples, ps) => {
  return Pair.find({status: 'candidate'})
    .then(pairs => _insertPairs(pairs, howMany, triples, ps));
};

const _addNextCandidate = (howMany, triples, ps) => {
  return Pair.addNextCandidate()
    .then(p =>  _insertPairs(p ? [p] : [], howMany, triples, ps))
    .then(() => {
      if(triples.length < howMany){ return _addNextCandidate(howMany, triples, ps); }
      return Promise.resolve(triples);
    });
};

// condicao: triples.length < howMany
// cond failed: Promise.resolve()
// cond true: f -> pairs -> insertPairs

TripleSchema.statics._generateNewTriples = function(howMany, triples, ps, methods){
  if(methods.length === 0){ return Promise.resolve(triples); }

  return methods.shift()(howMany, triples, ps)
    .then(() => {
      if(howMany === triples.length){ return Promise.resolve(triples); }
      return this._generateNewTriples(howMany, triples, ps, methods);
    })
};

TripleSchema.statics.generateNew = function(howMany){
  let triples = [];
  let ps      = new PairSorter();

  return this._generateNewTriples(howMany, triples, ps, [
    _insertStable,
    _insertCandidates,
    _addNextCandidate
  ])
  .then(triples => this.create(triples));
};

TripleSchema.index({itemA: 1, itemB: 1, itemC: 1}, {unique: true});

module.exports = mongoose.model('Triple', TripleSchema);
