import winston from 'winston';
import config from '../config';

const log = new winston.Logger({
  level: config.log.level,
  transports: [
    new (winston.transports.Console)({
      timestamp: () => {
        return new Date().toISOString();
      },
      json: false,
      colorize: true
    })
  ]
});

const stream = {
  write: msg => {
    log.info(msg);
  }
};


export {log, stream};
