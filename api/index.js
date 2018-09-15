/* eslint-disable no-console */
const logger = require ( './logger' );
const app = require ( './app' );
const port = app.get ( 'port' );
const server = app.listen ( port );
const io = require ( 'socket.io' ) ( server );

process.on ( 'unhandledRejection' , ( reason , p ) =>
  logger.error ( 'Unhandled Rejection at: Promise ' , p , reason )
);

server.on ( 'listening' , () =>
  logger.info ( 'Feathers application started on http://%s:%d' , app.get ( 'host' ) , port )
);

io.on ( 'connection' , (() => logger.info ( 'Socket IO connection' )) )

app.service ( '/mm/v1/micronets/users' ).on ( 'userCreate' , ( data ) => {
  console.log ( '\n FeatherJS event userCreate fired with data : ' + JSON.stringify ( data ) )
  io.on ( 'connection' , ( socket ) => {
    logger.info ( 'Socket IO connection with data : ' + JSON.stringify ( data ) )
    socket.emit ( 'userCreate' , data );
    socket.on ( 'disconnect' , () => {
      console.log ( '\n Socket IO disconnect' + JSON.stringify ( socket.id ) + 'with Data : ' + JSON.stringify ( data ) )
      socket.removeAllListeners ( 'send message' );
      socket.removeAllListeners ( 'disconnect' );
      socket.removeAllListeners ( 'connection' );
      socket.disconnect ( true );
    } );
  } );
} );
app.service ( '/mm/v1/micronets/users' ).on ( 'userDeviceAdd' , ( data ) => {
  console.log ( '\n FeatherJS event userDeviceAdd fired with data : ' + JSON.stringify ( data ) )
  io.on ( 'connection' , ( socket ) => {
    logger.info ( 'Socket IO connection with data : ' + JSON.stringify ( data ) )
    socket.emit ( 'userDeviceAdd' , data );
    socket.on ( 'disconnect' , () => {
      console.log ( '\n Socket IO disconnect' + JSON.stringify ( socket.id ) + 'with Data : ' + JSON.stringify ( data ) )
      socket.removeAllListeners ( 'send message' );
      socket.removeAllListeners ( 'disconnect' );
      socket.removeAllListeners ( 'connection' );
      socket.disconnect ( true );
    } );
  } );
} );

app.service ( '/mm/v1/micronets/users' ).on ( 'userDeviceRegistered' , ( data ) => {
  console.log ( '\n FeatherJS event userDeviceRegistered fired with data : ' + JSON.stringify ( data ) )
  io.on ( 'connection' , ( socket ) => {
    logger.info ( 'Socket IO connection with data : ' + JSON.stringify ( data ) )
    socket.emit ( 'userDeviceRegistered' , data );
    socket.on ( 'disconnect' , () => {
      console.log ( '\n Socket IO disconnect' + JSON.stringify ( socket.id ) + 'with Data : ' + JSON.stringify ( data ) )
      socket.removeAllListeners ( 'send message' );
      socket.removeAllListeners ( 'disconnect' );
      socket.removeAllListeners ( 'connection' );
      socket.disconnect ( true );
    } );
  } );
} );

app.service ( '/mm/v1/micronets' ).on ( 'micronetUpdated' , ( data ) => {
  console.log ( '\n FeatherJS event micronetUpdated fired with data : ' + JSON.stringify ( data ) )
  io.on ( 'connection' , ( socket ) => {
    logger.info ( 'Socket IO connection with data : ' + JSON.stringify ( data ) )
    socket.emit ( 'micronetUpdated' , data );
    socket.on ( 'disconnect' , () => {
      console.log ( '\n Socket IO disconnect' + JSON.stringify ( socket.id ) + 'with Data : ' + JSON.stringify ( data ) )
      socket.removeAllListeners ( 'send message' );
      socket.removeAllListeners ( 'disconnect' );
      socket.removeAllListeners ( 'connection' );
      socket.disconnect ( true );
    } );
  } );
} );

