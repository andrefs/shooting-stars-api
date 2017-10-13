import config        from './config';
import restify       from 'restify';
import mongoose      from 'mongoose';
import {log, stream} from './lib/logger';
import bunyanWinston from 'bunyan-winston-adapter';
import passport      from './lib/passport';
import jwt           from 'restify-jwt';
import url           from 'url';
import morgan        from 'morgan';
import uuid          from 'node-uuid';

let api;


const create = () => {
  /**
   * Initialize Server
   */
  log.level = config.log.level;
  api = restify.createServer({
    name    : config.server.name,
    version : config.version,
    log     : bunyanWinston.createAdapter(log),
  });

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
  var unauthPaths = ['/status','/login','/register'];
  api.use(jwt({secret: config.auth.jwt.secret, requestProperty: 'auth'})
    .unless(req => {
      if(config.auth.disabled){ return true; }
      const pathname = url.parse(req.url).pathname;
      if(unauthPaths.indexOf(pathname) >= 0){ return true; }
      return false;
    }));

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
  require('./routes/users')(api, passport);
  require('./routes/games')(api);
  require('./routes/gameSequences')(api);
  require('./routes/items')(api);
  require('./routes/triples')(api);

  return api;
};

const shutdown = () => {
  api.close();
};


export {create, shutdown};
