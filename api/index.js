/* eslint-disable no-console */
const logger = require ( './logger' );
const app = require ( './app' );
const port = app.get ( 'port' );
const server = app.listen ( port );
const mano = app.get('mano')
const io = require ( 'socket.io' ) ( server );
const dw = require ( './hooks/dhcpWrapperPromise' )


process.on ( 'unhandledRejection' , ( reason , p ) =>
  logger.error ( 'Unhandled Rejection at: Promise ' , p , reason )
);

server.on ( 'listening' , async () => {
  logger.info ('Feathers application started on ' + JSON.stringify(`http://${app.get('host')}:${app.get('port')}`))
  let registry = await app.service ( '/mm/v1/micronets/registry' ).find ( {} )
  const registryIndex = registry.data.length > 0 ? registry.data.findIndex((registry) => registry.subscriberId == mano.subscriberId) : -1

  // Create default registry on bootup of micronets-manager
  if(registryIndex == -1 ) {
    logger.debug('\n No Registry found. Initializing Registry ... ')
    if(mano.hasOwnProperty('subscriberId') && mano.hasOwnProperty('identityUrl') && mano.hasOwnProperty('msoPortalUrl')) {
    const postRegistry = Object.assign({},{
      subscriberId : mano.subscriberId,
      identityUrl: mano.identityUrl,
      mmUrl : `http://${app.get('host')}:${app.get('port')}`,
      mmClientUrl : `http://${app.get('host')}:8080`,
      webSocketUrl: `${mano.webSocketBaseUrl}/${mano.subscriberId}`,
      msoPortalUrl: mano.msoPortalUrl,
      gatewayId: `default-gw-${mano.subscriberId}`
    })
    const result = await app.service ( '/mm/v1/micronets/registry' ).create ( postRegistry )
    if(result.data) {
      logger.debug('\n Default registry on instantiation : ' + JSON.stringify(result.data))
    }
  } else {
      throw new Error('Missing mano configuration to create default registry')
    }
  }

  // Registry present. Connect to web socket url
  if ( registryIndex!= -1 ) {
    registry = registry.data[registryIndex]
    if( registry && registry.hasOwnProperty ( 'webSocketUrl' ) ) {
      logger.info ( '\n Web Socket Url from registry : ' + JSON.stringify ( registry.webSocketUrl ) )
      await dw.setAddress ( registry.webSocketUrl );
      await dw.connect ().then ( () => { return true } );
    }
  }


  // Missing Registry. Connect to web socket url using mano configuration
  if ( mano && mano.hasOwnProperty('webSocketBaseUrl') && mano.hasOwnProperty('subscriberId') && !(registry && registry.hasOwnProperty ( 'webSocketUrl' ))) {
    const webSocketUrl = `${mano.webSocketBaseUrl}/${mano.subscriberId}`
    logger.info('\n Connecting to : ' + JSON.stringify(webSocketUrl) + ' from mano configuration ' )
    await dw.setAddress ( webSocketUrl );
    await dw.connect ().then ( () => { return true } );
  }


} );

io.on ( 'connection' , (() => logger.info ( 'Socket IO connection' )) )

app.service ('/mm/v1/micronets/registry').on('gatewayReconnect', async( data ) => {
  if(data.data.hasOwnProperty('webSocketUrl')) {
    logger.debug('\n Gateway Reconnect event fired for url : ' + JSON.stringify(data.data.webSocketUrl))
    await dw.setAddress ( data.data.webSocketUrl );
    await dw.connect ().then ( () => {
      logger.debug('\n Inside then of connect')
      return true
    } );
  }
})

async function upsertDeviceLeaseStatus ( message , type ) {
  logger.info ( '\n DeviceLease message : ' + JSON.stringify ( message ) + '\t\t Type : ' + JSON.stringify ( type ) )
  const isLeaseAcquired = type == 'leaseAcquiredEvent' ? true : false
  const eventDeviceId = isLeaseAcquired ? message.body.leaseAcquiredEvent.deviceId : message.body.leaseExpiredEvent.deviceId
  let user = await app.service ( '/mm/v1/micronets/users' ).find ( {} )
  user = user.data[ 0 ]
  const deviceIndex = user.devices.findIndex ( ( device ) => device.deviceId.toLocaleLowerCase () == eventDeviceId.toLocaleLowerCase () )
  const updatedDevice = Object.assign ( {} ,
    {
      ...user.devices[ deviceIndex ] ,
      deviceLeaseStatus : isLeaseAcquired ? 'positive' : 'intermediary'
    } )
  user.devices[ deviceIndex ] = updatedDevice
  const updateResult = await app.service ( '/mm/v1/micronets/users' ).update ( user._id , Object.assign ( {} , {
    id : user.id ,
    name : user.name ,
    ssid : user.ssid ,
    devices : user.devices
  } ) )
  return updateResult
}

dw.eventEmitter.on ( 'LeaseAcquired' , async ( message ) => {
  await upsertDeviceLeaseStatus ( message , 'leaseAcquiredEvent' )
} )

dw.eventEmitter.on ( 'LeaseExpired' , async ( message ) => {
  await upsertDeviceLeaseStatus ( message , 'leaseExpiredEvent' )
} )



