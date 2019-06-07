var axios = require ( 'axios' );
const omit = require ( 'ramda/src/omit' );
const logger = require ( './../../logger' );
const paths = require ( './../../hooks/servicePaths' )
const { DPP_PATH , MICRONETS_PATH, DHCP_PATH, USERS_PATH, MSO_DPP_API_ONBOARD, MSO_STATUS_PATH  } = paths
const DPP_ONBOARD = `/${DPP_PATH}/onboard`
const DPP_CONFIG = `/${DPP_PATH}/config`
var random = require ( 'random-hex-character-generator' );
const { upsertSubnetsToMicronet, mockOdlOperationsForUpserts, addDhcpSubnets, isEmpty, addDevicesInSubnet, addDhcpDevices } = require('./../../hooks/micronetWrapper')
const DPP_ON_BOARD_TYPE = 'dpp'
const WIFI = 'wifi'
const START_ON_BOARD = 'initial'
const INTERMEDIATE_ON_BOARD = 'in_progress'
const COMPLETE_ON_BOARD = 'complete'
const DPPOnboardingStartedEvent = 'DPPOnboardingStartedEvent'
const DPPOnboardingProgressEvent = 'DPPOnboardingProgressEvent'
const DPPOnboardingFailedEvent = 'DPPOnboardingFailedEvent'
const DPPOnboardingCompleteEvent = 'DPPOnboardingCompleteEvent'
const dw = require ( './../../hooks/dhcpWrapperPromise' )
const omitMeta = omit ( [ 'updatedAt' , 'createdAt'  , '__v', '_id' ] );
var child_process = require('child_process');
const defaultDPPMudUrl = 'https://alpineseniorcare.com/micronets-mud/AgoNDQcDDgg'

const fetchAndPostOnboardingResults = async(hook) => {
  const { onBoardCompleteEvents, onBoardFailedEvents } = await fetchGatewayOnboardingEvents(hook)
}

