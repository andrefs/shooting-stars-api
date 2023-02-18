import Item from '../../models/Item';
import Pair from '../../models/Pair';
import Triple from '../../models/Triple';
require('../mongoose-helper');
import { NoMoreItemsError } from '../../lib/errors';
import Promise from 'bluebird';

describe('Item', () => {
  let user;

  beforeEach(async () => {
    await Item.deleteMany();
    await Pair.deleteMany();
    return Triple.deleteMany();
  });

  it('initializes with default values', async () => {
    const item = new Item({
      name: 'itemName',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    });
    const doc = await item.save();
    expect(typeof doc.seqNum).toBe('number');
    expect(doc.isActive).toBe(false);
  });

  it('marks item as active when calling activateNext', async () => {
    let item = await Item.create({
      name: 'itemName',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    });
    await Item.activateNext();
    item = await Item.findOne({ seqNum: item.seqNum });
    expect(item.isActive).toBe(true);
  });

  it('creating items does not create pairs or triples', async () => {
    const imageUrl = 'http://ww.example.com';

    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });
    await Item.create({ name: 'third item', imageUrl });
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);
  });

  it('activating the first item will not create a pair or a triple', async () => {
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    let item = await Item.create({
      name: 'first',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    });
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);
    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);
  });

  it('activating two items creates a pair but not a triple', async () => {
    const imageUrl = 'http://ww.example.com';

    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    Item.create({ name: 'first item', imageUrl });
    Item.create({ name: 'second item', imageUrl });
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(1);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);
  });

  it('automatically creates correct number of pairs and triples when activating items', async () => {
    const imageUrl = 'http://ww.example.com';

    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    await Item.create({ name: 'first item', imageUrl });
    await Item.create({ name: 'second item', imageUrl });
    await Item.create({ name: 'third item', imageUrl });
    await Item.create({ name: 'fourth item', imageUrl });
    await Item.create({ name: 'fifth item', imageUrl });
    await Item.create({ name: 'sixth item', imageUrl });
    await Item.create({ name: 'seventh item', imageUrl });

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(0);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(1);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(0);

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(3);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(1);

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(6);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(4);

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(10);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(10);

    await Item.activateNext();
    await expect(Pair.estimatedDocumentCount()).resolves.toBe(15);
    await expect(Triple.estimatedDocumentCount()).resolves.toBe(20);

    await Item.activateNext();
    //.then(() => {
    //  expect(Pair.estimatedDocumentCount()).resolves.toBe();
    //  expect(Triple.estimatedDocumentCount()).resolves.toBe();
    //})
  });

  it('throws error when calling activateNext iff there are no more items', async () => {
    await expect(Item.activateNext()).rejects.toThrow(NoMoreItemsError);
    const item = await Item.create({
      name: 'itemName',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    });
    await expect(Item.activateNext()).resolves.not.toThrow();
    await expect(Item.activateNext()).rejects.toThrow(NoMoreItemsError);
  });

});
