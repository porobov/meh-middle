const winston = require('winston')
const { combine, timestamp, json, errors } = winston.format
const Telegram = require('winston-telegram').Telegram

// https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-winston-and-morgan-to-log-node-js-applications/
const errorFilter = winston.format((info, opts) => {
  return info.level === 'error' ? info : false;
});

const infoFilter = winston.format((info, opts) => {
  return info.level === 'info' ? info : false;
});

const telegramTransport = new Telegram({
  level: 'error',
  token: process.env.BOT_TOKEN !== undefined ? process.env.BOT_TOKEN : "",
  chatId: process.env.CHAT_ID !== undefined ? process.env.CHAT_ID : "",
})

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp(), json()),
    transports: [
      new winston.transports.Console({
        format: winston.format.cli()
      }),
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
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exception.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  })

  module.exports = {
    logger,
  }