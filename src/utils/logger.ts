import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';

const logsDir = path.resolve(process.cwd(), 'reports', 'logs');
fs.mkdirSync(logsDir, { recursive: true });

/**
 * Structured logger — console + reports/logs/execution.log (FRAMEWORK.md §6).
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const base = `${timestamp} [${level}] ${message}`;
      return stack ? `${base}\n${stack}` : base;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'execution.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});
