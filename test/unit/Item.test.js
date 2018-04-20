import Item     from '../../models/Item';
import sinon    from 'sinon';
import {expect} from 'chai';
require('../mongoose-helper');
import {NoMoreItemsError} from '../../lib/errors';

describe('Item', () => {
  let user;

  beforeEach(done => {
      Item.remove().then(() => {
        return done();
      });
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

  it('marks item as active after calling activateNext', () => {
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

  it('throws error when calling activateNext iff there are no more items', () => {
    expect(Item.activateNext()).to.be.rejectedWith(NoMoreItemsError);
    let item;
    Item.create({
      name: 'itemName',
      description: 'itemDesc',
      imageUrl: 'itemUrl'
    })
    .then(() => expect(Item.activateNext()).to.be.fulfilled)
    .then(() => expect(Item.activateNext()).to.be.rejectedWith(NoMoreItemsError));
  });

});
