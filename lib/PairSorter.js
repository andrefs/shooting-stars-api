import Tree from '../../avl-promise';
import uniqBy from 'lodash/uniqBy';
import Pair from '../models/Pair';
import Promise from 'bluebird';
import {MissingPairsRelationException,
  ProxyRelationException} from '../lib/errors';

const compare = (p1, p2) => {
  let items;
  let pairs;

  return _getPairs(p1, p2)
    .then(_pairs => {
      pairs = _pairs;
      items = _uniqItems(pairs);

      if(items.length === 4){
        // TODO _compareProxy
        const ex = new ProxyRelationException(pairs[0], pairs[1]);
        return Promise.reject(ex);
      }
      return _compareDirect(pairs, items);
    })
};


const _getPairs = (key1, key2) => {
  let pairs;

  return Pair.find({$or: [{seqNum: key1}, {seqNum: key2}]})
    .populate([{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}])
    .limit(2)
    .exec()
    .then(_pairs => {
      pairs = key1 === _pairs[0].seqNum ? _pairs : [_pairs[1], _pairs[0]];
      return pairs;
    });
};

const _uniqItems = pairs => {
  const allItems = [
    pairs[0].itemA,
    pairs[0].itemB,
    pairs[1].itemA,
    pairs[1].itemB
  ];
  return uniqBy(allItems, a => a.seqNum).sort((a, b) => a.seqNum - b.seqNum);
};

const _compareDirect = (pairs, items) => {
  const query = {itemA: items[0], itemB: items[1], itemC: items[2]};
  return require('../models/Triple').findOne(query)
    .populate([
      {path:'itemA', model: 'Item', select: '_id seqNum'},
      {path:'itemB', model: 'Item', select: '_id seqNum'},
      {path:'itemC', model: 'Item', select: '_id seqNum'},
      {path:'picks.AB.pair', model: 'Pair', select: '_id seqNum'},
      {path:'picks.AC.pair', model: 'Pair', select: '_id seqNum'},
      {path:'picks.BC.pair', model: 'Pair', select: '_id seqNum'},
    ]).exec()
    .then(triple => {
      if(!triple){
        const ex = new MissingPairsRelationException(pairs[0], pairs[1]);
        return Promise.reject(ex);
      }

      const seqNumAB = triple.picks.AB.pair.seqNum;
      const picksAB  = triple.picks.AB.count;
      const seqNumAC = triple.picks.AC.pair.seqNum;
      const picksAC  = triple.picks.AC.count;
      const seqNumBC = triple.picks.BC.pair.seqNum;
      const picksBC  = triple.picks.BC.count;

      const picksP1 = pairs[0].seqNum === seqNumAB ? picksAB :
                      pairs[0].seqNum === seqNumAC ? picksAC :
                      picksBC;

      const picksP2 = pairs[1].seqNum === seqNumAB ? picksAB :
                      pairs[1].seqNum === seqNumAC ? picksAC :
                      picksBC;

      return picksP2 - picksP1;
    });
}

export default class PairSorter {
  constructor() {
    this.tree = new Tree(compare);
  }

  tryInsert(newItem){
    try {
      const res = this.tree.insert(newItem.seqNum);
      return Promise.resolve(res);
    } catch(e){
      return Promise.reject(e);
    }
  }

  values(){
    return this.tree.values();
  }

  keys(){
    return this.tree.keys();
  }

}
