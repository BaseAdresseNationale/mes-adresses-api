import * as dotenv from 'dotenv';
import * as winston from 'winston';

const customFormat = winston.format.printf(
  ({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level}]: ${message}\n${stack}\n`;
    }
    return `${timestamp} [${level}]: ${message}`;
  },
);

dotenv.config();

let format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize({ all: true }),
  customFormat,
);

if (process.env.NODE_ENV === 'production') {
  format = winston.format.simple();
}

export const Logger = winston.createLogger({
  format,
  transports: [new winston.transports.Console()],
});
