/* eslint-disable no-console */
const logger = require ( './logger' );
const app = require ( './app' );
const server = app.listen (app.get('listenPort'), app.get('listenHost'));
const mano = app.get('mano')
// const io = require ( 'socket.io' ) ( server );
const dw = require ( './hooks/dhcpWrapperPromise' )
const paths = require ( './hooks/servicePaths' )
const { USERS_PATH, REGISTRY_PATH  } = paths
// const dotenv = require('dotenv');
// dotenv.config();
// const {subscriberId, identityUrl, webSocketBaseUrl, msoPortalUrl} = require('./config')
const isEmpty = function ( data ) {
  if ( typeof(data) === 'object' ) {
    if ( JSON.stringify ( data ) === '{}' || JSON.stringify ( data ) === '[]' ) {
      return true;
    } else if ( !data ) {
      return true;
    }
    return false;
  } else if ( typeof(data) === 'string' ) {
    if ( !data.trim () ) {
      return true;
    }
    return false;
  } else if ( typeof(data) === 'undefined' ) {
    return true;
  } else {
    return false;
  }
}

process.on ( 'unhandledRejection' , ( reason , p ) =>
  logger.error ( 'Unhandled Rejection at: Promise ' , p , reason )
);


server.on ( 'listening' , async () => {
  address = server.address()
  logger.info ('Feathers application started on ' + JSON.stringify(`http://${address.address}:${address.port}`))
  logger.info ('Public base URL: ' + JSON.stringify(`${app.get('publicBaseUrl')}`))
  let registry = await app.service ( '/mm/v1/micronets/registry' ).find ( {} )
  const registryIndex = registry.data.length > 0 ? registry.data.findIndex((registry) => registry.subscriberId == mano.subscriberId) : -1

  // Create default registry on bootup of micronets-manager
  if(registryIndex == -1 ) {
    logger.debug('\n No Registry found. Initializing Registry ... ')
    logger.debug('\n Mano web socket base url : ' + JSON.stringify(mano.webSocketBaseUrl) + '\t\t MSO Portal url : ' + JSON.stringify(mano.msoPortalUrl))
    if(mano.hasOwnProperty('subscriberId') && mano.hasOwnProperty('identityUrl') && mano.hasOwnProperty('msoPortalUrl')) {
      const postRegistry = Object.assign({},{
        subscriberId : mano.subscriberId,
        identityUrl: mano.identityUrl,
        mmUrl : `${app.get('publicBaseUrl')}`,
        mmClientUrl : `${app.get('publicAppBaseUrl')}`,
        webSocketUrl: `${mano.webSocketBaseUrl}/${mano.subscriberId}`,
        msoPortalUrl: mano.msoPortalUrl,
        gatewayId: `default-gw-${mano.subscriberId}`
      })
      const result = await app.service ( `${REGISTRY_PATH}` ).create ( postRegistry )
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

// io.on ( 'connection' , (() => logger.info ( 'Socket IO connection' )) )

app.service (`${REGISTRY_PATH}`).on('gatewayReconnect', async( data ) => {
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
  let user = await app.service ( `${USERS_PATH}` ).find ( {} )
  user = user.data[ 0 ]
  const deviceIndex = user.devices.findIndex ( ( device ) => device.deviceId.toLocaleLowerCase () == eventDeviceId.toLocaleLowerCase () )
  const updatedDevice = Object.assign ( {} ,
    {
      ...user.devices[ deviceIndex ] ,
      deviceLeaseStatus : isLeaseAcquired ? 'positive' : 'intermediary'
    } )
  user.devices[ deviceIndex ] = updatedDevice
  const updateResult = await app.service ( `${USERS_PATH}` ).patch( user.id , Object.assign ( {} , {
    id : user.id ,
    name : user.name ,
    ssid : user.ssid ,
    devices : user.devices
  } ) )
  return updateResult
}

async function upsertDppDeviceOnboardStatus ( message , type ) {
  const { subscriberId } = app.get('mano')
  let eventDeviceId = '' , eventMacAddress = '', eventMicronetId = ''
    logger.info ( '\n Dpp Onboard message : ' + JSON.stringify ( message ) + '\t\t Type : ' + JSON.stringify ( type ) )
    const isOnBoardComplete = type == 'DPPOnboardingCompleteEvent' ? true : false
    const isOnBoardFailed = type == 'DPPOnboardingFailedEvent' ? true : false
    logger.debug('\n isOnBoardComplete : ' + JSON.stringify(isOnBoardComplete) + '\t\t isOnBoardFailed : ' + JSON.stringify(isOnBoardFailed))
  let users = await app.service (`${USERS_PATH}`).find ( {} )
  const userIndex = users.data.findIndex((user)=> user.id == subscriberId)
  if(userIndex > -1) {
    let user = users.data[ userIndex ]
    logger.debug ( '\n  user : ' + JSON.stringify ( user ) )
    if ( isOnBoardComplete ) {
      const { deviceId , macAddress , micronetId } = message.body.DPPOnboardingCompleteEvent
      eventDeviceId = deviceId
      eventMicronetId = micronetId
      eventMacAddress = macAddress
    }

    if ( isOnBoardFailed ) {
      const { deviceId , macAddress , micronetId } = message.body.DPPOnboardingFailedEvent
      eventDeviceId = deviceId
      eventMicronetId = micronetId
      eventMacAddress = macAddress
    }
    const deviceIndex = user.devices.findIndex ( ( device ) => device.deviceId.toLocaleLowerCase () == eventDeviceId.toLocaleLowerCase () )
    const updatedDevice = Object.assign ( {} ,
      {
        ...user.devices[ deviceIndex ] ,
        deviceLeaseStatus : isOnBoardComplete ? 'positive' : isOnBoardFailed ? 'negative' : 'intermediary' ,
        onboardStatus : isOnBoardComplete ? 'complete' : isOnBoardFailed ? 'failed' : 'initial' ,
        micronetId : eventMicronetId
      } )
    user.devices[ deviceIndex ] = updatedDevice
    logger.debug('\n\n Updated user devices : ' + JSON.stringify(user.devices))
    const updateResult = await app.service ( `${USERS_PATH}` ).patch ( user._id , Object.assign ( {} , {
      id : user.id ,
      name : user.name ,
      ssid : user.ssid ,
      devices : user.devices
    } ) )
    logger.debug('\n Updated users result : ' + JSON.stringify(updateResult.data))
    return updateResult
  }
}



dw.eventEmitter.on ( 'LeaseAcquired' , async ( message ) => {
  await upsertDeviceLeaseStatus ( message , 'leaseAcquiredEvent' )
} )

dw.eventEmitter.on ( 'LeaseExpired' , async ( message ) => {
  await upsertDeviceLeaseStatus ( message , 'leaseExpiredEvent' )
} )

dw.eventEmitter.on ( 'DPPOnboardingCompleteEvent' , async ( message ) => {
  await upsertDppDeviceOnboardStatus ( message , 'DPPOnboardingCompleteEvent')
} )

dw.eventEmitter.on ( 'DPPOnboardingFailedEvent' , async ( message ) => {
  await upsertDppDeviceOnboardStatus ( message , 'DPPOnboardingFailedEvent' )
})

