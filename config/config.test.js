module.exports = {
  version: '0.0.1',
  db: {
    uri: 'mongodb://localhost/shooting-stars-test'
  },
  server: {
    name: 'shooting-stars-api',
    port: 15121,
    host: 'localhost'
  },
  auth: {
    disabled: true,
    jwt: {
      secret: 'Edit this string and keep it secret'
    }
  },
  game: {
    size: 2,
    scores: {
      win: 50
    }
  },
  env: 'test',
  log: {
    db: false,
    level: 'warn',
    dir: '/tmp'
  }
};
