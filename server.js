import config        from './config';
import restify       from 'restify';
import mongoose      from 'mongoose';
import db            from './db';
import log           from './lib/log';
import bunyanWinston from 'bunyan-winston-adapter';
import passport      from './lib/passport';
import jwt           from 'restify-jwt';
import url           from 'url';

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
server.use(restify.plugins.jsonBodyParser({mapParams: true}));
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser({mapParams: true}));
server.use(restify.plugins.fullResponse());

/**
 * Prevent access to unauthorized paths
 */
var unauthPaths = ['/status','/login','/register'];
server.use(jwt({secret: config.auth.jwt.secret, requestProperty: 'auth'})
  .unless(req => {
    if(config.auth.disabled){ return true; }
    const pathname = url.parse(req.url).pathname;
    if(unauthPaths.indexOf(pathname) >= 0){ return true; }
    return false;
  }));

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

// add routes
require('./routes/users')(server, passport);
require('./routes/games')(server);
require('./routes/gameSequences')(server);
require('./routes/items')(server);
require('./routes/triples')(server);

export default server;
