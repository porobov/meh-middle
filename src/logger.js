const winston = require('winston')
const { combine, timestamp, json, errors } = winston.format
const TelegramLogger = require('winston-telegram')
const DailyRotateFile = require('winston-daily-rotate-file')

// https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-winston-and-morgan-to-log-node-js-applications/
const errorFilter = winston.format((info, opts) => {
  return info.level === 'error' ? info : false;
});

const infoFilter = winston.format((info, opts) => {
  return info.level === 'info' ? info : false;
});

const consoleTransport = new winston.transports.Console({
        format: winston.format.cli()
      })


const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    format: combine(errors({ stack: true }), timestamp(), json()),
    transports: [
      consoleTransport,
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH',
        maxSize: '20m',
        maxFiles: '14d',
      }),
      new DailyRotateFile({
        filename: 'logs/app-error-%DATE%.log',
        level: 'error',
        format: combine(errorFilter(), timestamp(), json()),
        datePattern: 'YYYY-MM-DD-HH',
        maxSize: '20m',
        maxFiles: '14d',
      }),
      new DailyRotateFile({
        filename: 'logs/app-info-%DATE%.log',
        level: 'info',
        format: combine(infoFilter(), timestamp(), json()),
        datePattern: 'YYYY-MM-DD-HH',
        maxSize: '20m',
        maxFiles: '14d',
      }),
      new TelegramLogger({
        level: 'error',
        token: process.env.BOT_TOKEN !== undefined ? process.env.BOT_TOKEN : "",
        chatId: process.env.CHAT_ID !== undefined ? process.env.CHAT_ID : "",
        format: combine(errorFilter(), timestamp(), json()),
      }),
    ],
    // exceptionHandlers: [
    //   new winston.transports.File({ filename: 'logs/exception.log' }),
    //   consoleTransport,
    // ],
    // rejectionHandlers: [
    //   new winston.transports.File({ filename: 'logs/rejections.log' }),
    //   consoleTransport,
    // ],
  })

  module.exports = {
    logger,
  }