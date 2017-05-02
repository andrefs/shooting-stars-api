import config        from './config';
import restify       from 'restify';
import mongoose      from 'mongoose';
import db            from './db';
import log           from './utils/log';
import bunyanWinston from 'bunyan-winston-adapter';

/**
 * Initialize Server
 */
global.server = restify.createServer({
  name    : config.server.name,
  version : config.version,
  log     : bunyanWinston.createAdapter(log),
});

/**
 * Middleware
 */
server.use(restify.jsonBodyParser({mapParams: true}));
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser({mapParams: true}));
server.use(restify.fullResponse());

/**
 * Error Handling
 */
server.on('uncaughtException', (req, res, route, err) => {
  log.error(err.stack);
  res.send(err);
});


server.get('/status', (req, res, next) => {
  res.setHeader('content-type', 'text/plain');
  res.send('Server is running and accepting requests!');
  next();
});

/**
 * Lift Server, Connect to DB & Bind Routes
 */
server.listen(config.server.port, function() {
  db.once('open', function(err) {
    if(err){
      log.error('Mongoose default connection error: ' + err)
      process.exit(1)
    }
    log.info(
      `${server.name} v${config.version} running on http://${config.server.host}:${config.server.port} in ${config.env} environment.`
    );

    // add routes
    require('./routes/users')(server);
    require('./routes/gameSequences')(server);
    require('./routes/items')(server);
  });

});

