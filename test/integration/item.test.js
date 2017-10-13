import request from 'supertest';
import config  from '../../config';
import {api}   from '../api-helper';

describe('GET /items', function() {
  it('responds with json', function() {
    return request(api)
      .get('/items')
      .expect('Content-Type', /json/)
      .expect(200);
  });
  it('responds with json', function() {
    return request(api)
      .get('/items')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});
