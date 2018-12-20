const { createLogger, format, transports } = require('winston');
const path = require('path');
// Configure the Winston logger. For the complete documentation seee https://github.com/winstonjs/winston
const env = process.env.NODE_ENV || 'development';

const logger = createLogger({
  // To see more detailed errors, change this to 'debug'
  level: 'info',
  format: format.combine(
    format.label({ label: path.basename(module.filename) }),
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
     format.printf(info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`)
  ),
  transports: [
    new transports.Console()
  ],
});

module.exports = logger;
