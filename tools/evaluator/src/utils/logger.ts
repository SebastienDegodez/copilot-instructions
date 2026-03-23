import pino from 'pino';

const isCI = process.env['CI'] === 'true';

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: isCI
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
});
