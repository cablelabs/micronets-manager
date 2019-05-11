var axios = require ( 'axios' );
const logger = require ( './../../logger' );
const paths = require ( './../../hooks/servicePaths' )
const { DPP_PATH , USERS_PATH, MICRONETS_PATH } = paths
const DPP_ONBOARD = `/${DPP_PATH}/onboard`
const DPP_CONFIG = `/${DPP_PATH}/config`
var random = require ( 'random-hex-character-generator' );
const { upsertSubnetsToMicronet, mockOdlOperationsForUpserts, addDhcpSubnets, isEmpty, addDevicesInSubnet, addDhcpDevices } = require('./../../hooks/micronetWrapper')
const DPP_ON_BOARD_TYPE = 'dpp'
const WIFI = 'wifi'
const START_ON_BOARD = 'initial'
const INTERMEDIATE_ON_BOARD = 'in_progress'
const COMPLETE_ON_BOARD = 'complete'

const generateDevicePSK = async ( hook , len ) => {
  // A 32-bit PSK (64 hex digits) hex-encoded WPA key or 6-63 character ASCII password
  let length = len ? len : 64
  return random.RandomHax ( length )
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
  const { registryUrl } = hook.app.get('mud')
  const dppRegistryMudUrl = `${registryUrl}/${bootstrap.vendor}/${bootstrap.pubkey}`
  logger.debug('\n DPP MUD REGISTRY URL ' +JSON.stringify(dppRegistryMudUrl))
  // const dppMudUrl = await axios.get(dppRegistryMudUrl) // TODO: Request returns 404
  const dppMudUrl = 'https://alpineseniorcare.com/micronets-mud/AgoNDQcDDgg'
  logger.debug('\n DPP MUD URL : ' + JSON.stringify(dppMudUrl))
  return dppMudUrl
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

const onboardDppDevice = async(hook) => {
  const { data } = hook
  const {bootstrap, user, device} = data

  //Retreive mud-uri from mud-registry using vendor and pubkey parameters
  const dppMudUrl = await getMudUri(hook)

  //Generate PSK for device
  const dppDevicePsk = await generateDevicePSK(hook,'63')
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
    logger.debug('\n Micronet class does not exist.Create micronet and add device')
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
  logger.debug('\n micronetsFromDb : ' + JSON.stringify(micronetsFromDb))
  const micronetIdToUpsertIndex = micronetsFromDb.micronets.findIndex((micronet) => micronet['class'] == data.device.class)
  const micronetToUpsertId = micronetsFromDb.micronets[micronetIdToUpsertIndex]['micronet-id']
  const subnetToUpsertId = micronetsFromDb.micronets[micronetIdToUpsertIndex]['micronet-subnet-id']
  const dppDevicesToAddToMicronet = Object.assign({},{
          deviceName: hook.data.user.deviceName ,
          deviceId: hook.data.bootstrap.pubkey.split('+')[0],
          macAddress : hook.data.bootstrap.mac,
          onboardType: DPP_ON_BOARD_TYPE,
          onboardStatus: START_ON_BOARD
    })

  const dppDhcpDevicesToAdd = Object.assign({},{

    "micronets" :  [
    {
      "connected-devices" : [
        {
          "device-name": hook.data.user.deviceName,
          "device-id": hook.data.bootstrap.pubkey.split('+')[0],
          "device-mac" : hook.data.bootstrap.mac
        }
      ]
    }
  ]})

  logger.debug('\n DPP DEVICES TO ADD TO MICRONET : ' + JSON.stringify(dppDevicesToAddToMicronet))
  const postBodyForODL = await addDevicesInSubnet ( hook , micronetToUpsertId , subnetToUpsertId , dppDevicesToAddToMicronet )
  logger.debug('\n DPP Post Body for ODL : ' + JSON.stringify(postBodyForODL))
  const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign({},{ micronetId: micronetToUpsertId , subnetId:  subnetToUpsertId, subscriberId: data.subscriberId })  )
  logger.debug('\n DPP ODL Response : ' + JSON.stringify(odlResponse))
  if ( odlResponse.status == 201 && odlResponse.data ) {
    const patchResult = await hook.app.service (`${MICRONETS_PATH}`).patch ( data.subscriberId ,
      {
        micronets : odlResponse.data.micronets
      } );
    logger.debug('\n\n Add Device to subnet response : ' + JSON.stringify(patchResult))
    if ( patchResult ) {
      logger.debug('\n DPP DEVICES TO ADD TO DHCP : ' + JSON.stringify(dppDhcpDevicesToAdd))
      const addedDhcpDevices = await addDhcpDevices ( hook , dppDhcpDevicesToAdd , micronetToUpsertId , subnetToUpsertId )
    }
    //  hook.result = patchResult
    // return Promise.resolve ( hook );
  }

  // PUT request to onboard device

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
        logger.debug ( '\n\n MICRONETS CREATE DPP HOOK requestHeaders : ' + JSON.stringify ( requestHeaders ) + '\t\t requestUrl  : ' + JSON.stringify ( requestUrl ) )
        if ( requestUrl == DPP_ONBOARD ) {
          logger.debug ( '\n\n MM DPP ONBOARD PATH ... ' + JSON.stringify ( requestUrl ) + '\t\t DATA : ' + JSON.stringify ( data ) )
          if ( validateDppRequest ( hook ) ) {
            const users = await hook.app.service ( `${USERS_PATH}` ).get ( data.subscriberId )
            logger.debug ( '\n Current devices for subscriber : ' + JSON.stringify ( users ) )
            const dppOnboardDeviceIndex = users.devices.findIndex ( ( device ) => device.macAddress == data.bootstrap.mac )
            logger.debug ( '\n dppOnboardDeviceIndex  : ' + JSON.stringify ( dppOnboardDeviceIndex ) )
            if ( dppOnboardDeviceIndex == -1 ) {
              logger.debug ( '\n Device ' + JSON.stringify ( data.bootstrap.mac ) + '\t not present. Onboarding device ... ' )
              await onboardDppDevice ( hook )
            }
            else {
              logger.debug ( '\n Device ' + JSON.stringify ( data.bootstrap.mac ) + '\t present. Do nothing ... ' )
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
