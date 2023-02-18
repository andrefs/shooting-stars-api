import request from 'supertest';
import config from '../../config';
import { api } from '../api-helper';
import Item from '../../models/Item';
const ItemMock = jest.mock(Item);
import { mongoose } from '../../db';
const ObjectId = mongoose.Types.ObjectId;
import { InvalidObjectId } from '../../lib/errors';

describe('Items', () => {
  describe('GET /items', () => {
    before(async () => {
      ItemMock
        .expects('paginate').withArgs({}, { offset: 0, limit: 10, lean: true })
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

      ItemMock.expects('findOne').withArgs({ _id: ObjectId("59da7d093119f4622d9a7e3e") })
        .chain('lean')
        .chain('exec')
        .resolves({
          "_id": "59da7d093119f4622d9a7e3e",
          "id": 5,
          "name": "itemName",
          "description": "itemDesc",
          "imageUrl": "itemUrl",
        });

      ItemMock.expects('findOne').withArgs({ _id: ObjectId("000000000000000000000000") })
        .chain('lean')
        .chain('exec')
        .resolves(null);
    });

    it('returns an items array', async () => {
      const res = await request(api)
        .get('/items')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toEqua(3);
      res.body.forEach(item => {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('imageUrl');
      });
    });
  });

  //it('returns an existing item', () => {
  //  return request(api)
  //    .get('/items/59da7d093119f4622d9a7e3e')
  //    .expect('Content-Type', /json/)
  //    .expect(200)
  //    .then(res => {
  //      expect(res.body).to.have.property('name', 'itemName');
  //      expect(res.body).to.have.property('description', 'itemDesc');
  //      expect(res.body).to.have.property("imageUrl", "itemUrl");
  //    });
  //});

  //it('returns an error if the id is wrong format', () => {
  //  return request(api)
  //    .get('/items/wrong')
  //    .expect(400)
  //    .expect(res => {
  //      expect(res.body).to.have.property('code', 'InvalidObjectId');
  //    });
  //});

  //it('returns a not found if the item does not exist', () => {
  //  return request(api)
  //    .get('/items/000000000000000000000000')
  //    .expect(404);
  //});
});

describe('POST /items', () => {
  it('create an item', () => {
    return request(api)
      .post('/items')
      .send({
        name: 'name',
        description: 'description',
        imageUrl: 'imageUrl'
      })
      .expect(201);
  });
});

