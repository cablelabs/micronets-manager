/* eslint-disable no-console */
const logger = require ( './logger' );
const app = require ( './app' );
const server = app.listen (app.get('listenPort'), app.get('listenHost'));
const mano = app.get('mano')
const dw = require ( './hooks/dhcpWrapperPromise' )
const paths = require ( './hooks/servicePaths' )
const { USERS_PATH, REGISTRY_PATH, MICRONETS_PATH, DPP_PATH  } = paths
const axios = require ( 'axios' );
const DPPOnboardingStartedEvent = 'DPPOnboardingStartedEvent'
const DPPOnboardingProgressEvent = 'DPPOnboardingProgressEvent'
const DPPOnboardingFailedEvent = 'DPPOnboardingFailedEvent'
const DPPOnboardingCompleteEvent = 'DPPOnboardingCompleteEvent'
const { isEmpty } = require('./hooks/dppWrapper')


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
  let user = await hook.app.service ( `${USERS_PATH}` ).find ( {} )
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
    logger.info ( '\n Gateway message : ' + JSON.stringify ( message ) + '\t\t Type : ' + JSON.stringify ( type ) )
    const isOnBoardComplete = type == 'DPPOnboardingCompleteEvent' ? true : false
    const isOnBoardFailed = type == 'DPPOnboardingFailedEvent' ? true : false
    logger.debug('\n isOnBoardComplete : ' + JSON.stringify(isOnBoardComplete) + '\t\t isOnBoardFailed : ' + JSON.stringify(isOnBoardFailed))
  let users = await app.service (`${USERS_PATH}`).find ( {} )
  const userIndex = users.data.findIndex((user)=> user.id == subscriberId)
  if(userIndex > -1) {
    let user = users.data[ userIndex ]
    logger.debug ( '\n  User : ' + JSON.stringify ( user ) )
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

    const updateResult = await app.service ( `${USERS_PATH}` ).patch( user.id , updatedDevice )
    logger.debug('\n Updated users result : ' + JSON.stringify(updateResult.data))

    return updateResult
  }
}

async function deleteDeviceOnFailedOnBoard (message, type) {
  logger.debug('\n On-board failed. Message : ' + JSON.stringify(message) + '\t\t Type : ' + JSON.stringify(type))
  const { deviceId , macAddress , micronetId } = message.body.DPPOnboardingFailedEvent
  const { subscriberId } = mano
  logger.debug('\n\n Delete  deviceId : ' + JSON.stringify(deviceId) + '\t\t micronetId from gateway : ' + JSON.stringify(micronetId) + '\t\t subscriberId : ' + JSON.stringify(subscriberId))
  address = server.address()
  let micronetsRes = await app.service(`${MICRONETS_PATH}`).get(subscriberId)
  const { micronets } = micronetsRes
  logger.debug('\n  Micronets found : ' + JSON.stringify(micronets))
  let micronetIndex = micronets.findIndex((micronet) => micronet['class'] == micronetId)

  // Micronet found. Delete device
  if( micronetIndex > -1){
    logger.debug('\n Found micronet index : ' + JSON.stringify(micronetIndex))
    let micronetIdToDelete = micronets[micronetIndex]['micronet-id']
    logger.debug ('\n  Delete device from micronet url :  ' +JSON.stringify(`http://${app.get('listenHost')}:${app.get('listenPort')}/${MICRONETS_PATH}/${subscriberId}/micronets/${micronetIdToDelete}/devices/${deviceId}`))
    let deleteDeviceFromMicronet = await axios.delete(`http://${app.get('listenHost')}:${app.get('listenPort')}/${MICRONETS_PATH}/${subscriberId}/micronets/${micronetIdToDelete}/devices/${deviceId}`)
  }
}

async function upsertOnboardingResults (message, eventType)  {
  // Post on-boarding results to MM
  logger.debug(`\n Gateway Message : ` + JSON.stringify(message) + '\t\t EventType : ' + JSON.stringify(eventType))
  const eventToPost = message.body[eventType]
  logger.debug('\n Event to Post : ' + JSON.stringify(eventToPost))
  const onBoardingPatchBody = Object.assign({},{
    deviceId: eventToPost.deviceId,
    events: Object.assign({},{
      type: eventType,
      ...eventToPost
    })
  })
  logger.debug(`\n  OnBoarding PatchBody : ` + JSON.stringify(onBoardingPatchBody))
  const dppPatchResult =  await app.service ( `${DPP_PATH}` ).patch( eventToPost.deviceId , onBoardingPatchBody )

  // Post on-boarding results to MSO Portal
  const { msoPortalUrl, subscriberId } = mano
  const allStatus = await axios.get(`${msoPortalUrl}/portal/v1/status`)
  const isStatusCheck = allStatus.data.data.length > 0 ? allStatus.data.data.findIndex((status) => status.deviceId === eventToPost.deviceId) : -1
   if(isStatusCheck > -1){
    await axios.patch (`${msoPortalUrl}/portal/v1/status/${eventToPost.deviceId}` ,onBoardingPatchBody)
  }
}

dw.eventEmitter.on ( 'LeaseAcquired' , async ( message ) => {
  await upsertDeviceLeaseStatus ( message , 'leaseAcquiredEvent' )
} )

dw.eventEmitter.on ( 'LeaseExpired' , async ( message ) => {
  await upsertDeviceLeaseStatus ( message , 'leaseExpiredEvent' )
} )

dw.eventEmitter.on ( 'DPPOnboardingStartedEvent' , async ( message ) => {
  await upsertOnboardingResults(message,'DPPOnboardingStartedEvent')
})

dw.eventEmitter.on ( 'DPPOnboardingProgressEvent' , async ( message ) => {
  await upsertOnboardingResults( message,'DPPOnboardingProgressEvent')
})


dw.eventEmitter.on ( 'DPPOnboardingCompleteEvent' , async ( message ) => {
  await upsertOnboardingResults( message,'DPPOnboardingCompleteEvent')
  await upsertDppDeviceOnboardStatus ( message , 'DPPOnboardingCompleteEvent')
} )

dw.eventEmitter.on ( 'DPPOnboardingFailedEvent' , async ( message ) => {
  await upsertOnboardingResults( message,'DPPOnboardingFailedEvent')
  await upsertDppDeviceOnboardStatus ( message , 'DPPOnboardingFailedEvent' )
  await deleteDeviceOnFailedOnBoard ( message , 'DPPOnboardingFailedEvent' )
})

