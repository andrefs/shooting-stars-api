import mongoose from 'mongoose';
import Item     from '../../models/Item';
import sinon    from 'sinon';
import {expect} from 'chai';
import db       from '../../db';

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
      expect(doc.id).to.be.a('number');
    });
  });

});
