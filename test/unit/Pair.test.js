import Item from '../../models/Item';
import Pair from '../../models/Pair';
import Triple from '../../models/Triple';
import PairSorter from '../../lib/PairSorter';
import Promise from 'bluebird';
require('../mongoose-helper');
import { NoMoreItemsError } from '../../lib/errors';

describe('Pair', () => {
  let user;

  beforeEach(async () => {
    await Item.deleteMany();
    await Pair.deleteMany();
    await Triple.deleteMany();
  });

  it('sorts items on creation', async () => {
    const imageUrl = 'http://ww.example.com';

    const items = [
      await Item.create({ name: 'first item', imageUrl }),
      await Item.create({ name: 'second item', imageUrl })
    ];
    const doc = await Pair.create({
      itemA: items[1],
      itemB: items[0],
    });
    await doc
      .populate([
        { path: 'itemA', model: Item },
        { path: 'itemB', model: Item }
      ]).execPopulate();
    await expect(doc.itemA.seqNum).toBeLessThan(doc.itemB.seqNum);
  });

  it("throws when creating pair with same items", async () => {
    const imageUrl = 'http://example.com';
    const itemA = await Item.create({ name: 'itemA', imageUrl });
    const itemB = await Item.create({ name: 'itemB', imageUrl });

    await Pair.create({ itemA, itemB });
    await expect(Pair.create({ itemA, itemB })).rejects.toThrow();
  });

  it('._setOrder and ._removeOrder correctly set order and isOrdered', async () => {
    const imageUrl = 'http://example.com';

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    let p = await Pair.findOne();

    expect(p.isOrdered).toBe(false);
    expect(p.order).toBeNull();
    p = await p._setOrder(5);

    expect(p.isOrdered).toBe(true);
    expect(p.order).toEqual(5);
    p = await p._removeOrder();


    expect(p.isOrdered).toBe(false);
    expect(p.order).toBeUndefined();
  });

  it('_insertPairs works correctly for one pair', async () => {
    const imageUrl = 'http://example.com';

    const ps = new PairSorter();

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    let p = await Pair.findOne();
    await Pair._insertPairs([p], ps);

    expect(ps.keys().length).toEqual(1);
    p = await Pair.findOne();

    expect(p.order).toBeNull();
    expect(p.isOrdered).toBe(false);
  });

  it.skip('calls Item.activateNext when there are no unplayed pairs left', () => {
    jest.spyOn(Item, 'activateNext');
    const p = Pair.addNextCandidate();
    p.catch(() => expect(Item.activateNext).to.have.been.called);
    return expect(p).to.have.been.rejectedWith(NoMoreItemsError)
      .then(() => Item.activateNext.restore());
  });

  it.skip('won\'t call Item.activateNext if there are unplayed pairs left', () => {
    const imageUrl = 'http://ww.example.com';

    return Promise.mapSeries([
      { name: 'first item', imageUrl },
      { name: 'second item', imageUrl },
      { name: 'third item', imageUrl },
    ], itemF => Item.create(itemF))
      .then(() => Pair.addNextCandidate())
      .then(() => {
        const spy = jest.spyOn(Item, 'activateNext');
        spy.resetHistory();
      })
      .then(() => expect(Item.activateNext).to.not.have.been.called)
      .then(() => Item.activateNext.restore());
  });

  it.skip('marks a pair as candidate on addNextCandidate', () => {
    const imageUrl = 'http://example.com';
    const itemFields = [
      { name: 'itemA', imageUrl },
      { name: 'itemB', imageUrl },
    ];
    let pair;

    return Promise.mapSeries(itemFields, itemF => Item.create(itemF))
      .then(([itemA, itemB]) => Pair.create({ itemA, itemB }))
      .then(p => {
        pair = p;
        return Pair.addNextCandidate();
      })
      .then(cand => {
        expect(cand.status).to.equal('candidate');
      });

  });
});
