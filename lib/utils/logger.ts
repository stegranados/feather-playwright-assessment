import winston from 'winston';
import path from 'path';

interface LoggerOptions {
  filename?: string;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

/**
 * Creates a Winston logger instance.
 */
export default function logger(options?: LoggerOptions): winston.Logger {
  const filename = options?.filename
    ? path.basename(options.filename, path.extname(options.filename))
    : 'test';

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { source: filename },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        ),
      }),
    ],
  });
}
