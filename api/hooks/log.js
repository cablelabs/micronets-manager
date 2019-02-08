// A hook that logs service method before, after and error
// See https://github.com/winstonjs/winston for documentation
// about the logger.
const logger = require('../logger');
//const logger = require('winston')
const util = require('util');

// To see more detailed messages, uncomment the following line:
// logger.level = 'debug';

module.exports = function () {
  return context => {
    // This debugs the service call and a stringified version of the hook context
    // You can customize the message (and logger) to your needs
    let message = `\n Hook Type: ${context.type}  Path: ${context.path}  Method: ${context.method}`;
    logger.info(message);
    
    if(typeof context.toJSON === 'function' && logger.level === 'debug') {
      logger.debug('\n Hook Context : ' + util.inspect(JSON.stringify(context), {colors: false}));
      logger.debug('\n Hook.data : ' + JSON.stringify(context.data));
      logger.debug('\n Hook.params: ' + JSON.stringify(context.params));
    }
    if (context.result) {
      logger.info('Hook.result.data : ' + JSON.stringify(context.result.data));
    }
    
    if (context.error) {
      logger.error(context.error.stack);
    }
  };
};
