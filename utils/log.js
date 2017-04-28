'use strict';
import bunyan        from 'bunyan';
import winston       from 'winston';
import bunyanWinston from 'bunyan-winston-adapter';

module.exports = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      timestamp: () => {
        return new Date().toString()
      },
      json: false
    }),
  ]
});

