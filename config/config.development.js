const pjson    = require('../package.json')

module.exports = {
  version: pjson.version,
  db: {
    uri: 'mongodb://localhost:27017/shooting-stars-usertest'
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
  env: 'development',
  log: {
    db: false,
    level: 'info',
    dir: '/tmp'
  },
  images: {
    folder: 'images',
    path: '/items/images'
  }
};
