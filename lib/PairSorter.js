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
        return _compareProxy(pairs, items);

        // // TODO _compareProxy
        // const ex = new ProxyRelationException(pairs[0], pairs[1]);
        // return Promise.reject(ex);
      }
      return _compareDirect(pairs, items);
    })
};

const _compareProxy = ([pairAB, pairCD], items) => {
  if(pairAB.seqNum > pairCD.seqNum){
    return _compareProxy([pairCD, pairAB], items)
      .then(res => -res);
  }

  let triples = {};


  let itemA, itemB, itemC, itemD;
  items.forEach(i => {
    if(i.seqNum === pairAB.itemA.seqNum){ itemA = i; }
    if(i.seqNum === pairAB.itemB.seqNum){ itemB = i; }
    if(i.seqNum === pairCD.itemA.seqNum){ itemC = i; }
    if(i.seqNum === pairCD.itemB.seqNum){ itemD = i; }
  });

  const query = {'$or':[
    {itemA: itemA, itemB: itemB, itemC: itemC},
    {itemA: itemA, itemB: itemB, itemC: itemD},
    {itemA: itemA, itemB: itemC, itemC: itemD},
    {itemA: itemB, itemB: itemC, itemC: itemD}
  ]};

  return require('../models/Triple').find(query).limit(4)
    .populate([
      {path: 'itemA', model: 'Item', select: 'seqNum'},
      {path: 'itemB', model: 'Item', select: 'seqNum'},
      {path: 'itemC', model: 'Item', select: 'seqNum'}
    ])
    .then(_triples => {
      _triples.forEach(t => {
        if(t.itemA.seqNum === itemA.seqNum && t.itemB.seqNum === itemB.seqNum && t.itemC.seqNum === itemC.seqNum){
          triples.ABC = t;
        }
        if(t.itemA.seqNum === itemA.seqNum && t.itemB.seqNum === itemB.seqNum && t.itemC.seqNum === itemD.seqNum){
          triples.ABD = t;
        }
        if(t.itemA.seqNum === itemA.seqNum && t.itemB.seqNum === itemC.seqNum && t.itemC.seqNum === itemD.seqNum){
          triples.ACD = t;
        }
        if(t.itemA.seqNum === itemB.seqNum && t.itemB.seqNum === itemC.seqNum && t.itemC.seqNum === itemD.seqNum){
          triples.BCD = t;
        }
      });
    })
    .then(() => {
      // TODO: add other conditions (like minSupport)

      let AB_AC_CD = 0;
      const AB_AC = triples.ABC.picks.AB.count - triples.ABC.picks.AC.count;
      const AC_CD = triples.ACD.picks.AB.count - triples.ACD.picks.BC.count;

      if(AB_AC > 0 && AC_CD > 0){ AB_AC_CD = Math.min(AB_AC, AC_CD); }
      if(AB_AC < 0 && AC_CD < 0){ AB_AC_CD = Math.max(AB_AC, AC_CD); }


      let AB_AD_CD = 0;
      const AB_AD = triples.ABD.picks.AB.count - triples.ABD.picks.AC.count;
      const AD_CD = triples.ACD.picks.AC.count - triples.ACD.picks.BC.count;

      if(AB_AD > 0 && AD_CD > 0){ AB_AD_CD = Math.min(AB_AD, AD_CD); }
      if(AB_AD < 0 && AD_CD < 0){ AB_AD_CD = Math.max(AB_AD, AD_CD); }


      let AB_BC_CD = 0;
      const AB_BC = triples.ABC.picks.AB.count - triples.ABC.picks.BC.count;
      const BC_CD = triples.BCD.picks.AB.count - triples.BCD.picks.BC.count;

      if(AB_BC > 0 && BC_CD > 0){ AB_BC_CD = Math.min(AB_BC, BC_CD); }
      if(AB_BC < 0 && BC_CD < 0){ AB_BC_CD = Math.max(AB_BC, BC_CD); }


      let AB_BD_CD = 0;
      const AB_BD = triples.ABC.picks.AB.count - triples.ABC.picks.BC.count;
      const BD_CD = triples.ABD.picks.AC.count - triples.ABD.picks.BC.count;

      if(AB_BD > 0 && BD_CD > 0){ AB_BD_CD = Math.min(AB_BD, BD_CD); }
      if(AB_BD < 0 && BD_CD < 0){ AB_BD_CD = Math.max(AB_BD, BD_CD); }

      let fwd = 0;
      let bck = 0;

      if(AB_AC_CD > 0){ fwd++; }
      if(AB_AD_CD > 0){ fwd++; }
      if(AB_BC_CD > 0){ fwd++; }
      if(AB_BD_CD > 0){ fwd++; }

      if(AB_AC_CD < 0){ bck++; }
      if(AB_AD_CD > 0){ bck++; }
      if(AB_BC_CD > 0){ bck++; }
      if(AB_BD_CD > 0){ bck++; }

      let res = 0;

      if(fwd > bck){ res = -1; }
      if(bck > fwd){ res =  1; }

      return res;
    });
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
