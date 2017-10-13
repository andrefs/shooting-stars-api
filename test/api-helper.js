import config from '../config';
import * as server from '../server';
//import {Mockgoose} from 'mockgoose';
//const mockgoose = Mockgoose(mongoose);


let api;

// before(() => {
//   return mockgoose.prepareStorage()
//     .then(() => {
//       return mongoose.connect(config.db.uri, {useMongoClient: true});
//     });
// });


before(() => {
  api = server.create();
  return api.listen(config.server.port);
});

after(() => {
  api.close();
});

export {api};
