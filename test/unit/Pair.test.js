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

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(items =>  Pair.create({
        itemA: items[1],
        itemB: items[0],
      }))
      .then(doc => {
        return doc
          .populate([
            {path: 'itemA', model: Item},
            {path: 'itemB', model: Item}
           ])
          .execPopulate();
      })
      .then(doc => {
        expect(doc.itemA.seqNum).to.be.below(doc.itemB.seqNum);
      });
  });

  it("throws when creating pair with same items", () => {
    const imageUrl = 'http://example.com';
    const itemFields = [
      {name: 'itemA', imageUrl},
      {name: 'itemB', imageUrl},
    ];

    return  Promise.mapSeries(itemFields, itemF => Item.create(itemF))
      .then(([itemA, itemB]) => {
        return Pair.create({itemA, itemB})
          .then(p => expect(Pair.create({itemA, itemB})).to.be.rejected)
      });
  });


  it('creates pairs when calling activateNext', () => {
    const imageUrl = 'http://example.com';

    return Promise.join(
      expect(Pair.count().exec()).to.eventually.equal(0),
      expect(Item.count().exec()).to.eventually.equal(0),
      // won't activate if there are no items
      expect(Item.activateNext()).to.be.rejected,

      Item.create({name: 'item1', imageUrl})
        .then(item => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(1),
            expect(Pair.count().exec()).to.eventually.equal(0),
            Item.activateNext()
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(1),
            // won't create pairs if this is the first activated item
            expect(Pair.count().exec()).to.eventually.equal(0),
            Item.create({name: 'item2', imageUrl})
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(2),
            expect(Pair.count().exec()).to.eventually.equal(0),
            Item.activateNext()
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(2),
            expect(Pair.count().exec()).to.eventually.equal(1),
            // won't activate if all items have been activated
            expect(Item.activateNext()).to.be.rejected
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
            expect(Pair.count().exec()).to.eventually.equal(1),
            Item.activateNext()
          );
        })
        .then(() => {
          return Promise.join(
            expect(Item.count().exec()).to.eventually.equal(3),
            expect(Pair.count().exec()).to.eventually.equal(3),
          );
        })
    );
  });

});