const fetchGatewayOnboardingEvents = async(hook) => {
  const onboardingCompleteEvents = [
    {
      eventType: 'DPPOnboardingStartedEvent'
    },
    {
      eventType: 'DPPOnboardingProgressEvent'
    },
    {
      eventType: 'DPPOnboardingCompleteEvent'
    }
  ]

  const onboardingFailedEvents = [
    {
      eventType: 'DPPOnboardingStartedEvent'
    },
    {
      eventType: 'DPPOnboardingProgressEvent'
    },
    {
      eventType: 'DPPOnboardingFailedEvent'
    }
  ]

  const eventOnboardingCompletePromises = onboardingCompleteEvents.map(async(onBoardEvent) => {
    let eventDeviceId  = '', eventMacAddress = '', eventMicronetId = '' , eventReason = '', onboardingDevicesWithEvents = [], onboardingEvents = []
    logger.debug('\n Current on-board event being processed ... ' + JSON.stringify(onBoardEvent.eventType))
    return await dw.eventEmitter.on ( `${onBoardEvent.eventType}` , async ( message ) => {
      logger.debug(`Event  ${onBoardEvent.eventType} emitted with data : ` + JSON.stringify(message))
  return message
      // if(onBoardEvent.eventType ==  'DPPOnboardingStartedEvent'){
      //   const { body: { DPPOnboardingStartedEvent : { deviceId, macAddress, micronetId, reason } }} = message
      //   eventDeviceId = deviceId
      //   eventMacAddress = macAddress
      //   eventMicronetId = micronetId
      //   eventReason = reason
      // }
      //
      // if(onBoardEvent.eventType ==  'DPPOnboardingProgressEvent'){
      //   const { body: { DPPOnboardingProgressEvent : { deviceId, macAddress, micronetId, reason } }} = message
      //   eventDeviceId = deviceId
      //   eventMacAddress = macAddress
      //   eventMicronetId = micronetId
      //   eventReason = reason
      // }
      //
      // if(onBoardEvent.eventType ==  'DPPOnboardingCompleteEvent'){
      //   const { body: { DPPOnboardingCompleteEvent : { deviceId, macAddress, micronetId, reason } }} = message
      //   eventDeviceId = deviceId
      //   eventMacAddress = macAddress
      //   eventMicronetId = micronetId
      //   eventReason = reason
      // }
      // onboardingDevicesWithEvents = onboardingDevicesWithEvents.concat(Object.assign({},{
      //   deviceId: eventDeviceId,
      //   events : onboardingEvents.concat(Object.assign({},{
      //     type: `${onBoardEvent.eventType}`,
      //     macAddress: eventMacAddress,
      //     micronetId: eventMicronetId,
      //     reason: eventReason
      //   }))
      // }))

      // return onboardingDevicesWithEventslogger.debug('\n onboardingDevicesWithEvents : ' + JSON.stringify(onboardingDevicesWithEvents))
      // await upsertOnboardingResults(hook,onboardingDevicesWithEvents)
    })
  })

  const eventOnboardingFailedPromises = onboardingCompleteEvents.map(async(onBoardEvent) => {
    let eventDeviceId  = '', eventMacAddress = '', eventMicronetId = '' , eventReason = '', onboardingDevicesWithEvents = [], onboardingEvents = []
    logger.debug('\n Current on-board event being processed ... ' + JSON.stringify(onBoardEvent.eventType))
    return await dw.eventEmitter.on ( `${onBoardEvent.eventType}` , async ( message ) => {
      logger.debug(`Event  ${onBoardEvent.eventType} emitted : ` + JSON.stringify(message))
      return message
      // if(onBoardEvent.eventType ==  'DPPOnboardingStartedEvent'){
      //   const { body: { DPPOnboardingStartedEvent : { deviceId, macAddress, micronetId, reason } }} = message
      //   eventDeviceId = deviceId
      //   eventMacAddress = macAddress
      //   eventMicronetId = micronetId
      //   eventReason = reason
      // }
      //
      // if(onBoardEvent.eventType ==  'DPPOnboardingProgressEvent'){
      //   const { body: { DPPOnboardingProgressEvent : { deviceId, macAddress, micronetId, reason } }} = message
      //   eventDeviceId = deviceId
      //   eventMacAddress = macAddress
      //   eventMicronetId = micronetId
      //   eventReason = reason
      // }
      //
      // if(onBoardEvent.eventType ==  'DPPOnboardingFailedEvent'){
      //   const { body: { DPPOnboardingFailedEvent : { deviceId, macAddress, micronetId, reason } }} = message
      //   eventDeviceId = deviceId
      //   eventMacAddress = macAddress
      //   eventMicronetId = micronetId
      //   eventReason = reason
      // }
      onboardingDevicesWithEvents = onboardingDevicesWithEvents.concat(Object.assign({},{
        deviceId: eventDeviceId,
        events : onboardingEvents.concat(Object.assign({},{
          type: `${onBoardEvent.eventType}`,
          macAddress: eventMacAddress,
          micronetId: eventMicronetId,
          reason: eventReason
        }))
      }))
      // logger.debug('\n onboardingDevicesWithEvents : ' + JSON.stringify(onboardingDevicesWithEvents))
      // return onboardingDevicesWithEvents
      // await upsertOnboardingResults(hook,onboardingDevicesWithEvents)
    })
  })

  const onboardingSuccessResults = await Promise.all(eventOnboardingCompletePromises)
  const onboardingFailedResults = await Promise.all(eventOnboardingFailedPromises)

  logger.debug('\n onboardingSuccessResults : ' + JSON.stringify(onboardingSuccessResults))
  logger.debug('\n onboardingFailedResults : ' + JSON.stringify(onboardingFailedResults))
  return Object.assign({ onBoardCompleteEvents: onboardingSuccessResults, onBoardFailedEvents:  onboardingFailedResults})
}

