import request from 'supertest';
import config  from '../../config';
import {api}   from '../api-helper';
import sinon   from 'sinon';
import {expect} from 'chai';
require('sinon-mongoose');
import {mongoose} from '../../db';
import Item from '../../models/Item';
const ItemMock = sinon.mock(Item);

describe('GET /items', function() {
  before(() => {
    ItemMock
      .expects('paginate').withArgs({},{offset:0, limit:10, lean:true})
      .chain('exec')
      .resolves({docs: [{
        "_id": "59da7d093119f4622d9a7e3e",
        "name": "itemName",
        "description": "itemDesc",
        "imageUrl": "itemUrl",
        "modified": "2017-10-08T19:31:21.127Z",
        "created": "2017-10-08T19:31:21.127Z",
        "__v": 0
      }]});
    });

  it('returns an items array', function() {
    return request(api)
      .get('/items')
      .expect('Content-Type', /json/)
      .expect(200)
      .then(res => {
        expect(res.body).to.be.instanceof(Array);
        expect(res.body.length).to.eql(1);
        expect(res.body[0]).to.have.property('name','itemName');
        expect(res.body[0]).to.have.property('description','itemDesc');
      });
  });
});
