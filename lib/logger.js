import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, prettyPrint } = format;
import config from '../config/index.cjs';

const log = createLogger({
  format: combine(
    timestamp(),
    format.colorize({ all: true }),
    //format.align(),
    format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({ level: config.log.level })
  ],
});

const stream = {
  write: msg => {
    log.info(msg);
  }
};


export { log, stream };