const wait = function ( ms ) {
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

const randHex = (len) => {
  var maxlen = 8,
      min = Math.pow(16,Math.min(len,maxlen)-1)
  max = Math.pow(16,Math.min(len,maxlen)) - 1,
    n   = Math.floor( Math.random() * (max-min+1) ) + min,
    r   = n.toString(16);
  while ( r.length < len ) {
    r = r + randHex( len - maxlen );
  }
  return r;
};

const generateDevicePSK = async ( hook , len ) => {
  // A 32-bit PSK (64 hex digits) hex-encoded WPA key or 6-63 character ASCII password
  let length = len ? len : 64
  logger.debug('\n Length of psk to generate : ' + JSON.stringify(length))
  const generatedPSK =  randHex ( length )
  logger.debug('\n Generated PSK : ' + JSON.stringify(generatedPSK))
  return generatedPSK
}

const getDeviceId = async(hook) => {
  const { data } = hook
  const { subscriberId, bootstrap, device, user } = data
  return bootstrap.pubkey.split('+')[0]
}

const runCurlCmd = async(hook,cmd) => {
  var resp = child_process.execSync(cmd);
  var result = resp.toString('UTF8');
  return result;
}

const micronetExistsCheck = async(hook) => {
   const { data } = hook
   const micronets = await hook.app.service(`${MICRONETS_PATH}`).get(data.subscriberId)
   logger.debug('\n Subscriber : ' + JSON.stringify(data.subscriberId) + '\t\t Micronets : ' + JSON.stringify(micronets.micronets))
   const dppDeviceClassIndex = micronets.micronets.findIndex((micronet) => micronet.class == data.device.class)
   logger.debug('\n dppDeviceClassIndex : ' + JSON.stringify(dppDeviceClassIndex))
   return dppDeviceClassIndex
}

const getMudUri = async(hook) => {
  const { data } = hook
  const {bootstrap, user, device} = data
  const { registryUrl, registerDeviceUrl } = hook.app.get('mud')
  const registerDevice = `${registerDeviceUrl}/${bootstrap.vendor}/${device.modelUID}/${bootstrap.pubkey}`
  const dppRegistryMudUrl = `${registryUrl}/${bootstrap.vendor}/${bootstrap.pubkey}`
  logger.debug('\n Register Device Url : ' + JSON.stringify(registerDevice) + '\t\t  MudUrl ' +JSON.stringify(dppRegistryMudUrl))

  // Register device
  const registerDeviceCurl = `curl -L -X POST \"${registerDevice}\"`
  const registerDeviceRes = runCurlCmd(hook,registerDeviceCurl);
  console.log(registerDeviceRes);

  // Get MUD URL
  if(registerDeviceRes){
    const getMudUrlCurl = `curl -L -X GET \"${dppRegistryMudUrl}\"`
    const getMudUrlRes = runCurlCmd(hook,getMudUrlCurl);
    console.log(getMudUrlRes);
    return getMudUrlRes
  }
  else {
    return Promise.reject(new errors.GeneralError(new Error('Error occured to obtain MUD url')))
  }

 //  const dppMudUrl = 'https://alpineseniorcare.com/micronets-mud/AgoNDQcDDgg'
 // logger.debug('\n DPP MUD URL : ' + (dppMudUrl))

}

const validateDppRequest = async(hook) => {
  const { data , params } = hook
  const {bootstrap, user, device } = data
  if(isEmpty(bootstrap) || isEmpty(user) || isEmpty(device)) {
    return Promise.reject(new errors.BadRequest(new Error('Missing Request parameters')))
  }

  const validBootstrapRequest = bootstrap.hasOwnProperty('uri') && bootstrap.hasOwnProperty('pubkey')
    && bootstrap.hasOwnProperty('vendor') && bootstrap.hasOwnProperty('mac') ? true : false
  const validUserRequest = user.hasOwnProperty('deviceRole') && user.hasOwnProperty('deviceName') ? true : false
  const validDeviceRequest = device.hasOwnProperty('class') ? true : false
  logger.debug('\n validBootstrapRequest : ' + JSON.stringify(validBootstrapRequest))
  logger.debug('\n validUserRequest : ' + JSON.stringify(validUserRequest))
  logger.debug('\n validDeviceRequest :  '  + JSON.stringify(validDeviceRequest) )

  if(!validBootstrapRequest) {
    return Promise.reject(new errors.BadRequest(new Error('Missing request parameters on bootstrap object')))
  }

  if(!validUserRequest) {
    return Promise.reject(new errors.BadRequest(new Error('Missing request parameters on validUserRequest object')))
  }

  if(!validDeviceRequest) {
    return Promise.reject(new errors.BadRequest(new Error('Missing request parameters on validUserRequest object')))
  }

  const isValidDppRequest = validBootstrapRequest && validUserRequest && validDeviceRequest
  logger.debug('\n isValidDppRequest : ' + JSON.stringify(isValidDppRequest))
  return isValidDppRequest
}

const upsertOnboardingResults = async(hook,onboardingEvents) => {
  logger.debug('\n upsertOnboardingResults  On-boarding events  : ' + JSON.stringify(onboardingEvents))
  const { data } = hook
  const { subscriberId, bootstrap, device, user } = data
  const deviceId = await getDeviceId(hook)
  const dppResults = await hook.app.service(`${DPP_ONBOARD}`).get(subscriberId)
  logger.debug('\n DPP response : ' + JSON.stringify(dppResults))
  const deviceIndex = dppResults.devices.length > 0 ? dppResults.devices.findIndex((device) => device.deviceId ==  deviceId) : -1
  logger.debug('\n DeviceIndex : ' + JSON.stringify(deviceIndex))

  if(deviceIndex == -1) {
    await hook.app.service(`${DPP_ONBOARD}`).patch(subscriberId, Object.assign({},{
      devices: onboardingEvents
    }))
  }
  else {
    let allEvents = []
   await onboardingEvents.forEach(async(onBoardEvent) => {
      logger.debug('\n Current onboardEvent : ' + JSON.stringify(onBoardEvent) + '\t\t DeviceId : ' + JSON.stringify(deviceId))
      if(onBoardEvent.deviceId == deviceId) {
        allEvents =  allEvents.concat(onBoardEvent.events)
        return allEvents
      }
    })
    logger.debug('\n All Events : ' + JSON.stringify(allEvents) + '\t\t dppResults.devices[deviceIndex].events : ' + JSON.stringify(dppResults.devices[deviceIndex].events))
    dppResults.devices[deviceIndex].events = allEvents
    logger.debug('\n Updated devices  : ' + JSON.stringify(dppResults.devices))
    await hook.app.service(`${DPP_ONBOARD}`).patch(subscriberId, Object.assign({},{
      devices: dppResults.devices
    }))
  }
}

const postOnboardingResultsToMSO = async(hook) => {
  logger.debug('\n postOnboardingResultsToMSO hook.data :' + JSON.stringify(hook.data))
  const onBoardResult = await hook.app.service(`${DPP_ONBOARD}`).get(hook.data.subscriberId)
  logger.debug('\n On board result from MM : ' + JSON.stringify(onBoardResult))
  const msoDppPost = omitMeta(onBoardResult)
  logger.debug('\n MSO DPP Post : ' + JSON.stringify(msoDppPost))
  const { msoPortalUrl } = hook.app.get('mano')
  logger.debug('\n MSO POST URI : ' + JSON.stringify(`${msoPortalUrl}/${MSO_DPP_API_ONBOARD}`))
  const onBoardResponse = await axios.post (`${msoPortalUrl}/portal/v1/status` ,  msoDppPost)
}

const postOnboardingResults = async(hook) => {
  let onboardingEvents = [], onboardingDevicesWithEvents = []
  const { data } = hook
  const dpps = await hook.app.service(`${DPP_PATH}`).find({})
  const dppIndex = dpps.data.findIndex((dpp) => dpp.subscriberId == data.subscriberId)
  logger.debug('\n Dpp Index : ' + JSON.stringify(dppIndex))
  const deviceId = await getDeviceId(hook)


  await dw.eventEmitter.on ( 'DPPOnboardingStartedEvent' , async ( message ) => {
   logger.debug(`Event  ${DPPOnboardingStartedEvent} emitted : ` + JSON.stringify(message))
    const { body: { DPPOnboardingStartedEvent : {macAddress, micronetId, reason} }} = message
    onboardingDevicesWithEvents = onboardingDevicesWithEvents.concat(Object.assign({},{
       deviceId: deviceId,
       events : onboardingEvents.concat(Object.assign({},{
         type: `${DPPOnboardingStartedEvent}`,
         macAddress: macAddress,
         micronetId: micronetId,
         reason:reason
       }))
    }))
    logger.debug('\n onboardingDevicesWithEvents : ' + JSON.stringify(onboardingDevicesWithEvents))
    await upsertOnboardingResults(hook,onboardingDevicesWithEvents)
  })

  await dw.eventEmitter.on ( 'DPPOnboardingProgressEvent' , async ( message ) => {
    logger.debug(`Event ${DPPOnboardingProgressEvent} emitted ... ` + JSON.stringify(message))
    const { body: { DPPOnboardingProgressEvent : {macAddress, micronetId, reason} }} = message
    onboardingDevicesWithEvents = onboardingDevicesWithEvents.concat(Object.assign({},{
      deviceId: deviceId,
      events : onboardingEvents.concat(Object.assign({},{
        type: `${DPPOnboardingProgressEvent}`,
        macAddress: macAddress,
        micronetId: micronetId,
        reason:reason
      }))
    }))
    await upsertOnboardingResults(hook,onboardingDevicesWithEvents)
  })

  await dw.eventEmitter.on ( 'DPPOnboardingFailedEvent' , async ( message ) => {
    logger.debug(`Event ${DPPOnboardingFailedEvent} emitted ... ` + JSON.stringify(message))
    const { body: { DPPOnboardingFailedEvent : {macAddress, micronetId, reason} }} = message
    onboardingDevicesWithEvents = onboardingDevicesWithEvents.concat(Object.assign({},{
      deviceId: deviceId,
      events : onboardingEvents.concat(Object.assign({},{
        type: `${DPPOnboardingFailedEvent}`,
        macAddress: macAddress,
        micronetId: micronetId,
        reason:reason
      }))
    }))
    const patchResult = await upsertOnboardingResults(hook,onboardingDevicesWithEvents)
      wait(4000); //4 seconds in milliseconds
     // if(patchResult){
       const postResult = await postOnboardingResultsToMSO(hook)
    // }
  })

  await dw.eventEmitter.on ( 'DPPOnboardingCompleteEvent' , async ( message ) => {
    logger.debug(`Event ${DPPOnboardingCompleteEvent} emitted ... ` + JSON.stringify(message))
    const { body: { DPPOnboardingCompleteEvent : {macAddress, micronetId, reason} }} = message
    onboardingDevicesWithEvents = onboardingDevicesWithEvents.concat(Object.assign({},{
      deviceId: deviceId,
      events : onboardingEvents.concat(Object.assign({},{
        type: `${DPPOnboardingCompleteEvent}`,
        macAddress: macAddress,
        micronetId: micronetId,
        reason:reason
      }))
    }))
    const patchResult = await upsertOnboardingResults(hook,onboardingDevicesWithEvents)
    wait(4000); //4 seconds in milliseconds
    const postResult = await postOnboardingResultsToMSO(hook)
  })

}

const onboardDppDevice = async(hook) => {
  const { data } = hook
  const {bootstrap, user, device} = data
  let emitterResult = ''

  //Retrieve mud-uri from mud-registry using vendor and pubkey parameters
  const dppMudUrl = await getMudUri(hook)

  //Generate PSK for device
  const dppDevicePsk = await generateDevicePSK(hook, 64)
  logger.debug('\n Device PSK : ' + JSON.stringify(dppDevicePsk))

  //Add device to users api
  const userPatchBody = Object.assign({},{
    deviceId: bootstrap.pubkey.split('+')[0],
    macAddress: bootstrap.mac,
    isRegistered: false,
    deviceName: user.deviceName,
    class: device.class,
    deviceConnection: WIFI,
    mudUrl: dppMudUrl,
    onboardType: DPP_ON_BOARD_TYPE,
    onboardStatus: START_ON_BOARD,
    psk: dppDevicePsk
  })
  const addDppDeviceToUser = await hook.app.service ( `${USERS_PATH}` ).patch ( data.subscriberId , userPatchBody);
 logger.debug('\n\n OnBoard DPP Device addDppDeviceToUser ' + JSON.stringify(addDppDeviceToUser.data))

  // Check if micronet exists
 const dppDeviceClassIndex = await micronetExistsCheck(hook)

  // Create micronet and add dhcp subnet class
  if( dppDeviceClassIndex == -1 ) {
    logger.debug('\n Micronet class does not exist.Create micronet and add dpp device')
    const postMicronetBody =  Object.assign({},{
      micronets: [Object.assign({},{
        name: data.device.class,
        class: data.device.class,
        "micronet-subnet-id": data.device.class
      })]
    })
   logger.debug('\n DPP ON-BOARD DEVICE POST BODY MICRONET : ' + JSON.stringify(postMicronetBody))
    const { postBodyForODL , addSubnet }  = await upsertSubnetsToMicronet ( hook , postMicronetBody, data.subscriberId )
    logger.debug('\n ODL Post Body : ' + JSON.stringify(postBodyForODL) + '\t AddSubnet Flag : ' + JSON.stringify(addSubnet))
    if ( addSubnet ) {
      // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
      const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL, Object.assign({},{subscriberId:data.subscriberId}) )
      /* Update DB with ODL Response */
      logger.debug("\n\n ODL Response : " + JSON.stringify(odlResponse))
      if ( odlResponse.data && odlResponse.status == 201 ) {
        const patchResult = await hook.app.service (`${MICRONETS_PATH}`).patch ( data.subscriberId , { micronets :  odlResponse.data.micronets } );
        logger.debug('\n PATCH RESULT : ' + JSON.stringify(patchResult))
        if ( patchResult ) {
          const dhcpSubnets = await addDhcpSubnets ( hook , postMicronetBody )
          logger.debug('\n DHCP SUBNETS : ' + JSON.stringify(dhcpSubnets))
         // return { dhcpSubnets, patchResult } // Comment later
        }
      }
    }
  }
    logger.debug('\n Micronet to add dpp device exists. Add device to micronet and dhcp subnet')

  // Add device to micronet and add device to dhcp subnet
  const micronetsFromDb = await hook.app.service(`${MICRONETS_PATH}`).get(data.subscriberId)
  logger.debug('\n Micronets from database : ' + JSON.stringify(micronetsFromDb))

  const micronetToUpsertIndex = micronetsFromDb.micronets.findIndex((micronet) => micronet['class'] == data.device.class)

  if(micronetToUpsertIndex != -1 ) {
    const micronetIdToUpsert = micronetsFromDb.micronets[ micronetToUpsertIndex ][ 'micronet-id' ]
    const subnetIdToUpsert = micronetsFromDb.micronets[ micronetToUpsertIndex ][ 'micronet-subnet-id' ]

    const dppDevicesToAddToMicronetPost = Object.assign ( {} , {
      deviceName : hook.data.user.deviceName ,
      deviceId : hook.data.bootstrap.pubkey.split ( '+' )[ 0 ] ,
      macAddress : hook.data.bootstrap.mac ,
      onboardType : DPP_ON_BOARD_TYPE ,
      onboardStatus : START_ON_BOARD
    } )

    const dppDevicesToAddToDhcpPost = Object.assign ( {} , {
      "micronets" : [
        {
          "connected-devices" : [
            {
              "device-name" : hook.data.user.deviceName ,
              "device-id" : hook.data.bootstrap.pubkey.split ( '+' )[ 0 ] ,
              "device-mac" : hook.data.bootstrap.mac
            }
          ]
        }
      ]
    } )

    logger.debug ( '\n DPP DEVICES TO ADD TO MICRONET : ' + JSON.stringify ( dppDevicesToAddToMicronetPost ) )
    const postBodyForODL = await addDevicesInSubnet ( hook , micronetIdToUpsert , subnetIdToUpsert , dppDevicesToAddToMicronetPost )
    logger.debug ( '\n DPP Post Body for ODL : ' + JSON.stringify ( postBodyForODL ) )
    const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign ( {} , {
      micronetId : micronetIdToUpsert ,
      subnetId : subnetIdToUpsert ,
      subscriberId : data.subscriberId
    } ) )
    logger.debug ( '\n DPP ODL Response : ' + JSON.stringify ( odlResponse ) )
    if ( odlResponse.status == 201 && odlResponse.data ) {
      const patchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( data.subscriberId ,
        {
          micronets : odlResponse.data.micronets
        } );
      logger.debug ( '\n\n Add Device to subnet response : ' + JSON.stringify ( patchResult ) )
      if ( patchResult ) {
        logger.debug ( '\n DPP DEVICES TO ADD TO DHCP : ' + JSON.stringify ( dppDevicesToAddToDhcpPost ) )
        const addedDhcpDevices = await addDhcpDevices ( hook , dppDevicesToAddToDhcpPost , micronetIdToUpsert , subnetIdToUpsert )
        logger.debug('\n Added DHCP Devices : ' + JSON.stringify(addedDhcpDevices))
        if(addedDhcpDevices.length > 0) {
          logger.debug('\n On-board device ... ')

          // PUT request to on-board device
          // const { gatewayUrl } = hook.app.get('mano')
          const mmUrl = `http://${hook.app.get('host')}:${hook.app.get('port')}`
          const deviceId = hook.data.bootstrap.pubkey.split ( '+' )[ 0 ]
          const gatewayPutBody = Object.assign({},{
            dpp: {
              uri: hook.data.bootstrap.uri,
              akms: ["psk"]
            }
          })
          // const onBoardPutReqUrl  = `${gatewayUrl}/${subnetIdToUpsert}/devices/${deviceId}/onboard`
          //const onBoardResponse = await axios.put (`${onBoardPutReqUrl}` ,  gatewayPutBody)
          logger.debug('\n  deviceId : ' + JSON.stringify(deviceId) + '\t\t\t gatewayPutBody : ' + JSON.stringify(gatewayPutBody))
          const onBoardResponse =  await dw.send(Object.assign({},gatewayPutBody), 'PUT','onboard',subnetIdToUpsert, deviceId)
          logger.debug('\n On Board Response data : ' + JSON.stringify(onBoardResponse.data) + '\t\t status : ' + JSON.stringify(onBoardResponse.status))
          if(onBoardResponse.status == 200) {
            await postOnboardingResults(hook)
          }
        }
      }
    }
  }
}

