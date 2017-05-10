import winston from 'winston';

module.exports = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      timestamp: () => {
        return new Date().toString();
      },
      json: false
    })
  ]
});

