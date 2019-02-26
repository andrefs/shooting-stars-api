import Item     from '../../models/Item';
import Pair   from '../../models/Pair';
import Triple from '../../models/Triple';
import PairSorter from '../../lib/PairSorter';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');
import {NoMoreItemsError}  from '../../lib/errors';

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('Pair', () => {
  let user;

  beforeEach(() => {
    return Promise.join(
      Item.remove(),
      Pair.remove(),
      Triple.remove()
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

  it('._setOrder and ._removeOrder correctly set order and isOrdered', () => {
    const imageUrl = 'http://example.com';

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Pair.findOne())
      .then(p => {
        expect(p.isOrdered).to.be.false;
        expect(p.order).to.be.null;
        return p._setOrder(5);
      })
      .then(p => {
        expect(p.isOrdered).to.be.true;
        expect(p.order).to.equal(5);
        return p._removeOrder();
      })
      .then(p => {
        expect(p.isOrdered).to.be.false;
        expect(p.order).to.be.undefined;
      });
  });

  it('_insertPairs works correctly for one pair', () => {
    const imageUrl = 'http://example.com';

    const ps = new PairSorter();

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Pair.findOne())
      .then(p  => Pair._insertPairs([p], ps))
      .then(() => {
        expect(ps.keys().length).to.equal(1);
        return Pair.findOne();
      })
      .then(p => {
        expect(p.order).to.be.null;
        expect(p.isOrdered).to.be.false;
      });
  });

  it.skip('calls Item.activateNext when there are no unplayed pairs left', () => {
    sinon.spy(Item, 'activateNext');
    const p = Pair.addNextCandidate();
    p.catch(() => expect(Item.activateNext).to.have.been.called);
    return expect(p).to.have.been.rejectedWith(NoMoreItemsError)
      .then(() => Item.activateNext.restore());
  });

  it.skip('won\'t call Item.activateNext if there are unplayed pairs left', () => {
    const imageUrl = 'http://ww.example.com';

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => Pair.addNextCandidate())
      .then(() => {
        const spy = sinon.spy(Item, 'activateNext');
        spy.resetHistory();
      })
      .then(() =>  expect(Item.activateNext).to.not.have.been.called)
      .then(() => Item.activateNext.restore());
  });

  it.skip('marks a pair as candidate on addNextCandidate', () => {
    const imageUrl = 'http://example.com';
    const itemFields = [
      {name: 'itemA', imageUrl},
      {name: 'itemB', imageUrl},
    ];
    let pair;

    return  Promise.mapSeries(itemFields, itemF => Item.create(itemF))
      .then(([itemA, itemB]) => Pair.create({itemA, itemB}))
      .then(p => {
        pair = p;
        return Pair.addNextCandidate();
      })
      .then(cand => {
        expect(cand.status).to.equal('candidate');
      });

  });
});
