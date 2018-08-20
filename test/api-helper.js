import config      from '../config';
import * as server from '../server';
import * as db     from '../db';
const Promise  = require('bluebird');
const serverShutdown = Promise.promisify(server.shutdown);

// import {Mockgoose} from 'mockgoose';
// const mockgoose = new Mockgoose(db.mongoose);

let api;
let conn;

before(() => {
  api = server.create();
  api.listen(config.server.port);
  // mockgoose.prepareStorage()
  //   .then(db.connect);
  db.connect();
});

after(() => {
  return serverShutdown()
    .then(() => db.disconnect());
});

export {api};
