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
   // logger.debug('\n Subscriber : ' + JSON.stringify(data.subscriberId) + '\t\t Micronets : ' + JSON.stringify(micronets.micronets))
   const dppDeviceClassIndex = micronets.micronets.findIndex((micronet) => micronet.class == data.device.class)
  // logger.debug('\n dppDeviceClassIndex : ' + JSON.stringify(dppDeviceClassIndex))
   return dppDeviceClassIndex
}

const getMudUri = async(hook) => {
  const { data } = hook
  const {bootstrap, user, device} = data
  const { registryUrl, registerDeviceUrl } = hook.app.get('mud')
  const registerDevice = `${registerDeviceUrl}/${bootstrap.vendor}/${device.modelUID}/${bootstrap.pubkey}`
  const dppRegistryMudUrl = `${registryUrl}/${bootstrap.vendor}/${bootstrap.pubkey}`
  logger.debug('\n Register Device Url : ' + JSON.stringify(registerDevice) + '\t\t  MudUrl ' +JSON.stringify(dppRegistryMudUrl))

  // Register device with curl commands
  const registerDeviceCurl = `curl -L -X  POST \"${registerDevice}\"`
  const registerDeviceRes = runCurlCmd(hook,registerDeviceCurl);
  console.log(registerDeviceRes);

  // Get MUD URL with curl commands
  if(registerDeviceRes){
    const getMudUrlCurl = `curl -L -X  GET \"${dppRegistryMudUrl}\"`
    const getMudUrlRes = runCurlCmd(hook,getMudUrlCurl);
    console.log(getMudUrlRes);
    return getMudUrlRes
  }
  else {
    return Promise.reject(new errors.GeneralError(new Error('Error occured to obtain MUD url')))
  }
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

const upsertOnboardingResults = async(hook,onboardingEvents, eventDeviceId) => {
  logger.debug('\n Upsert On-boarding  Events  : ' + JSON.stringify(onboardingEvents) + '\t\t Event DeviceId : ' + JSON.stringify(eventDeviceId))
  const { data } = hook
  const { subscriberId, bootstrap, device, user } = data
  const dppResults = await hook.app.service(`${DPP_ONBOARD}`).get(subscriberId)
  logger.debug('\n DPP response : ' + JSON.stringify(dppResults))
  const deviceIndex = dppResults.devices.length > 0 ? dppResults.devices.findIndex((device) => device.deviceId ==  eventDeviceId) : -1
  logger.debug('\n DeviceIndex : ' + JSON.stringify(deviceIndex))

  if(deviceIndex == -1) {
    const dppPatchResponse = await hook.app.service(`${DPP_ONBOARD}`).patch(subscriberId, Object.assign({},{
      devices: Object.assign({
        deviceId: eventDeviceId,
        events:onboardingEvents
      })
    }))
    return dppPatchResponse
  }
  if(deviceIndex != -1) {
    let allEvents = []
   await onboardingEvents.forEach(async(onBoardEvent) => {
      logger.debug('\n Current onboardEvent : ' + JSON.stringify(onBoardEvent) )
      if(dppResults.devices[deviceIndex].deviceId.toString() == eventDeviceId.toString()) {
        allEvents =  allEvents.concat(onBoardEvent)
        return allEvents
      }
    })
    logger.debug('\n All Events : ' + JSON.stringify(allEvents) + '\t\t dppResults.devices[deviceIndex].events : ' + JSON.stringify(dppResults.devices[deviceIndex].events))
    dppResults.devices[deviceIndex].events = dppResults.devices[deviceIndex].events.concat(allEvents) // TODO: Wont work add concat or something
    logger.debug('\n Updated devices  : ' + JSON.stringify(dppResults.devices))
    const dppPatchResponse = await hook.app.service(`${DPP_ONBOARD}`).patch(subscriberId, Object.assign({},{
      devices: dppResults.devices
    }))
    return dppPatchResponse
  }
}

const postOnboardingResultsToMSO = async(hook) => {
  const onBoardResult = await hook.app.service(`${DPP_ONBOARD}`).get(hook.data.subscriberId)
  const msoDppPost = omitMeta(onBoardResult)
  logger.debug('\n MSO DPP Post : ' + JSON.stringify(msoDppPost))
  const { msoPortalUrl, subscriberId } = hook.app.get('mano')
  logger.debug('\n MSO POST STATUS URI : ' + JSON.stringify(`${msoPortalUrl}/portal/v1/status`))
  const allStatus = await axios.get(`${msoPortalUrl}/portal/v1/status`)
  const isStatusCheck = allStatus.data.length > 0 ? allStatus.data.findIndex((status) => status.subscriberId == subscriberId) : -1
  logger.debug('\n  isStatusCheck : ' + JSON.stringify(isStatusCheck))
  if(isStatusCheck == -1){
   logger.debug('\n Inside if isStatusCheck : ' + JSON.stringify(isStatusCheck))
    await axios.post (`${msoPortalUrl}/portal/v1/status` ,  msoDppPost)
  }
  if(isStatusCheck != -1) {
    const msoDppPut = Object.assign({}, { devices: msoDppPost.devices })
    logger.debug('\n Inside else isStatusCheck : ' + JSON.stringify(isStatusCheck) + '\t\t msoDppPut : ' + JSON.stringify(msoDppPut))
    await axios.patch(`${msoPortalUrl}/portal/v1/status/${subscriberId}`, msoDppPut)
  }
}

const postOnboardingResults = async(hook) => {
  const { data } = hook
  const dpps = await hook.app.service(`${DPP_PATH}`).find({})
  const dppIndex = dpps.data.findIndex((dpp) => dpp.subscriberId == data.subscriberId)
  logger.debug('\n Dpp Index : ' + JSON.stringify(dppIndex))
  const deviceId = await getDeviceId(hook)
  logger.debug('\n Device ID  : ' + JSON.stringify(deviceId))
  await dw.eventEmitter.on ( 'DPPOnboardingStartedEvent' , async ( message ) => {
   let onboardingEvents = []
   logger.debug(`Event  ${DPPOnboardingStartedEvent} emitted : ` + JSON.stringify(message))
    const { body: { DPPOnboardingStartedEvent : { macAddress, micronetId, reason} }} = message
    onboardingEvents = onboardingEvents.concat(Object.assign({},{
         type: `${DPPOnboardingStartedEvent}`,
         macAddress: macAddress,
         micronetId: micronetId,
         reason:reason
    }))
    logger.debug('\n On-boarding Events : ' + JSON.stringify(onboardingEvents))
    await upsertOnboardingResults(hook,onboardingEvents, deviceId)
  })

  await dw.eventEmitter.on ( 'DPPOnboardingProgressEvent' , async ( message ) => {
    let onboardingEvents = []
    logger.debug(`Event ${DPPOnboardingProgressEvent} emitted ... ` + JSON.stringify(message))
    const { body: { DPPOnboardingProgressEvent : {macAddress, micronetId, reason} }} = message
    onboardingEvents = onboardingEvents.concat(Object.assign({},{
      type: `${DPPOnboardingProgressEvent}`,
      macAddress: macAddress,
      micronetId: micronetId,
      reason:reason
    }))
   logger.debug('\n On-boarding Events : ' + JSON.stringify(onboardingEvents))
   await upsertOnboardingResults(hook,onboardingEvents, deviceId, deviceId)
  })

  await dw.eventEmitter.on ( 'DPPOnboardingFailedEvent' , async ( message ) => {
    let onboardingEvents = []
    logger.debug(`Event ${DPPOnboardingFailedEvent} emitted ... ` + JSON.stringify(message))
    const { body: { DPPOnboardingFailedEvent : {macAddress, micronetId, reason} }} = message
    onboardingEvents = onboardingEvents.concat(Object.assign({},{
      type: `${DPPOnboardingFailedEvent}`,
      macAddress: macAddress,
      micronetId: micronetId,
      reason:reason
    }))
    logger.debug('\n On-boarding Events : ' + JSON.stringify(onboardingEvents))
    const patchResult = await upsertOnboardingResults(hook,onboardingEvents, deviceId)
     logger.debug('\n Patch Result from DPPOnboardingFailedEvent : ' + JSON.stringify(patchResult))
    // wait(4000); //4 seconds in milliseconds
      if(patchResult){
       const postResult = await postOnboardingResultsToMSO(hook)
    }
  })

  await dw.eventEmitter.on ( 'DPPOnboardingCompleteEvent' , async ( message ) => {
    let onboardingEvents = []
    logger.debug(`Event ${DPPOnboardingCompleteEvent} emitted ... ` + JSON.stringify(message))
    const { body: { DPPOnboardingCompleteEvent : {macAddress, micronetId, reason} }} = message
    onboardingEvents = onboardingEvents.concat(Object.assign({},{
      type: `${DPPOnboardingCompleteEvent}`,
      macAddress: macAddress,
      micronetId: micronetId,
      reason:reason
    }))
    logger.debug('\n On-boarding Events : ' + JSON.stringify(onboardingEvents))
    const patchResult = await upsertOnboardingResults(hook,onboardingEvents, deviceId)
    logger.debug('\n Patch Result from DPPOnboardingCompleteEvent : ' + JSON.stringify(patchResult))
    // wait(4000); //4 seconds in milliseconds
    if(patchResult) {
      const postResult = await postOnboardingResultsToMSO ( hook )
    }
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
   logger.debug('\n DPP on-board device postMicronetBody : ' + JSON.stringify(postMicronetBody))
    const { postBodyForODL , addSubnet }  = await upsertSubnetsToMicronet ( hook , postMicronetBody, data.subscriberId )
    logger.debug('\n ODL Post Body : ' + JSON.stringify(postBodyForODL) + '\t AddSubnet Flag : ' + JSON.stringify(addSubnet))
    if ( addSubnet ) {
      // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
      const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL, Object.assign({},{subscriberId:data.subscriberId}) )
      /* Update DB with ODL Response */
      logger.debug("\n\n ODL Response : " + JSON.stringify(odlResponse))
      if ( odlResponse.data && odlResponse.status == 201 ) {
        const patchResult = await hook.app.service (`${MICRONETS_PATH}`).patch ( data.subscriberId , { micronets :  odlResponse.data.micronets } );
        if ( patchResult ) {
          const dhcpSubnets = await addDhcpSubnets ( hook , postMicronetBody )
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

    logger.debug ( '\n DPP devices to add to micronet : ' + JSON.stringify ( dppDevicesToAddToMicronetPost ) )
    const postBodyForODL = await addDevicesInSubnet ( hook , micronetIdToUpsert , subnetIdToUpsert , dppDevicesToAddToMicronetPost )
    // logger.debug ( '\n DPP Post Body for ODL : ' + JSON.stringify ( postBodyForODL ) )
    const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign ( {} , {
      micronetId : micronetIdToUpsert ,
      subnetId : subnetIdToUpsert ,
      subscriberId : data.subscriberId
    } ) )
    // logger.debug ( '\n DPP ODL Response : ' + JSON.stringify ( odlResponse ) )
    if ( odlResponse.status == 201 && odlResponse.data ) {
      const patchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( data.subscriberId ,
        {
          micronets : odlResponse.data.micronets
        } );
      // logger.debug ( '\n\n Add Device to subnet response : ' + JSON.stringify ( patchResult ) )
      if ( patchResult ) {
        logger.debug ( '\n DPP devices to add to dhcp : ' + JSON.stringify ( dppDevicesToAddToDhcpPost ) )
        const addedDhcpDevices = await addDhcpDevices ( hook , dppDevicesToAddToDhcpPost , micronetIdToUpsert , subnetIdToUpsert )
        if(addedDhcpDevices.length > 0) {

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
          logger.debug('\n  Device - Id : ' + JSON.stringify(deviceId) + '\t\t\t gatewayPutBody : ' + JSON.stringify(gatewayPutBody))
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
  logger.debug('\n ReInitializeDppOnboarding data : ' + JSON.stringify(data))
  if(data.subscriberId) {
    const dppDevices = await hook.app.service(`${DPP_PATH}`).find({})
    const dppDeviceIndex = dppDevices.data.length > 0 ? dppDevices.data.findIndex((dppDevice) => dppDevice.subscriberId == data.subscriberId) : -1
    logger.debug(`\n DPP Remove hook for ${data.subscriberId} Dpp Device Index : ` + JSON.stringify(dppDeviceIndex))
    const { msoPortalUrl } = hook.app.get('mano')
    if(dppDeviceIndex > -1){
      // Clear DPP DB
      await hook.app.service(`${DPP_PATH}`).remove(data.subscriberId)
      // Clear Micronets DB
      await axios.delete(`http://${hook.app.get('host')}:${hook.app.get('port')}/${MICRONETS_PATH}/${data.subscriberId}/micronets`)
      logger.debug('\n MSO Status delete uri : ' + JSON.stringify(`${msoPortalUrl}/${MSO_STATUS_PATH}`))
      // Clear Status DB
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
  logger.debug ( '\n Dpp Onboard DeviceIndex  : ' + JSON.stringify ( dppOnboardDeviceIndex ) )
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
        if ( requestUrl == DPP_ONBOARD ) {
          logger.debug ( '\n\n DPP On-board path ... ' + JSON.stringify ( requestUrl ) + '\t\t Data : ' + JSON.stringify ( data ) )
          if ( validateDppRequest ( hook ) ) {
            const { dppOnboardDeviceIndex, user } = await checkUserAndDeviceToOnboard(hook)
            if ( dppOnboardDeviceIndex == -1 ) {
              logger.debug ( '\n Device ' + JSON.stringify ( data.bootstrap.mac ) + '\t not present. On-boarding device ... ' )
              const dppResult = await onboardDppDevice ( hook )
              logger.debug('\n Dpp on-boarding result : ' + JSON.stringify(dppResult))
              hook.result = dppResult
              return Promise.resolve(hook)
            }
            else {
              logger.debug ( '\n Device ' + JSON.stringify ( data.bootstrap.mac ) + '\t present. Start re-onboard process ... ' )
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
    create : [] ,
    update : [] ,
    patch : [] ,
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
