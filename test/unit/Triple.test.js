import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('Triple', () => {
  let user;

  beforeEach(() => {
    return Promise.join(
      Item.remove().exec(),
      Pair.remove().exec(),
      Triple.remove().exec()
    );
  });

  it('sorts items on creation', () => {
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
    .then(() => Item.activateNext())
    .then(() => Item.activateNext())
    .then(() => Item.activateNext())
    .then(() => Item.find().sort([['seqNum', 'descending']]))
    .then(items => {
      triple = new Triple({
        itemA: items[2],
        itemB: items[1],
        itemC: items[0],
      });

      return Triple.remove().exec();
    })
    .then(() => {
      return triple.save();
    })
    .then(doc => {
      return doc
        .populate({path: 'itemA', model: Item})
        .populate({path: 'itemB', model: Item})
        .populate({path: 'itemC', model: Item})
        .execPopulate();
    })
    .then(doc => {
      expect(doc.itemA.seqNum).to.be.below(doc.itemB.seqNum);
      expect(doc.itemB.seqNum).to.be.below(doc.itemC.seqNum);
    });
  });

  it("throws when creating triple with same items", () => {
    const imageUrl = 'http://example.com';
    const itemFields = [
      {name: 'itemA', imageUrl},
      {name: 'itemB', imageUrl},
      {name: 'itemC', imageUrl}
    ];

    return  Promise.mapSeries(itemFields, itemF => Item.create(itemF))
      .then(([itemA, itemB, itemC])  => {
        // a triple with items A B and C was automatically created when they were created
        return expect(Triple.create({itemA, itemB, itemC})).to.be.rejected;
      });
  });


  it.skip('automatically creates triples when adding items', () => {
    const imageUrl = 'http://example.com';

    return Promise.join(
      expect(Triple.count().exec()).to.eventually.equal(0),
      expect(Item.count().exec()).to.eventually.equal(0),
      Item.create({name: 'item1', imageUrl})
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(1),
            expect(Triple.count().exec()).to.eventually.equal(0),
            Item.create({name: 'item2', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(2),
            expect(Triple.count().exec()).to.eventually.equal(0),
            Item.create({name: 'item3', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(3),
            expect(Triple.count().exec()).to.eventually.equal(1),
            Item.create({name: 'item4', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(4),
            expect(Triple.count().exec()).to.eventually.equal(4),
            Item.create({name: 'item5', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(5),
            expect(Triple.count().exec()).to.eventually.equal(10),
            Item.create({name: 'item6', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(6),
            expect(Triple.count().exec()).to.eventually.equal(20),
          );
        })
    );
  });

  // TODO maybe remove
  it('sets highestItemid correctly', () => {
    const imageUrl = 'http://ww.example.com';

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.find().sort([['seqNum', 'descending']]))
      .then(items => Triple.create({
        itemA: items[2],
        itemB: items[1],
        itemC: items[0],
      }))
      .then(doc => doc.populate({path: 'itemC', model: Item}).execPopulate())
      .then(triple => {
        expect(triple.highestItemId).to.equal(triple.itemC.seqNum);
      });
  });

  it('getPairs returns correct pairs ordered', () => {
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.find().sort([['seqNum', 'descending']]))
      .then(items => Triple.create({
        itemA: items[2],
        itemB: items[1],
        itemC: items[0],
      }))
      .then(t => {
        triple = t;
        return triple.getPairs();
      })
      .then(pairs => {
        expect(pairs.length).to.equal(3);
        expect(pairs[0].itemA.id).to.equal(triple.itemA.id);
        expect(pairs[0].itemB.id).to.equal(triple.itemB.id);
        expect(pairs[1].itemA.id).to.equal(triple.itemA.id);
        expect(pairs[1].itemB.id).to.equal(triple.itemC.id);
        expect(pairs[2].itemA.id).to.equal(triple.itemB.id);
        expect(pairs[2].itemB.id).to.equal(triple.itemC.id);
        expect(pairs[0].cmp(pairs[1])).to.equal(-1);
        expect(pairs[0].cmp(pairs[2])).to.equal(-1);
        expect(pairs[1].cmp(pairs[2])).to.equal(-1);
      });
  });

  it('updates ambiguity and support when addPick is called', () => {
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.find().sort([['seqNum', 'descending']]))
      .then(items => Triple.create({
        itemA: items[2],
        itemB: items[1],
        itemC: items[0],
      }))
      .then(t =>{
        t.addPick('AB');
        expect(t.support).to.equal(1);
        expect(t.picks.AB.count).to.equal(1);
        expect(t.ambiguity).to.equal(1);

        t.addPick('AC');
        expect(t.support).to.equal(2);
        expect(t.picks.AB.count).to.equal(1);
        expect(t.picks.AC.count).to.equal(1);
        expect(t.ambiguity).to.equal(1);

        t.addPick('AB');
        expect(t.support).to.equal(3);
        expect(t.picks.AB.count).to.equal(2);
        expect(t.picks.AC.count).to.equal(1);
        expect(t.ambiguity).to.equal(2);
      });
  });

  it.only('Triple.generateNew calls Item.activateNext when there are no more candidate pairs', () => {
    const imageUrl = 'http://ww.example.com';

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => Triple.generateNew(1))
      .then(() => expect(Triple.find()).to.eventually.have.property('length', 1));
  });

});
