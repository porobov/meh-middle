const winston = require('winston')
const { combine, timestamp, json, errors } = winston.format
const TelegramLogger = require('winston-telegram')

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
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp(), json()),
    transports: [
      consoleTransport,
      new winston.transports.File({
        filename: 'logs/combined.log',
      }),
      new winston.transports.File({
        filename: 'logs/app-error.log',
        level: 'error',
        format: combine(errorFilter(), timestamp(), json()),
      }),
      new winston.transports.File({
        filename: 'logs/app-info.log',
        level: 'info',
        format: combine(infoFilter(), timestamp(), json()),
      }),
      // new TelegramLogger({
      //   level: 'error',
      //   token: process.env.BOT_TOKEN !== undefined ? process.env.BOT_TOKEN : "",
      //   chatId: process.env.CHAT_ID !== undefined ? process.env.CHAT_ID : "",
      //   format: combine(errorFilter(), timestamp(), json()),
      // }),
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