// TODO drop babel when node starts supporting dynamic exports
require('babel-register');  //enables ES6 when require'ing modules
const log      = require('./lib/logger').log;
const config   = require('./config');
const server   = require('./server').default;        // loads server transpiling with babel
const db       = require('./db').default;
const passport = require('./lib/passport').default;

log.level = 'info';



/**
 * Lift Server, Connect to DB & Bind Routes
 */
server.listen(config.server.port, function() {
  db.once('open', (err) => {
    log.info(`Connection to ${config.db.uri}`);

    log.info(
      `${server.name} v${config.version} running on http://${config.server.host}:${config.server.port} in ${config.env} environment.`
    );
	});
});

