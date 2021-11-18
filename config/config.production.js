const pjson    = require('../package.json')
const process  = require('process');

module.exports = {
  version: pjson.version,
  db: {
    host: process.env.MONGODB_HOST || 'localhost',
    port: process.env.MONGODB_PORT || '27017',
    name: process.env.MONGODB_NAME || 'shooting-stars-prod',
    user: process.env.MONGODB_USER || undefined,
    pass: process.env.MONGODB_PASS || undefined,
    //debug: true
  },
  server: {
    name: 'shooting-stars-api',
    port: 15111,
    host: 'localhost'
  },
  auth: {
    disabled: false,
    jwt: {
      secret: 'Edit this string and keep it secret'
    }
  },
  game: {
    size: 10,
    scores: {
      win: 10
    }
  },
  gameApp: {
    url: 'http://localhost:15112'
  },
  env: 'production',
  log: {
    db: true,
    level: 'silly',
    dir: '/tmp'
  },
  loadItems: {
    folder: process.env.LOAD_ITEMS_FOLDER || '/data/items',
    file: 'items.json',
  },
  images: {
    folder: 'images',
    path: '/items/images'
  }
};