const reInitializeDppOnboarding = async(hook) => {
  const { data , params } = hook
  const { requestHeaders , requestUrl } = params
  logger.debug('\n reInitializeDppOnboarding data : ' + JSON.stringify(data))
  if(data.subscriberId) {
    logger.debug(`\n DPP Remove hook for ${data.subscriberId}`)
    const dppDevices = await hook.app.service(`${DPP_PATH}`).find({})
    const dppDeviceIndex = dppDevices.data.length > 0 ? dppDevices.data.findIndex((dppDevice) => dppDevice.subscriberId == data.subscriberId) : -1
    logger.debug('\n Dpp Device Index : ' + JSON.stringify(dppDeviceIndex))
    const { msoPortalUrl } = hook.app.get('mano')
    if(dppDeviceIndex > -1){
      // await hook.app.service(`${DPP_PATH}`).remove(data.subscriberId)
       await hook.app.service(`${DPP_PATH}`).remove(null)
      await axios.delete(`http://${hook.app.get('host')}:${hook.app.get('port')}/${MICRONETS_PATH}/${data.subscriberId}/micronets`)
      // await axios.delete(`${msoPortalUrl}/${MSO_STATUS_PATH}/${data.subscriberId}`)
       await axios.delete(`${msoPortalUrl}/${MSO_STATUS_PATH}`)
    }
  }
}

