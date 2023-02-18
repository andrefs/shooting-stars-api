import Item from '../../models/Item';
import Pair from '../../models/Pair';
import Triple from '../../models/Triple';
import PairSorter from '../../lib/PairSorter';
import mongoose from 'mongoose';
import Promise from 'bluebird';
require('../mongoose-helper');
import { AmbiguousPairsRelationException, MissingPairsRelationException } from '../../lib/errors';



describe('PairSorter', () => {
  const imageUrl = 'http://ww.example.com';
  let items;
  let pairs;

  beforeEach(async () => {
    await Item.deleteMany();
    await Pair.deleteMany();
    await Triple.deleteMany();

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });
    await Item.create({ name: 'third item', imageUrl });
    await Item.create({ name: 'fourth item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();
    items = await Item.find();
    pairs = await Pair.find().sort('seqNum');
  });

  it('values() returns empty array when there are no pairs', () => {
    const ps = new PairSorter();
    expect(ps.values()).toEqual([]);
  });

  it('Allows to insert pair in empty sorter', async () => {
    const ps = new PairSorter();
    await expect(ps.tryInsert(pairs[0])).resolves.toHaveProperty('key', pairs[0].seqNum);
  });

  describe('PairSorter.compare', () => {
    it('Throws on pairs when the relation information is missing', async () => {
      const ps = new PairSorter();
      const _p = await Pair.find({
        $or: [
          { itemA: items[0], itemB: items[1] },
          { itemA: items[0], itemB: items[2] }
        ]
      });
      await ps.tryInsert(_p[0]);
      await expect(ps.tryInsert(_p[1])).rejects.toThrow(AmbiguousPairsRelationException);
    });
  });

  it('Correctly sorts directly related pairs when relation information exists', async () => {

    const ps = new PairSorter();
    let triple = await Triple.findOne({
      itemA: items[0],
      itemB: items[1],
      itemC: items[2]
    });
    triple = await triple.addPick('AC').save();

    triple = await Triple.findOne({ _id: mongoose.Types.ObjectId(triple._id) })
      .populate([
        { path: 'triple.picks.AB.pair', model: 'Pair', select: 'seqNum _id' },
        { path: 'triple.picks.AC.pair', model: 'Pair', select: 'seqNum _id' },
        { path: 'triple.picks.BC.pair', model: 'Pair', select: 'seqNum _id' },
      ]);
    await ps.tryInsert(pairs[0]);
    await ps.tryInsert(pairs[1]);
    await expect(ps.keys()).toEqual([pairs[1].seqNum, pairs[0].seqNum]);
  });

  it('Correctly compares proxy relations', async () => {
    let ps = new PairSorter();
    let pairs;

    let triples = await Triple.find({
      $or: [
        { itemA: items[0], itemB: items[1], itemC: items[2] },
        { itemA: items[0], itemB: items[1], itemC: items[3] },
        { itemA: items[0], itemB: items[2], itemC: items[3] },
        { itemA: items[1], itemB: items[2], itemC: items[3] }
      ]
    });
    triples = await Promise.mapSeries(triples, triple => triple.addPick('BC').save());

    pairs = await Pair.find({
      $or: [
        { itemA: items[0], itemB: items[1] },
        { itemA: items[2], itemB: items[3] }
      ]
    });
    await ps.tryInsert(pairs[0]);
    await ps.tryInsert(pairs[1]);

    await expect(ps.keys()).toEqual([pairs[1].seqNum, pairs[0].seqNum]);
    triples = await Promise.mapSeries(triples, triple => triple.addPick('AB').save());
    triples = await Promise.mapSeries(triples, triple => triple.addPick('AB').save());

    ps = new PairSorter();
    await ps.tryInsert(pairs[0]);
    await ps.tryInsert(pairs[1]);
    await expect(ps.keys()).toEqual([pairs[0].seqNum, pairs[1].seqNum]);
  });

  it.skip('Marks pair as \'stable\' if able to insert it', () => {
    let pairs;
    let triple;
    const ps = new PairSorter();

    return Pair.find({
      $or: [
        { itemA: items[0], itemB: items[1] },
        { itemA: items[0], itemB: items[2] }
      ]
    })
      .then(_pairs => {
        pairs = _pairs;
        expect(pairs[0].status).to.equal('unplayed');
        expect(pairs[1].status).to.equal('unplayed');
      })
      .then(() => Triple.create({
        itemA: items[0],
        itemB: items[1],
        itemC: items[2]
      }))
      .then(_triple => _triple.addPick('AC').save())
      .then(() => ps.tryInsert(pairs[0]))
      .then(() => ps.tryInsert(pairs[1]))
      .then(() => expect(Pair.findOne({ seqNum: pairs[0].seqNum })).to.eventually.have.property('status', 'stable'))
      .then(() => expect(Pair.findOne({ seqNum: pairs[1].seqNum })).to.eventually.have.property('status', 'stable'));
  });


  it.skip('Marks pair as \'candidate\' if unable to insert it', () => {
    let pairs;
    const ps = new PairSorter();

    return Pair.find({
      $or: [
        { itemA: items[0], itemB: items[1] },
        { itemA: items[0], itemB: items[2] }
      ]
    })
      .then(_pairs => {
        pairs = _pairs;
        expect(pairs[0].status).to.equal('unplayed');
        expect(pairs[1].status).to.equal('unplayed');

        return Pair.findOneAndUpdate(
          { seqNum: pairs[1].seqNum },
          { $set: { status: 'stable' } }
        );
      })
      .then(() => ps.tryInsert(pairs[0]))
      .then(() => ps.tryInsert(pairs[1]))
      .catch(e => {
        expect(e).to.be.an.instanceof(MissingPairsRelationException);
        expect(Pair.findOne({ seqNum: pairs[0].seqNum })).to.eventually.have.property('status', 'stable');
        expect(Pair.findOne({ seqNum: pairs[1].seqNum })).to.eventually.have.property('status', 'candidate');
      });
  });

});
