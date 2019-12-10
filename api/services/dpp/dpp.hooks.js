var axios = require ( 'axios' );
const omit = require ( 'ramda/src/omit' );
const logger = require ( './../../logger' );
const paths = require ( './../../hooks/servicePaths' )
const { DPP_PATH , MICRONETS_PATH, DHCP_PATH, USERS_PATH, MSO_DPP_API_ONBOARD, MSO_STATUS_PATH  } = paths
const DPP_ONBOARD = `/${DPP_PATH}/onboard`
const DPP_CONFIG = `/${DPP_PATH}/config`
var random = require ( 'random-hex-character-generator' );
const { upsertSubnetsToMicronet, mockOdlOperationsForUpserts, addDhcpSubnets, isEmpty, addDevicesInSubnet, addDhcpDevices } = require('../../hooks/dppWrapper')
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
const errors = require ( '@feathersjs/errors' );
const defaultDPPMudUrl = 'https://alpineseniorcare.com/micronets-mud/AgoNDQcDDgg'
const crypto = require('crypto');

const wait = function ( ms ) {
  var start = new Date().getTime();
  var end = start;
  logger.debug('\n Current Time : ' + JSON.stringify(new Date().getTime()))
  while(end < start + ms) {
    end = new Date().getTime();
  }
  logger.debug('\n Current Time : ' + JSON.stringify(new Date().getTime()))
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
  // const partPubKey =  bootstrap.pubkey.substring(0,5)
  const deviceId = crypto.createHash('sha1').update(bootstrap.pubkey).digest('hex');
  console.log('\n Generated Device ID : ' + JSON.stringify(deviceId))
  return deviceId
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
  const { registryBaseUrl } = hook.app.get('mud')
 // const registerDeviceUrl = `${registryBaseUrl}/register-device/${bootstrap.vendor}/${device.modelUID}/${bootstrap.pubkey}`
  const mudUrlForDeviceUrl = `${registryBaseUrl}/mud-url/${bootstrap.vendor}/${bootstrap.pubkey}`
 // logger.debug('\n Register Device Url : ' + JSON.stringify(registerDeviceUrl))
  logger.debug('\n\n  Mud Request Url for device  ' +JSON.stringify(mudUrlForDeviceUrl))

  // Register device with curl commands
 // const registerDeviceCurl = `curl -L -X  POST \"${registerDeviceUrl}\"`
 // const registerDeviceRes = runCurlCmd(hook,registerDeviceCurl);
 // console.log(registerDeviceRes);

  // logger.debug('\n Awaiting 5 secs ... ')
  // wait(5000)

  // Get MUD URL with curl commands
 // if(registerDeviceRes){
    const getMudUrlCurl = `curl -L -X  GET \"${mudUrlForDeviceUrl}\"`
    let getMudUrlRes = runCurlCmd(hook,getMudUrlCurl);
    logger.debug('\n ***** GET MUD URL RESPONSE ******* ')
    console.log(getMudUrlRes);
    return getMudUrlRes
 // }
 //  else {
 //    return Promise.reject(new errors.GeneralError(new Error('Error occured to obtain MUD url')))
 //  }
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


/* TODO : Change this function to more clean method */
const postOnboardingResults = async(hook) => {
  const { data } = hook
  const dpps = await hook.app.service(`${DPP_PATH}`).find({})
  const deviceId = await getDeviceId(hook)
  logger.debug('\n Device ID  : ' + JSON.stringify(deviceId))
  const dppDeviceIndex = dpps.data.findIndex((dppDevice) => dppDevice.deviceId == deviceId)
  logger.debug('\n Dpp Device Index : ' + JSON.stringify(dppDeviceIndex))


  if(dppDeviceIndex == -1){

    const onBoardingPostBody = Object.assign({},{
      deviceId: deviceId,
      subscriberId: data.subscriberId,
      events:[]
    })
    // const dppCreateResponse = await hook.app.service(`${DPP_ONBOARD}`).create(onBoardingPostBody)
    logger.debug('\n\n DPP Post Body : ' + JSON.stringify(onBoardingPostBody))

    // POST Results to MSO-Portal
    const { msoPortalUrl } = hook.app.get('mano')
    logger.debug('\n MSO POST STATUS URI : ' + JSON.stringify(`${msoPortalUrl}/portal/v1/status`))
    const allStatus = await axios.get(`${msoPortalUrl}/portal/v1/status`)
    logger.debug('\n All Status : ' + JSON.stringify(allStatus.data.data) + '\t\t All status length : ' + JSON.stringify(allStatus.data.data.length))
    const isStatusCheck = allStatus.data.data.length > 0 ? allStatus.data.data.findIndex((status) => status.deviceId == deviceId) : -1
    logger.debug('\n  isStatusCheck : ' + JSON.stringify(isStatusCheck))
    if(isStatusCheck == -1){
      logger.debug('\n MSO Portal status check : ' + JSON.stringify(isStatusCheck))
      await axios.post (`${msoPortalUrl}/portal/v1/status` , onBoardingPostBody)
    }

    return onBoardingPostBody
  }

}

const onboardDppDevice = async(hook) => {
  const { data } = hook
  const {bootstrap, user, device} = data
  let emitterResult = ''

  //Retrieve mud-uri from mud-registry using vendor and pubkey parameters
  let dppMudUrl = await getMudUri(hook)
  logger.debug('\n MUD URL Obtained from registry : ' + JSON.stringify(dppMudUrl))
  console.log('\n MUD URL status check : ' + JSON.stringify(dppMudUrl.toString().indexOf('status') > -1 ))
  console.log('\n MUD URL undefined check : ' + JSON.stringify(dppMudUrl.toString().indexOf('undefined') > -1 ))
  console.log('\n MUD URL empty object check : ' + JSON.stringify(dppMudUrl.toString() == '{}' ))
  if (dppMudUrl.toString().indexOf('status') > -1 || dppMudUrl.toString().indexOf('undefined') > -1 || dppMudUrl.toString() == '{}'){
     console.log('\n Error in mud url obtained : ' + JSON.stringify(dppMudUrl) + '\t Defaulting to no mud url')
     dppMudUrl = ''
  }
  // let malformedMudUrlIndex  =  dppMudUrl.indexOf('undefined')
  // logger.debug('\n Malformed MudUrl Index : ' + JSON.stringify(malformedMudUrlIndex))
  //
  // if( malformedMudUrlIndex > -1 ) {
  //   return Promise.reject(new errors.BadRequest(new Error(`Malformed MUD Url : ${testMudUrl}`)))
  // }

  //Generate PSK for device
  const dppDevicePsk = await generateDevicePSK(hook, 64)
  const deviceAuthority = !isEmpty(dppMudUrl) && dppMudUrl.split('/micronets-mud')[0]
  logger.debug('\n Device PSK : ' + JSON.stringify(dppDevicePsk) + '\t\t Device MUD URL : ' + JSON.stringify(dppMudUrl) + '\t\t Device Authority : ' + JSON.stringify(deviceAuthority))
  //Add device to users api
  const deviceId = await getDeviceId(hook)
  const userPatchBody = Object.assign({},{
    deviceId: deviceId,
    macAddress: bootstrap.mac,
    isRegistered: false,
    deviceName: user.deviceName,
    deviceManufacturer:device.manufacturer,
    deviceModel:device.model,
    deviceAuthority: deviceAuthority,
    deviceModelUID: device.modelUID,
    class: device.class,
    deviceConnection: WIFI,
    mudUrl: dppMudUrl,
    onboardType: DPP_ON_BOARD_TYPE,
    onboardStatus: START_ON_BOARD,
    psk: dppDevicePsk
  })
  const addDppDeviceToUser = await hook.app.service ( `${USERS_PATH}` ).patch ( data.subscriberId , userPatchBody);
 logger.debug('\n\n DPP device added to user ' + JSON.stringify(addDppDeviceToUser.data))

  // Check if micronet exists
 const dppDeviceClassIndex = await micronetExistsCheck(hook)

  // Create micronet and add dhcp subnet class
  if( dppDeviceClassIndex == -1 ) {
    logger.info('\n Micronet class does not exist.Create micronet and add dpp device')
    const postMicronetBody =  Object.assign({},{
      micronets: [Object.assign({},{
        name: data.device.class,
        class: data.device.class,
        "micronet-subnet-id": data.device.class
      })]
    })
   logger.debug('\n DPP post body : ' + JSON.stringify(postMicronetBody))
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
    const deviceId = await getDeviceId(hook)
    const dppDevicesToAddToMicronetPost = Object.assign ( {} , {
      deviceName : hook.data.user.deviceName ,
      deviceId : deviceId ,
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
              "device-id" : deviceId ,
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
          logger.debug('\n Gateway Device added . Initiating before on-board call ... ')
          // wait(5000)
          // PUT request to on-board device
          const deviceId = await getDeviceId(hook)
          const gatewayPutBody = Object.assign({},{
            dpp: {
              uri: hook.data.bootstrap.uri,
              akms: ["psk"]
            }
          })

          logger.debug('\n  Device - Id : ' + JSON.stringify(deviceId) + '\t\t\t DPP ON-board PUT Request : ' + JSON.stringify(gatewayPutBody))
          const onBoardResponse =  await dw.send(Object.assign({},gatewayPutBody), 'PUT','onboard',subnetIdToUpsert, deviceId)
          logger.debug('\n  DPP ON-board Response data : ' + JSON.stringify(onBoardResponse.data) + '\t\t Status : ' + JSON.stringify(onBoardResponse.status))
          if(onBoardResponse.status == 200) {
            return await postOnboardingResults(hook)
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
      // await hook.app.service(`${DPP_PATH}`).remove(data.subscriberId)
      logger.debug('\n MSO Status delete uri : ' + JSON.stringify(`${msoPortalUrl}/${MSO_STATUS_PATH}`))
      // Clear Status DB
      // await axios.delete(`${msoPortalUrl}/${MSO_STATUS_PATH}`)

      // Delete specific device from micronet
      const users = await hook.app.service(`${USERS_PATH}`).get(`${data.subscriberId}`)
      const requestDeviceId = await getDeviceId(hook)
      logger.debug('\n requestDeviceId : ' + JSON.stringify(requestDeviceId) + '\t\t users : ' + JSON.stringify(users))
      const deviceIndex = users.devices.findIndex((device) => device.deviceId == requestDeviceId && device.macAddress == hook.data.bootstrap.mac && device.class == hook.data.device.class)
      const deviceToDelete = users.devices[deviceIndex]
      logger.debug('\n deviceIndex : ' + JSON.stringify(deviceIndex) + '\t\t deviceToDelete : ' + JSON.stringify(deviceToDelete))
      logger.debug('\n Device to delete : ' + JSON.stringify(deviceToDelete) + '\t\t from micronet : ' + JSON.stringify(deviceToDelete.micronetId))
      if(deviceIndex > -1){
        await axios.delete(`${hook.app.get('publicBaseUrl')}/${MICRONETS_PATH}/${data.subscriberId}/micronets/${deviceToDelete.micronetId}/devices/${deviceToDelete.deviceId}`)
      }
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
       hook.data = Object.assign({},...dppResult)
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
              logger.debug('\n Dpp on-boarding post body : ' + JSON.stringify(dppResult))

              // // POST Results to MSO-Portal
              // const { msoPortalUrl } = hook.app.get('mano')
              // logger.debug('\n MSO POST STATUS URI : ' + JSON.stringify(`${msoPortalUrl}/portal/v1/status`))
              // const allStatus = await axios.get(`${msoPortalUrl}/portal/v1/status`)
              // const isStatusCheck = allStatus.data.data.length > 0 ? allStatus.data.data.findIndex((status) => status.deviceId == deviceId) : -1
              // logger.debug('\n  isStatusCheck : ' + JSON.stringify(isStatusCheck))
              // if(isStatusCheck == -1){
              //   logger.debug('\n MSO Portal status check : ' + JSON.stringify(isStatusCheck))
              //     await axios.post (`${msoPortalUrl}/portal/v1/status` ,dppResult)
              // }

              hook.data = Object.assign({},dppResult)
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
    patch : [
      async(hook) => {
        const { data , params } = hook
        const { requestHeaders , requestUrl } = params
        logger.debug('\n\n PATCH BEFORE HOOK DPP DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params) + '\t\t RequestUrl : ' + JSON.stringify(requestUrl))
        const dppData = await hook.app.service(`${DPP_PATH}`).get(data.deviceId)
        logger.debug('\n\n DPP Data : ' + JSON.stringify(dppData))
        const dppPatchBody = Object.assign({},{
          deviceId: data.deviceId,
          events: dppData.events.concat(data.events)
        })
        logger.debug('\n DPP PATCH BODY : ' + JSON.stringify(dppPatchBody))
        hook.data = Object.assign({},dppPatchBody)
        return Promise.resolve(hook)
      }
    ] ,
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
    update : [
      async(hook) => {
      const {error} = hook
      logger.debug('\n\n Error on patch : ' +JSON.stringify(error))
  }
    ] ,
    patch : [] ,
    remove : []
  }
}
;
