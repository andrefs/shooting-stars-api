import winston from 'winston';

const log = new winston.Logger({
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
  write: (msg, encoding) => {
    log.info(msg);
  }
}


export {log, stream};