const startDppOnBoarding = async(hook) => {
  const { data , params } = hook
  const { requestHeaders , requestUrl } = params
  if ( validateDppRequest ( hook ) ) {
    const {dppOnboardDeviceIndex, user } = await checkUserAndDeviceToOnboard(hook)
    if ( dppOnboardDeviceIndex == -1 ) {
      logger.debug ( '\n Device ' + JSON.stringify ( data.bootstrap.mac ) + '\t not present. On-boarding device ... ' )
      const dppResult = await onboardDppDevice ( hook )
      logger.debug('\n Dpp on-boarding result : ' + JSON.stringify(dppResult))
      hook.result = dppResult
      return Promise.resolve(hook)
    }
  }
}

const checkUserAndDeviceToOnboard = async(hook) => {
  const {data, params } = hook
  const allUsers = await hook.app.service ( `${USERS_PATH}` ).find({})
  if(allUsers.data.length == 0) {
    logger.debug('\n No user present.Create default user .... ')
    const { msoPortalUrl } = hook.app.get('mano')
    let subscriber  =  await axios.get(`${msoPortalUrl}/portal/v1/subscriber/${hook.data.subscriberId}`)
    subscriber = subscriber.data
    logger.debug('\n\n Subscriber from MSO Portal : ' + JSON.stringify(subscriber))
    const userPostBody =  Object.assign({},{
      id: subscriber.id,
      name: subscriber.name,
      ssid: subscriber.ssid,
      devices: []
    })
    logger.debug('\n\n msoPortalUrl : ' + JSON.stringify(msoPortalUrl) + '\t\t userPostBody  : ' + JSON.stringify(userPostBody))
    const user = await hook.app.service(`${USERS_PATH}`).create(userPostBody)
  }
  const users = await hook.app.service ( `${USERS_PATH}` ).get ( data.subscriberId )
  logger.debug ( '\n Current devices for subscriber : ' + JSON.stringify ( users ) )
  const dppOnboardDeviceIndex = users.devices.findIndex ( ( device ) => device.macAddress == data.bootstrap.mac )
  logger.debug ( '\n dppOnboardDeviceIndex  : ' + JSON.stringify ( dppOnboardDeviceIndex ) )
  return Object.assign({ dppOnboardDeviceIndex: dppOnboardDeviceIndex, user: users })
}

