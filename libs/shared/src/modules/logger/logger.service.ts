import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class WinstonLogger implements LoggerService {
  instanceLogger: winston.Logger;

  constructor(instanceLogger?: winston.Logger) {
    this.instanceLogger = instanceLogger;
  }

  log(message: any, context?: string) {
    this.instanceLogger.info(`[${context}] ${message}`);
  }

  fatal(message: any, context?: string) {
    this.instanceLogger.error(`[${context}] ${message}`);
  }

  error(message: any, stack?: any, context?: string) {
    // console.log(message, stack, context);
    this.instanceLogger.error(`[${context}] ${message}`, stack);
  }

  warn(message: any, context?: string) {
    this.instanceLogger.warn(`[${context}] ${message}`);
  }

  debug?(message: any, context?: string) {
    this.instanceLogger.debug(`[${context}] ${message}`);
  }

  verbose?(message: any, context?: string) {
    this.instanceLogger.verbose(`[${context}] ${message}`);
  }
}
