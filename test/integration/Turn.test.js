import request from 'supertest';
import config  from '../../config';
import {api}   from '../api-helper';
import sinon   from 'sinon';
import {expect} from 'chai';
require('sinon-mongoose');
import Turn from '../../models/Turn';
const TurnMock = sinon.mock(Turn);
import {mongoose} from '../../db';
const ObjectId = mongoose.Types.ObjectId;
import {InvalidObjectId} from '../../lib/errors';

describe('Turns', () => {
  describe('GET /turns', () => {
    before(() => {
      TurnMock
        .expects('paginate').withArgs({},{offset:0, limit:10, lean:true})
        .chain('exec')
        .resolves({
          docs: [{
            "_id":"59e148b4890c214ca70b3104",
            "triple":"59e148b4890c214ca70b3101",
            "score": {"bot":0,    "async":0,    "sync":0   },
            "moves": {"bot":"AC", "async":"AB", "sync":"BC"}
          }]
        });

      TurnMock.expects('findOne').withArgs({_id: ObjectId("59e148b4890c214ca70b3104")})
        .chain('lean')
        .chain('exec')
        .resolves({
            "_id":"59e148b4890c214ca70b3104",
            "triple":"59e148b4890c214ca70b3101",
            "score": {"bot":0,    "async":0,    "sync":0   },
            "moves": {"bot":"AC", "async":"AB", "sync":"BC"}
        });

      TurnMock.expects('findOne').withArgs({_id: ObjectId("000000000000000000000000")})
        .chain('lean')
        .chain('exec')
        .resolves(null);
    });

    it('returns an turns array', () => {
      return request(api)
        .get('/turns')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.be.instanceof(Array);
          expect(res.body.length).to.eql(1);
          res.body.forEach(turn => {
            expect(turn).to.have.property('triple');
            expect(turn).to.have.property('score');
            expect(turn).to.have.property('moves');
          });
        });
    });

    it('returns an existing turn', () => {
      return request(api)
        .get('/turns/59e148b4890c214ca70b3104')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.have.property('triple');
          expect(res.body).to.have.property('score');
          expect(res.body).to.have.property('moves');
        });
    });

    it('returns an error if the id is wrong format', () => {
      return request(api)
        .get('/turns/wrong')
        .expect(400)
        .expect(res => {
          expect(res.body).to.have.property('code','InvalidObjectId');
        });
    });

    it('returns a not found if the item does not exist', () => {
      return request(api)
        .get('/turns/000000000000000000000000')
        .expect(404);
    });
  });

  describe('POST /turns', () => {
    it('method should not be allowed', () => {
      return request(api)
        .post('/turns')
        .send({
          "triple":"59e148b4890c214ca70b3101",
          "score": {"bot":0,    "async":0,    "sync":0   },
          "moves": {"bot":"AC", "async":"AB", "sync":"BC"}
        })
        .expect(405);
    });
  });
});
