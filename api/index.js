/* eslint-disable no-console */
const logger = require('./logger');
const app = require('./app');
const port = app.get('port');
const server = app.listen(port);
const io = require('socket.io')(server);

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);

server.on('listening', () =>
  logger.info('Feathers application started on http://%s:%d', app.get('host'), port)
);

io.on('connection' , (() => logger.info('SOCKET IO CONNECTION ')))

io.on('connection' , (socket) => {
  app.service('/mm/v1/micronets/users').on('userCreate' ,(data) => {
     console.log('\n FeatherJS event userCreate fired with data : ' + JSON.stringify(data))
    socket.emit('userCreate', data);
  });
  app.service('/mm/v1/micronets/users').on('userDeviceAdd' ,(data) => {
     console.log('\n FeatherJS event userDeviceAdd fired with data : ' + JSON.stringify(data))
    socket.emit('userDeviceAdd', data);
  });
});
