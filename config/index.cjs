const fs = require('fs')

// Config files priority (only one gets loaded):
// - test (if NODE_ENV === test
// - local (if config/config.local.js exists)
// - production (if NODE_ENV === production)
// - development (if NODE_ENV === development)


if (process.env.NODE_ENV === 'test') {
  let file = './config.test.cjs';
  console.log(`Loading config info from ${file}`);
  module.exports = require(file);
} else {
  try {
    let file = './config.local.cjs';
    fs.accessSync(file);
    console.log(`Loading config info from ${file}`);
    module.exports = require(file);
  } catch (er) {
    if (process.env.NODE_ENV === 'production') {
      let file = './config.production.cjs';
      console.log(`Loading config info from ${file}`);
      module.exports = require(file);
    } else {
      let file = './config.development.cjs';
      console.log(`Loading config info from ${file}`);
      module.exports = require(file);
    }
  }
}
