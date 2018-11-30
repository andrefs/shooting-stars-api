import got from 'got';
import config from '../config';
import {log} from '../lib/logger';

const url = `http://${config.server.host}:${config.server.port}/admin/rebuildOrder?token=ichbintherealOG`;

console.log('Fetching url', url);
got(url,{json:true})
  .then(resp => {
    console.log(resp.body);
    log.warn(`Pairs order rebuilt, waited ${resp.body.lockWait}s for the lock and took ${resp.body.rebuildTime}s to produce ${resp.body.relevantTriples} relevant triples and ${resp.body.orderedPairs} ordered pairs`);
    //process.exit(0);
  })
  .catch(err => {
    console.log(err.response.body);
  });


// const db       = require('../db');
// const conn = db.connect();
// import Pair             from '../models/Pair';
// 
// conn.once('open', (err) => {
//   Pair.rebuildOrder()
//     .then(() => process.exit(0));
// });
