import fs from 'fs';
import log from '../lib/log';

// Config files priority (only one gets loaded):
// - test (if NODE_ENV === test
// - local (if config/config.local.js exists)
// - production (if NODE_ENV === production)
// - development (if NODE_ENV === development)

if(process.env.NODE_ENV === 'test'){
    let file = './config.test.js';
    log.info(`Loading config info from ${file}`);
    module.exports = require(file);
} else {
    try {
        let file = './config.local.js';
        fs.accessSync(file);
        log.info(`Loading config info from ${file}`);
        module.exports = require(file);
    } catch(er){
        if(process.env.NODE_ENV === 'production'){
            let file = './config.production.js';
            log.info(`Loading config info from ${file}`);
            module.exports = require(file);
        } else {
            let file = './config.development.js';
            log.info(`Loading config info from ${file}`);
            module.exports = require(file);
        }
    }
}

