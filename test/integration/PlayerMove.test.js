import request from 'supertest';
import config  from '../../config';
import {api}   from '../api-helper';
import sinon   from 'sinon';
import {expect} from 'chai';
require('sinon-mongoose');
import PlayerMove from '../../models/PlayerMove';
const PlayerMoveMock = sinon.mock(PlayerMove);
import {mongoose} from '../../db';
const ObjectId = mongoose.Types.ObjectId;
import {InvalidObjectId} from '../../lib/errors';

describe('PlayerMoves', () => {
  describe('GET /playerMoves', () => {
    before(() => {
      PlayerMoveMock
        .expects('paginate').withArgs({},{offset:0, limit:10, lean:true})
        .chain('exec')
        .resolves({
          docs: [{
            "_id":"59e148109238c0b310e214c7",
            "triple":"59e148b4890c214ca70b3101",
            "player":"c10159e148349381ab4ecd3f",
            "pick":"AC"
          }]
        });

      PlayerMoveMock.expects('findOne').withArgs({_id: ObjectId("59e148b4890c214ca70b3104")})
        .chain('lean')
        .chain('exec')
        .resolves({
          "_id":"59e148109238c0b310e214c7",
          "triple":"59e148b4890c214ca70b3101",
          "player":"c10159e148349381ab4ecd3f",
          "pick":"AC"
        });

      PlayerMoveMock.expects('findOne').withArgs({_id: ObjectId("000000000000000000000000")})
        .chain('lean')
        .chain('exec')
        .resolves(null);
    });

    it('returns a player moves array', () => {
      return request(api)
        .get('/playerMoves')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.be.instanceof(Array);
          expect(res.body.length).to.eql(1);
          res.body.forEach(pm => {
            expect(pm).to.have.property('triple');
            expect(pm).to.have.property('player');
            expect(pm).to.have.property('pick');
          });
        });
    });

    it('returns an existing player move', () => {
      return request(api)
        .get('/playerMoves/59e148b4890c214ca70b3104')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.have.property('triple');
          expect(res.body).to.have.property('player');
          expect(res.body).to.have.property('pick');
        });
    });

    it('returns an error if the id is wrong format', () => {
      return request(api)
        .get('/playerMoves/wrong')
        .expect(400)
        .expect(res => {
          expect(res.body).to.have.property('code','InvalidObjectId');
        });
    });

    it('returns a not found if the item does not exist', () => {
      return request(api)
        .get('/playerMoves/000000000000000000000000')
        .expect(404);
    });
  });

  describe('POST /playerMoves', () => {
    it('method should not be allowed', () => {
      return request(api)
        .post('/playerMoves')
        .send({
          "triple":"59e148b4890c214ca70b3101",
          "player":"c10159e148349381ab4ecd3f",
          "pick":"AC"
        })
        .expect(405);
    });
  });
});
