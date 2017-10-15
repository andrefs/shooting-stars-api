import request from 'supertest';
import config  from '../../config';
import {api}   from '../api-helper';
import sinon   from 'sinon';
import {expect} from 'chai';
require('sinon-mongoose');
import GameSequence from '../../models/GameSequence';
const GameSequenceMock = sinon.mock(GameSequence);
import {mongoose} from '../../db';
const ObjectId = mongoose.Types.ObjectId;
import {InvalidObjectId} from '../../lib/errors';

describe('GameSequences', () => {
  describe('GET /gameSequences', () => {
    before(() => {
      GameSequenceMock
        .expects('paginate').withArgs({},{offset:0, limit:10, lean:true})
        .chain('exec')
        .resolves({
          docs: [{
            "_id":"59e148b4890c214ca70b30a2",
            "id":"1",
            "highestItemId":"5",
            "randomSeq":"ebd5cfd415832382f418a54cb5b6d780",
            "triples": [
              "59e148b4890c214ca70b3085",
              "59e148b4890c214ca70b307d",
              "59e148b4890c214ca70b3084",
            ]
          }]
        });

      GameSequenceMock.expects('findOne').withArgs({_id: ObjectId("59e148b4890c214ca70b30a2")})
        .chain('lean')
        .chain('exec')
        .resolves({
            "_id":"59e148b4890c214ca70b30a2",
            "id":"1",
            "highestItemId":"5",
            "randomSeq":"ebd5cfd415832382f418a54cb5b6d780",
            "triples": [
              "59e148b4890c214ca70b3085",
              "59e148b4890c214ca70b307d",
              "59e148b4890c214ca70b3084",
            ]
        });

      GameSequenceMock.expects('findOne').withArgs({_id: ObjectId("000000000000000000000000")})
        .chain('lean')
        .chain('exec')
        .resolves(null);
    });

    it('returns an game sequences array', () => {
      return request(api)
        .get('/gameSequences')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.be.instanceof(Array);
          expect(res.body.length).to.eql(1);
          res.body.forEach(gs => {
            expect(gs).to.have.property('highestItemId');
            expect(gs).to.have.property('randomSeq');
            expect(gs).to.have.property('triples');
          });
        });
    });

    it('returns an existing game sequence', () => {
      return request(api)
        .get('/gameSequences/59e148b4890c214ca70b30a2')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          expect(res.body).to.have.property('highestItemId');
          expect(res.body).to.have.property('randomSeq');
          expect(res.body).to.have.property('triples');
        });
    });

    it('returns an error if the id is wrong format', () => {
      return request(api)
        .get('/gameSequences/wrong')
        .expect(400)
        .expect(res => {
          expect(res.body).to.have.property('code','InvalidObjectId');
        });
    });

    it('returns a not found if the item does not exist', () => {
      return request(api)
        .get('/gameSequences/000000000000000000000000')
        .expect(404);
    });
  });

  describe('POST /gameSequences', () => {
    // TODO

    // it('create a game sequence', () => {
    //   return request(api)
    //     .post('/gameSequences')
    //     .send({
    //       "highestItemId":"5",
    //       "randomSeq":"ebd5cfd415832382f418a54cb5b6d780",
    //       "triples": [
    //         "59e148b4890c214ca70b3085",
    //         "59e148b4890c214ca70b307d",
    //         "59e148b4890c214ca70b3084",
    //       ]
    //     })
    //     .expect(201);
    // });
  });
});
