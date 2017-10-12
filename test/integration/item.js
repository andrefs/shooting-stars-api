const request = require('supertest');
const server = require('../../index');
require('../mongoose-helper');


describe('GET /items', function() {
  it('responds with json', function() {
    return request(server)
      .get('/items')
      .expect('Content-Type', /json/)
      .expect(200);
  });
  it('responds with json', function() {
    return request(server)
      .get('/items')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});
