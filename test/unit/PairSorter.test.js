import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import PairSorter from '../../lib/PairSorter';
import mongoose from 'mongoose';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');
import {ProxyRelationException,
  MissingPairsRelationException} from '../../lib/errors';

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('PairSorter', () => {
  const imageUrl = 'http://ww.example.com';
  let items;
  let pairs;

  beforeEach(() => {
    return Promise.join(
      Item.remove().exec(),
      Pair.remove().exec(),
      Triple.remove().exec(),
    )
    .then(() => Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl},
        {name: 'fourth item', imageUrl}
      ], itemF => Item.create(itemF)))
    .then(() => Item.activateNext())
    .then(() => Item.activateNext())
    .then(() => Item.activateNext())
    .then(() => Item.activateNext())
    .then(() => Item.find())
    .then(_items => {
      items = _items;
      return Pair.find().sort('seqNum');
    })
    .then(_pairs => { pairs = _pairs; });
  });

  it('values() returns empty array when there are no pairs', () => {
    const ps = new PairSorter();
    expect(ps.values()).to.deep.equal([]);
  });

  it('Allows to insert pair in empty sorter', () => {
    const ps = new PairSorter();
    return expect(ps.tryInsert(pairs[0])).to.eventually.have.property('key', pairs[0].seqNum);
  });

  it('Throws when comparing pairs with proxy relation', () => {
    const ps = new PairSorter();

    return Pair.find({$or: [
        {itemA: items[0], itemB: items[1]},
        {itemA: items[2], itemB: items[3]}
      ]})
      .then(_p => {
        return ps.tryInsert(_p[0])
          .then(() => expect(ps.tryInsert(_p[1])).to.be.eventually.rejectedWith(ProxyRelationException));
      });
  });

  it('Throws when comparing pairs when the relation information is missing', () => {
    const ps = new PairSorter();
    return Pair.find({$or: [
        {itemA: items[0], itemB: items[1]},
        {itemA: items[0], itemB: items[2]}
      ]})
      .then(_p => {
        return ps.tryInsert(_p[0])
          .then(() => expect(ps.tryInsert(_p[1])).to.be.eventually.rejectedWith(MissingPairsRelationException));
      });
  });

  it('Correctly sorts directly related pairs when relation information exists', () => {
    let triple;
    const ps = new PairSorter();
    return Triple.create({
        itemA: items[0],
        itemB: items[1],
        itemC: items[2]
      })
      .then(_triple => _triple.addPick('AC').save())
      .then(_triple => {
        return Triple.findOne({_id: mongoose.Types.ObjectId(_triple._id)})
        .populate([
            {path: 'triple.picks.AB.pair', model: 'Pair', select: 'seqNum _id'},
            {path: 'triple.picks.AC.pair', model: 'Pair', select: 'seqNum _id'},
            {path: 'triple.picks.BC.pair', model: 'Pair', select: 'seqNum _id'},
          ]);
      })
      .then(_triple => {
        triple = _triple;
        return ps.tryInsert(pairs[0]);
      })
      .then(() => ps.tryInsert(pairs[1]))
      .then(() => {
        expect(ps.keys()).to.deep.equal([pairs[1].seqNum, pairs[0].seqNum]);
      });
  });

});
