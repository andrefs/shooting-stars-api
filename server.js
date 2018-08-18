import config         from './config';
import restify        from 'restify';
import mongoose       from 'mongoose';
import {log, stream}  from './lib/logger';
import bunyanWinston  from 'bunyan-winston-adapter';
import passport       from './lib/passport';
import jwt            from 'restify-jwt';
import url            from 'url';
import morgan         from 'morgan';
import uuid           from 'uuid';
import corsMiddleware from 'restify-cors-middleware';

let api;


const create = () => {
  /**
   * Initialize Server
   */
  log.level = process.env.LOG_LEVEL || config.log.level;
  api = restify.createServer({
    name    : config.server.name,
    version : config.version,
    log     : bunyanWinston.createAdapter(log),
  });


  /**
   * CORS
   */

  const cors = corsMiddleware({
    preflightMaxAge: 5,
    origins: ['*'],
    allowHeaders: ['API-Token'],
    exposeHeaders: ['API-Token-Expiry']
  });

  api.pre(cors.preflight);
  api.use(cors.actual);

  /**
   * Middleware
   */
  api.use(restify.plugins.requestLogger());
  api.use(restify.plugins.jsonBodyParser({mapParams: true}));
  api.use(restify.plugins.acceptParser(api.acceptable));
  api.use(restify.plugins.queryParser({mapParams: true}));
  api.use(restify.plugins.fullResponse());

  /**
   * Request id and logging
   */
  morgan.token('id', function getId (req) {
    return req.id
  });
  api.use((req,res,next) => { req.id = uuid.v4(); return next(); });
  api.use(morgan(':id :method :url :response-time',{stream}));

  /**
   * Prevent access to unauthorized paths
   */
  var unauthPaths = ['/status','/login','/auth/register'];
  api.use(jwt({secret: config.auth.jwt.secret, requestProperty: 'auth'})
    .unless(req => {
      if(config.auth.disabled){ return true; }
      const pathname = url.parse(req.url).pathname;
      if(unauthPaths.indexOf(pathname) >= 0){ return true; }
      return false;
    }));
  if(config.auth.disabled){
    api.use((req, res, next) => {
      if(req.params.userId){
        req.auth = req.auth || {};
        req.auth.sub = req.params.userId;
        delete req.params.userId;
      }
      return next();
    });
  }

  /**
   * Error Handling
   */
  api.on('uncaughtException', (req, res, route, err) => {
    log.error(err.stack);
    res.send(err);
  });


  api.get('/status', (req, res, next) => {
    res.setHeader('content-type', 'text/plain');
    res.send('API is running and accepting requests!');
    next();
  });

  // add routes
  require('./routes/stats')(api, passport);
  require('./routes/users')(api, passport);
  require('./routes/gameInstances')(api);
  require('./routes/playerMoves')(api);
  require('./routes/turns')(api);
  require('./routes/items')(api);
  require('./routes/pairs')(api);
  require('./routes/triples')(api);
  require('./routes/admin')(api);

  return api;
};

const shutdown = callback => {
  api.close(callback);
};


export {create, shutdown};
