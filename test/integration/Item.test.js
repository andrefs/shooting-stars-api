import request from 'supertest';
import config  from '../../config';
import {api}   from '../api-helper';
import sinon   from 'sinon';
import {expect} from 'chai';
require('sinon-mongoose');
import Item from '../../models/Item';
const ItemMock = sinon.mock(Item);
import {mongoose} from '../../db';
const ObjectId = mongoose.Types.ObjectId;
import {InvalidObjectId} from '../../lib/errors';

describe('GET /items', function() {
  before(() => {
    ItemMock
      .expects('paginate').withArgs({},{offset:0, limit:10, lean:true})
      .chain('exec')
      .resolves({
        docs: [{
          "_id": "59e0d1430a12415fa0ed5805",
          "id": "59e0d1430a12415fa0ed5805",
          "name": "1st item",
          "description": "item description",
          "imageUrl": "http://ww.example.com",
        },
        {
          "_id": "59e0d1430a12415fa0ed5806",
          "id": "59e0d1430a12415fa0ed5806",
          "name": "2nd item",
          "imageUrl": "http://ww.example.com",
        },
        {
          "_id": "59e0d1430a12415fa0ed5807",
          "id": "59e0d1430a12415fa0ed5807",
          "name": "3rd item",
          "imageUrl": "http://ww.example.com",
        }]
      });

    ItemMock.expects('findOne').withArgs({_id: ObjectId("59da7d093119f4622d9a7e3e")})
      .chain('lean')
      .chain('exec')
      .resolves({
        "_id": "59da7d093119f4622d9a7e3e",
        "id": 5,
        "name": "itemName",
        "description": "itemDesc",
        "imageUrl": "itemUrl",
      });

    ItemMock.expects('findOne').withArgs({_id: ObjectId("000000000000000000000000")})
      .chain('lean')
      .chain('exec')
      .resolves(null);
  });

  it('returns an items array', () => {
    return request(api)
      .get('/items')
      .expect('Content-Type', /json/)
      .expect(200)
      .then(res => {
        expect(res.body).to.be.instanceof(Array);
        expect(res.body.length).to.eql(3);
        res.body.forEach(item => {
          expect(item).to.have.property('name');
          expect(item).to.have.property('imageUrl');
        });
      });
  });


  it('returns an existing item', () => {
    return request(api)
      .get('/items/59da7d093119f4622d9a7e3e')
      .expect('Content-Type', /json/)
      .expect(200)
      .then(res => {
        expect(res.body).to.have.property('name','itemName');
        expect(res.body).to.have.property('description','itemDesc');
        expect(res.body).to.have.property("imageUrl", "itemUrl");
      });
  });

  it('returns an error if the id is wrong format', () => {
    return request(api)
      .get('/items/wrong')
      .expect(400)
      .expect(res => {
        expect(res.body).to.have.property('code','InvalidObjectId');
      });
  });

  it('returns a not found if the item does not exist', () => {
    return request(api)
      .get('/items/000000000000000000000000')
      .expect(404);
  });

});