module.exports = {
  before : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [
      async ( hook ) => {
        const { data , params } = hook
        const { requestHeaders , requestUrl } = params
        logger.debug ( '\n\n Micronet DPP HOOK requestHeaders : ' + JSON.stringify ( requestHeaders ) + '\t\t requestUrl  : ' + JSON.stringify ( requestUrl ) )
        logger.debug ( '\n\n Micronet DPP HOOK params : ' + JSON.stringify ( params ) + '\t\t data  : ' + JSON.stringify ( data ) )
        if ( requestUrl == DPP_ONBOARD ) {
          logger.debug ( '\n\n MM DPP ONBOARD PATH ... ' + JSON.stringify ( requestUrl ) + '\t\t DATA : ' + JSON.stringify ( data ) )
          if ( validateDppRequest ( hook ) ) {
            const {dppOnboardDeviceIndex, user } = await checkUserAndDeviceToOnboard(hook)
            if ( dppOnboardDeviceIndex == -1 ) {
              logger.debug ( '\n Device ' + JSON.stringify ( data.bootstrap.mac ) + '\t not present. On-boarding device ... ' )
              const dppResult = await onboardDppDevice ( hook )
              logger.debug('\n Dpp on-boarding result : ' + JSON.stringify(dppResult))
              hook.result = dppResult
              return Promise.resolve(hook)
            }
            else {
              logger.debug ( '\n Device ' + JSON.stringify ( data.bootstrap.mac ) + '\t present. Do nothing ... ' )

              // TODO : Initiate Delete sequence and re-onboard device
                await reInitializeDppOnboarding(hook)
                wait(3000) // 3 seconds in milliseconds wait
                await startDppOnBoarding(hook)
               // hook.result = Object.assign({},{message: `Device ${data.bootstrap.mac} on-boarded already`})
               // return Promise.resolve(hook)
            }
          }
        }
      }
    ] ,
    update : [] ,
    patch : [] ,
    remove : []
  } ,

  after : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [
      async(hook) => {

      }
    ] ,
    update : [] ,
    patch : [
      async(hook) => {
      const {data} = hook
       logger.debug('\n Patch Hook.result :  ' + JSON.stringify(hook.result) +'\t\t for post data : ' + JSON.stringify(data))
      }
    ] ,
    remove : []
  }
  ,

  error : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [] ,
    update : [] ,
    patch : [] ,
    remove : []
  }
}
;
