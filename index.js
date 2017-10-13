// TODO drop babel when node starts supporting dynamic exports
require('babel-register');  //enables ES6 when require'ing modules
const log      = require('./lib/logger').log;
const config   = require('./config');
const server   = require('./server');        // loads server transpiling with babel
const db       = require('./db');
const passport = require('./lib/passport').default;

log.level = 'info'; // TODO read this from config or env

/**
 * Lift Server and connect to DB
 */

const api = server.create();
api.listen(config.server.port, function() {
  const conn = db.connect();

  conn.on('error', (err) => {
     log.error("Database error:", err);
  });
  conn.once('open', (err) => {
    log.info(`Connection to ${config.db.uri}`);

    log.info(
      `${api.name} v${config.version} running on http://${config.server.host}:${config.server.port} in ${config.env} environment.`
    );
	});
});

