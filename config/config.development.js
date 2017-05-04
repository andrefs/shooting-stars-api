'use strict'

module.exports = {
  version: '0.0.1',
  db: {
    uri: 'mongodb://localhost/shooting-stars-dev'
  },
  server: {
    name: 'shooting-stars-api',
    port: 15111,
    host: 'localhost'
  },
  auth: {
    jwt: {
      secret: 'Edit this string and keep it secret'
    }
  },
  game: {
    size: 10
  },
  env: 'development'
};
