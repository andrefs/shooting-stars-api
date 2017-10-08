import Item     from '../../models/Item';
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
        expect(doc.itemA.id).to.be.below(doc.itemB.id);
        expect(doc.itemB.id).to.be.below(doc.itemC.id);
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
       return expect(Triple.create({itemA, itemB, itemC})).to.be.rejected;
      });
  });


  it('automatically creates triples when adding items', () => {
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
            Item.create({name: 'item5', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(6),
            expect(Triple.count().exec()).to.eventually.equal(20),
            Item.create({name: 'item5', imageUrl})
          );
        })
    );
  });

  it('sets highestItemid correctly', () => {
    const imageUrl = 'http://ww.example.com';

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(items => {
        return Triple.findOne()
          .populate({path: 'itemC', model: Item})
          .exec();
      })
      .then(triple => {
        expect(triple.highestItemId).to.equal(triple.itemC.id);
      });
  });
});
