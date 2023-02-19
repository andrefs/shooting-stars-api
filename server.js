import config from './config/index.cjs';
import restify from 'restify';
import { log, stream } from './lib/logger.js';
import bunyanWinston from 'bunyan-winston-adapter';
import passport from './lib/passport.js';
import jwt from 'restify-jwt-community';
import url from 'url';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import corsMiddleware from 'restify-cors-middleware2';
import path from 'path';


// add routes
import routesStats from './routes/stats.js';
import routesUsers from './routes/users.js';
import routesGameInstances from './routes/gameInstances.js';
import routesMoves from './routes/playerMoves.js';
import routesTurns from './routes/turns.js';
import routesItems from './routes/items.js';
import routesPairs from './routes/pairs.js';
import routesTriples from './routes/triples.js';
import routesAdmin from './routes/admin.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let api;


const create = () => {
  /**
   * Initialize Server
   */
  log.level = process.env.LOG_LEVEL || config.log.level;
  api = restify.createServer({
    name: config.server.name,
    version: config.version,
    log: bunyanWinston.createAdapter(log),
  });


  /**
   * CORS
   */

  const cors = corsMiddleware({
    preflightMaxAge: 5,
    origins: ['*'],
    allowHeaders: ['API-Token', 'Authorization'],
    exposeHeaders: ['API-Token-Expiry']
  });

  api.pre(cors.preflight);
  api.use(cors.actual);

  /**
   * Middleware
   */
  api.use(restify.plugins.requestLogger());
  api.use(restify.plugins.acceptParser(api.acceptable));
  api.use(restify.plugins.queryParser({ mapParams: true }));
  api.use(restify.plugins.fullResponse());
  api.use(restify.plugins.bodyParser({ mapParams: true }));

  /* Static images */
  api.get('/items/images/*', restify.plugins.serveStatic({
    //directory: path.join(__dirname, config.images.folder),
    directory: path.join(__dirname, config.images.folder),
    appendRequestPath: false
  }));

  /**
   * Request id and logging
   */
  morgan.token('id', req => req.id);
  api.use((req, res, next) => { req.id = uuidv4(); return next(); });
  api.use(morgan(':id :method :url :response-time', { stream }));


  /**
   * Prevent access to unauthorized paths
   */
  var unauthPaths = [
    '/status',
    '/auth/login',
    '/auth/register',
    '/auth/registerGuest',
  ];

  api.use(jwt({
    secret: config.auth.jwt.secret,
    requestProperty: 'auth',
    getToken: function fromHeaderOrQuerystring(req) {
      if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
      } else if (req.query && req.query.token) {
        return req.query.token;
      }
      return null;
    }
  })
    .unless(req => {
      if (config.auth.disabled) {
        return true;
      }
      if (req.query.token === 'ichbintherealOG') {
        return true;
      } // hard coded super admin
      const pathname = url.parse(req.url).pathname;

      if (unauthPaths.indexOf(pathname) >= 0) {
        return true;
      }
      if (pathname.indexOf(config.images.path) === 0) {
        return true;
      }
      return false;
    }));

  if (!config.auth.disabled) {
    api.use((req, res, next) => {
      if (req.params.userId) {
        req.auth = req.auth || {};
        req.auth.sub = req.params.userId;
        delete req.params.userId;
      }
      log.info(`Request by user ${req?.auth?.sub}`);
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
  routesStats(api, passport);
  routesUsers(api, passport);
  routesGameInstances(api);
  routesMoves(api);
  routesTurns(api);
  routesItems(api);
  routesPairs(api);
  routesTriples(api);
  routesAdmin(api);

  return api;
};

const shutdown = callback => {
  api.close(callback);
};


export { create, shutdown };
