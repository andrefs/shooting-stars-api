import request from 'supertest';
import config  from '../../config';
import {api}   from '../api-helper';
import sinon   from 'sinon';
import {expect} from 'chai';
require('sinon-mongoose');
import Triple from '../../models/Triple';
const TripleMock = sinon.mock(Triple);
import {mongoose} from '../../db';
const ObjectId = mongoose.Types.ObjectId;
import {InvalidObjectId} from '../../lib/errors';

describe('Triples', () => {
  describe('GET /triples', () => {
    before(() => {
      TripleMock
        .expects('paginate').withArgs({}, {offset:0, limit:10, lean:true})
        .chain('exec')
        .resolves({
          docs: [{
            "_id": "59e148b4890c214ca70b3101",
            "randomSeq": "5689823a39924314b32bf7a337b21ba0",
            "highestItemId": 3,
            "itemA": "59e148b4890c214ca70b30fe",
            "itemB": "59e148b4890c214ca70b30ff",
            "itemC": "59e148b4890c214ca70b3100"
          },{
            "_id": "59e14cd62c16f663309aacfd",
            "randomSeq": "d57255843e55454077af05d83902ab64",
            "highestItemId" :4,
            "itemA":"59e148b4890c214ca70b30ff",
            "itemB":"59e148b4890c214ca70b3100",
            "itemC":"59e14cd62c16f663309aacfa"
          },{
            "_id":"59e14cd62c16f663309aacfc",
            "randomSeq":"3ee4cbef496b0f981244119e220e5728",
            "highestItemId":4,
            "itemA":"59e148b4890c214ca70b30fe",
            "itemB":"59e148b4890c214ca70b3100",
            "itemC":"59e14cd62c16f663309aacfa"
          }]
        });

      TripleMock.expects('findOne').withArgs({_id: ObjectId("59e148b4890c214ca70b3101")})
        .chain('lean')
        .chain('exec')
        .resolves({
            "_id": "59e148b4890c214ca70b3101",
            "randomSeq": "5689823a39924314b32bf7a337b21ba0",
            "highestItemId": 3,
            "itemA": "59e148b4890c214ca70b30fe",
            "itemB": "59e148b4890c214ca70b30ff",
            "itemC": "59e148b4890c214ca70b3100"
          });

      TripleMock.expects('findOne').withArgs({_id: ObjectId("000000000000000000000000")})
        .chain('lean')
        .chain('exec')
        .resolves(null);
    });

    it('returns a triples array', function() {
      return request(api)
        .get('/triples')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.be.instanceof(Array);
          expect(res.body.length).to.eql(3);
          res.body.forEach(triple => {
            expect(triple).to.have.property('itemA');
            expect(triple).to.have.property('itemB');
            expect(triple).to.have.property('itemC');
            expect(triple).to.have.property('randomSeq');
            expect(triple).to.have.property('highestItemId');
          });
        });
    });


    it('returns an existing triple', () => {
      return request(api)
        .get('/triples/59e148b4890c214ca70b3101')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.have.property('itemA');
          expect(res.body).to.have.property('itemB');
          expect(res.body).to.have.property('itemC');
          expect(res.body).to.have.property('randomSeq');
          expect(res.body).to.have.property('highestItemId');
        });
    });

    it('returns an error if the id is wrong format', () => {
      return request(api)
        .get('/triples/wrong')
        .expect(400)
        .expect(res => {
          expect(res.body).to.have.property('code','InvalidObjectId');
        });
    });

    it('returns a not found if the item does not exist', () => {
      return request(api)
        .get('/triples/000000000000000000000000')
        .expect(404);
    });
  });

  describe('POST /triples', () => {
    it('method should not be allowed', () => {
      return request(api)
        .post('/triples')
        .send({
          "itemA":"59e148b4890c214ca70b30ff",
          "itemB":"59e148b4890c214ca70b3100",
          "itemC":"59e14cd62c16f663309aacfa"
        })
        .expect(405);
    });
  });
});
