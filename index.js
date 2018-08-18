// TODO drop babel when node starts supporting dynamic exports
require('babel-register');  //enables ES6 when require'ing modules
const log      = require('./lib/logger').log;
const config   = require('./config');
const server   = require('./server');        // loads server transpiling with babel
const db       = require('./db');
const passport = require('./lib/passport').default;
const Promise  = require('bluebird');
const serverShutdown = Promise.promisify(server.shutdown);

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


// this function is called when you want the server to die gracefully
// i.e. wait for existing connections
const gracefulShutdown = function() {
  log.warn("Received kill signal, shutting down gracefully.");
  return serverShutdown()
    .then(() => db.disconnect())
    .then(() => {
      log.warn("Closed out remaining connections.");

      process.exit();

      // if after
      setTimeout(function() {
         log.warn("Could not close connections in time, forcefully shutting down");
         process.exit();
      }, 10*1000);
    });
}

let shuttingDown = false;

// listen for TERM signal .e.g. kill
process.on ('SIGTERM', () => {
  if(!shuttingDown){
    shuttingDown = true;
    return gracefulShutdown();
  }
});

// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', () => {
  if(!shuttingDown){
    shuttingDown = true;
    return gracefulShutdown();
  }
});
