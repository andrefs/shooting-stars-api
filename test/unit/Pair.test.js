import Item     from '../../models/Item';
import Pair   from '../../models/Pair';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('Pair', () => {
  let user;

  beforeEach(() => {
    return Promise.join(
      Item.remove().exec(),
      Pair.remove().exec()
    );
  });

  it('sorts items on creation', () => {
    const imageUrl = 'http://ww.example.com';
    let pair;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(items => {
        pair = new Pair({
          itemA: items[1],
          itemB: items[0],
        });
      })
      .then(() => Pair.remove())
      .then(() => Pair.count())
      .then(() => pair.save())
      .then(doc => {
        return doc
          .populate({path: 'itemA', model: Item})
          .populate({path: 'itemB', model: Item})
          .execPopulate();
      })
      .then(doc => {
        expect(doc.itemA.id).to.be.below(doc.itemB.id);
      });
  });

  it("throws when creating pair with same items", () => {
    const imageUrl = 'http://example.com';
    const itemFields = [
      {name: 'itemA', imageUrl},
      {name: 'itemB', imageUrl},
    ];

    return  Promise.mapSeries(itemFields, itemF => Item.create(itemF))
      .then(([itemA, itemB])  => {
        // a pair with items A and B was automatically created when they were created
        return expect(Pair.create({itemA, itemB})).to.be.rejected;
      });
  });


  it('automatically creates pairs when adding items', () => {
    const imageUrl = 'http://example.com';

    return Promise.join(
      expect(Pair.count().exec()).to.eventually.equal(0),
      expect(Item.count().exec()).to.eventually.equal(0),
      Item.create({name: 'item1', imageUrl})
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(1),
            expect(Pair.count().exec()).to.eventually.equal(0),
            Item.create({name: 'item2', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(2),
            expect(Pair.count().exec()).to.eventually.equal(1),
            Item.create({name: 'item3', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(3),
            expect(Pair.count().exec()).to.eventually.equal(3),
            Item.create({name: 'item4', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(4),
            expect(Pair.count().exec()).to.eventually.equal(6),
            Item.create({name: 'item5', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(5),
            expect(Pair.count().exec()).to.eventually.equal(10),
            Item.create({name: 'item6', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(6),
            expect(Pair.count().exec()).to.eventually.equal(15),
          );
        })
    );
  });

});
