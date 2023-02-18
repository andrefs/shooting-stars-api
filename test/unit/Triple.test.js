import Item from '../../models/Item';
import Pair from '../../models/Pair';
import Triple from '../../models/Triple';
import Promise from 'bluebird';
require('../mongoose-helper');


describe('Triple', () => {

  beforeEach(async () => {
    await Item.deleteMany();
    await Pair.deleteMany();
    await Triple.deleteMany();
  });

  it('sorts items on creation', async () => {
    const imageUrl = 'http://ww.example.com';
    let triple;

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });
    await Item.create({ name: 'third item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();

    const items = await Item.find().sort([['seqNum', 'descending']]);

    triple = new Triple({
      itemA: items[2],
      itemB: items[1],
      itemC: items[0],
    });

    await Triple.deleteMany();

    let doc = await triple.save();


    doc = await doc
      .populate({ path: 'itemA', model: Item })
      .populate({ path: 'itemB', model: Item })
      .populate({ path: 'itemC', model: Item })
      .execPopulate();

    expect(doc.itemA.seqNum).toBeLessThan(doc.itemB.seqNum);
    expect(doc.itemB.seqNum).toBeLessThan(doc.itemC.seqNum);
  });

  it("throws when creating triple with same items", async () => {
    const imageUrl = 'http://example.com';
    const items = [
      await Item.create({ name: 'itemA', imageUrl }),
      await Item.create({ name: 'itemB', imageUrl }),
      await Item.create({ name: 'itemC', imageUrl })
    ];

    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();

    await expect(Triple.create({ itemA: items[0], itemB: items[1], itemC: items[2] })).rejects.toThrow();
  });

  it('getPairs returns correct pairs ordered', async () => {
    const imageUrl = 'http://ww.example.com';

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });
    await Item.create({ name: 'third item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();

    const items = await Item.find().sort([['seqNum', 'descending']]);
    const triple = await Triple.findOne({
      itemA: items[2],
      itemB: items[1],
      itemC: items[0],
    }).populate([
      { path: 'itemA', model: 'Item' },
      { path: 'itemB', model: 'Item' },
      { path: 'itemC', model: 'Item' },
    ]);

    const pairs = await triple.getPairs();

    expect(pairs.length).toEqual(3);
    expect(pairs[0].itemA.seqNum).toEqual(triple.itemA.seqNum);
    expect(pairs[0].itemB.seqNum).toEqual(triple.itemB.seqNum);
    expect(pairs[1].itemA.seqNum).toEqual(triple.itemA.seqNum);
    expect(pairs[1].itemB.seqNum).toEqual(triple.itemC.seqNum);
    expect(pairs[2].itemA.seqNum).toEqual(triple.itemB.seqNum);
    expect(pairs[2].itemB.seqNum).toEqual(triple.itemC.seqNum);
    expect(pairs[0].cmp(pairs[1])).toEqual(-1);
    expect(pairs[0].cmp(pairs[2])).toEqual(-1);
    expect(pairs[1].cmp(pairs[2])).toEqual(-1);
  });

  it('updates ambiguity and support when addPick is called', async () => {
    const imageUrl = 'http://ww.example.com';

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });
    await Item.create({ name: 'third item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();

    const items = await Item.find().sort([['seqNum', 'descending']]);

    const t = await Triple.findOne({
      itemA: items[2],
      itemB: items[1],
      itemC: items[0],
    });

    t.addPick('AB');
    expect(t.support).toEqual(1);
    expect(t.picks.AB.count).toEqual(1);
    expect(t.ambiguity).toEqual(1);

    t.addPick('AC');
    expect(t.support).toEqual(2);
    expect(t.picks.AB.count).toEqual(1);
    expect(t.picks.AC.count).toEqual(1);
    expect(t.ambiguity).toEqual(1);

    t.addPick('AB');
    expect(t.support).toEqual(3);
    expect(t.picks.AB.count).toEqual(2);
    expect(t.picks.AC.count).toEqual(1);
    expect(t.ambiguity).toEqual(2);
  });

});

