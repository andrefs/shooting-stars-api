import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import sinon    from 'sinon';
import {expect} from 'chai';
require('../mongoose-helper');
import {NoMoreItemsError} from '../../lib/errors';
import Promise  from 'bluebird';

describe('Item', () => {
  let user;

  beforeEach(() => {
    return Promise.join(
      Item.remove(),
      Pair.remove(),
      Triple.remove()
    );
  });

  it('initializes with default values', () => {
    const item = new Item({
      name: 'itemName',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    });
    return item.save().then(doc => {
      expect(doc.seqNum).to.be.a('number');
      expect(doc.isActive).to.be.false;
    });
  });

  it('marks item as active when calling activateNext', () => {
    let item;
    return Item.create({
      name: 'itemName',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    })
    .then(doc => {
      item = doc;
      return Item.activateNext();
    })
    .then(() => Item.findOne({seqNum: item.seqNum}).exec())
    .then(item => {
      expect(item.isActive).to.be.true;
    });
  });

  it('creating items does not create pairs or triples', () => {
    const imageUrl = 'http://ww.example.com';

    expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
    expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => expect(Pair.estimatedDocumentCount()).to.eventually.equal(0))
      .then(() => expect(Triple.estimatedDocumentCount()).to.eventually.equal(0));
  });

  it('activating the first item will not create a pair or a triple', () => {
    let item;

    expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
    expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);

    return Item.create({
      name: 'first',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    })
    .then(item => {
      expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
      expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);
      return Item.activateNext();
    })
    .then(() => expect(Pair.estimatedDocumentCount()).to.eventually.equal(0))
    .then(() => expect(Triple.estimatedDocumentCount()).to.eventually.equal(0));
  });

  it('activating two items creates a pair but not a triple', () => {
    const imageUrl = 'http://ww.example.com';

    expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
    expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);

        return Item.activateNext();
      })
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);

        return Item.activateNext();
      })
      .then(() => expect(Pair.estimatedDocumentCount()).to.eventually.equal(1))
      .then(() => expect(Triple.estimatedDocumentCount()).to.eventually.equal(0));
  });

  it('automatically creates correct number of pairs and triples when activating items', () => {
    const imageUrl = 'http://ww.example.com';

    expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
    expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);

    return Promise.mapSeries([
        {name: 'first item' ,   imageUrl},
        {name: 'second item',   imageUrl},
        {name: 'third item' ,   imageUrl},
        {name: 'fourth item' ,  imageUrl},
        {name: 'fifth item' ,   imageUrl},
        {name: 'sixth item' ,   imageUrl},
        {name: 'seventh item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(0);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);
        return Item.activateNext();
      })
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(1);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(0);
        return Item.activateNext();
      })
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(3);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(1);
        return Item.activateNext();
      })
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(6);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(4);
        return Item.activateNext();
      })
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(10);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(10);
        return Item.activateNext();
      })
      .then(() => {
        expect(Pair.estimatedDocumentCount()).to.eventually.equal(15);
        expect(Triple.estimatedDocumentCount()).to.eventually.equal(20);
        return Item.activateNext();
      })
      //.then(() => {
      //  expect(Pair.estimatedDocumentCount()).to.eventually.equal();
      //  expect(Triple.estimatedDocumentCount()).to.eventually.equal();
      //})
  });

  it('throws error when calling activateNext iff there are no more items', () => {
    expect(Item.activateNext()).to.eventually.be.rejectedWith(NoMoreItemsError);
    let item;
    return Item.create({
      name: 'itemName',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    })
    .then(() => expect(Item.activateNext()).to.eventually.be.fulfilled)
    .then(() => expect(Item.activateNext()).to.eventually.be.rejectedWith(NoMoreItemsError));
  });

});
