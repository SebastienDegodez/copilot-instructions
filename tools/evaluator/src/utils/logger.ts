import pino, { type LoggerOptions } from 'pino';

const isCI = process.env['CI'] === 'true';

const loggerOptions: LoggerOptions = {
  level: process.env['LOG_LEVEL'] ?? 'info',
  ...(isCI
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
};

export const logger = pino(loggerOptions);
