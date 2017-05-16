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
    item.save().then(doc => {
      expect(doc.random).to.equal('9be14f3049859177498fa0f454fd3fa2');
      expect(doc.id).to.be.a('number');
    });
  });

});
