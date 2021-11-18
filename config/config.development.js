const pjson    = require('../package.json')

module.exports = {
  version: pjson.version,
  db: {
    //uri: 'mongodb://localhost:27017/ss-prod'
    // uri: 'mongodb://localhost:27017/shooting-stars-pictures'
    uri: 'mongodb://localhost:27017/shooting-stars-dev'
    //uri: 'mongodb://ShootingStarsUser:MuchY34airals@andrefs.com:37623/boyd1-copy?authSource=admin'
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
    db: true,
    level: 'silly',
    dir: '/tmp'
  },
  images: {
    folder: 'images',
    path: '/items/images'
  }
};
