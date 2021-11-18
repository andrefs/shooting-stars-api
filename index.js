import { log } from './lib/logger.js';
import config from './config/index.cjs';
import * as server from './server.js';
import * as db from './db.js';
import passport from './lib/passport.js';
import Item from './models/Item.js';
import Promise from 'bluebird';
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const serverShutdown = Promise.promisify(server.shutdown);

const createImagesFolder = async () => {
  const imagesFolder = path.join(__dirname, config.images.folder);
  return fs.access(imagesFolder)
    .catch(() => {
      log.info(`Folder ${imagesFolder} does not exist, creating...`);
      fs.mkdir(imagesFolder);
      log.info(`Created folder ${imagesFolder}`);
    })
    .catch(err => {
      log.warn(`Error creating folder ${imagesFolder}`, err);
      throw err;
    });
};

const loadItemsJson = async () => {
  const loadItems = config.loadItems;
  if (!loadItems) {
    return;
  }

  const x = await Item.findOne();
  if (x) {
    log.info('Items collection already populated, skipping loading items from file...');
    return;
  }

  const jfile = path.join(loadItems.folder, loadItems.file);
  return fs.access(jfile)
    .then(() => {
      log.info(`Loading items from file ${jfile}`);
      const itemsData = JSON.parse(await fs.readFile(jfile, 'utf8')).map(item => {
        item.tmpPath = path.join(config.loadItems.folder, item.imagePath);
        return item;
      });
      return Promise.all(itemsData.map(item => Item.loadItem(item)));
    })
    .catch(e => {
      if (e.code && e.code === 'ENOENT') {
        log.info(`File ${jfile} not found, skipping loading items from file...`);
      } else {
        log.warn(`Error accessing file ${jfile}`, e);
        throw e;
      }
    });
};


db.connect()
  .then(() => {
    const conn = db.mongoose.connection;
    conn.on('error', (err) => {
      log.error('Mongoose connection error: ' + err);
      process.exit(1);
    });

    log.info(`Connection to ${db.uri}`);
    createImagesFolder()
      .then(() => loadItemsJson())
      .then(() => {
        const api = server.create();

        api.listen(config.server.port, function() {
          log.info(
            `${api.name} v${config.version} ` +
              `running on http://${config.server.host}:${config.server.port} ` +
              `in ${config.env} environment.`
          );
        });
      });
  });


// this function is called when you want the server to die gracefully
// i.e. wait for existing connections
const gracefulShutdown = function() {
  log.info('Received kill signal, shutting down gracefully.');
  return serverShutdown()
    .then(() => db.disconnect())
    .then(() => {
      log.info('Closed out remaining connections.');

      process.exit();

      // if after
      setTimeout(function() {
        log.warn('Could not close connections in time, forcefully shutting down');
        process.exit();
      }, 10 * 1000);
    });
};

let shuttingDown = false;

// listen for TERM signal .e.g. kill
process.on('SIGTERM', () => {
  if (!shuttingDown) {
    shuttingDown = true;
    return gracefulShutdown();
  }
});

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', () => {
  if (!shuttingDown) {
    shuttingDown = true;
    return gracefulShutdown();
  }
});
