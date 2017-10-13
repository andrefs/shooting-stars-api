import config      from '../config';
import * as server from '../server';
import * as db     from '../db';
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
  api.close();
  db.disconnect();
});

export {api};
