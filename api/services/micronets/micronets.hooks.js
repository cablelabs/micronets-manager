const subnetAllocation = require ( '../../hooks/subnetAllocaiton' )
const micronetOperationalConfig = require ( '../../mock-data/micronetsOperationalConfig' );
const micronetNotifications = require ( '../../mock-data/micronetNotifications' );
const axios = require ( 'axios' );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const dw = require ( '../../hooks/dhcpWrapperPromise' )
const WIRED = "wired"
const WIRELESS = "wifi"
const errors = require('@feathersjs/errors');
const logger = require ( './../../logger' );
const MUD_PARSER_VERSION = "1.1"

/* BootStrap Sequence */
const isGatewayAlive = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl } = registry
  await dw.setAddress(webSocketUrl)
  const dhcpConnection = await dw.connect().then ( () => { return true } )
  return dhcpConnection
}

const flattenArray = (a) => Array.isArray(a) ? [].concat(...a.map(flattenArray)) : a;

const isEmpty = function(data) {
  if(typeof(data) === 'object'){
    if(JSON.stringify(data) === '{}' || JSON.stringify(data) === '[]'){
      return true;
    }else if(!data){
      return true;
    }
    return false;
  }else if(typeof(data) === 'string'){
    if(!data.trim()){
      return true;
    }
    return false;
  }else if(typeof(data) === 'undefined'){
    return true;
  }else{
    return false;
  }
}

const connectToGateway = async ( hook ) => { return true }

const isODLAlive = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry
  /* ODL CALL
const odlNotifications = await axios ( {
  ...apiInit ,
  auth : odlAuthHeader ,
  method : 'get' ,
  url : `${odlUrl}/restconf/config/micronets-notifications:micronets-notifications` ,
} )
*/
  // FAKE NOTIFICATIONS
  const odlNotifications = Object.assign ( {} , { data : micronetNotifications , status : 200 } )
  const { data , status } = odlNotifications
  return ( data && status == 200) ? true : false

}
/* BootStrap Sequence */

const getOdlConfig = async ( hook , id ) => {
  console.log('\n getODLConfig : ' + JSON.stringify(id))
  return hook.app.service ( '/mm/v1/micronets/odl' ).get ( id )
    .then ( ( data ) => {
      console.log('\n ODL SWITCH CONFIG data : ' + JSON.stringify(data))
      return data
    } )
}
/* Get Switch Config */
const getODLSwitchDetails = async ( hook , gatewayId ) => {
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  if(isEmpty(odlStaticConfig)) {
    return Promise.reject(new errors.GeneralError(new Error('Missing Switch config')))
  }
  const { switchConfig } = odlStaticConfig
  const bridgeTrunkIndex = switchConfig.bridges.findIndex ( ( bridge ) => bridge.hasOwnProperty ( "trunkPort" ) && bridge.hasOwnProperty ( "trunkIp" ) )
  const bridgeTrunk = switchConfig.bridges[ bridgeTrunkIndex ]
  const ovsHost = odlStaticConfig.ovsHost
  const ovsPort = odlStaticConfig.ovsPort
  let wirelessPorts = bridgeTrunk.ports.map ( ( port ) => {
    if ( port.hasOwnProperty ( "hwtype" ) && port.hwtype == WIRELESS ) {
      return port
    }
  } )
  wirelessPorts = wirelessPorts.filter ( Boolean )
  let wiredPorts = bridgeTrunk.ports.map ( ( port ) => {
    if ( port.hasOwnProperty ( "hwtype" ) && port.hwtype == WIRED ) {
      return port
    }
  } )
  wiredPorts = wiredPorts.filter ( Boolean )
  return {
    odlStaticConfig ,
    bridgeTrunkIndex ,
    bridgeTrunk ,
    wiredPorts ,
    wirelessPorts ,
    ovsHost ,
    ovsPort ,
    switchConfig
  }
}

const populateOdlConfig = async ( hook , requestBody , gatewayId ) => {
  const { micronets } = requestBody;
  logger.debug('\n populateOdlConfig requestBody : ' + JSON.stringify(micronets))
  const { odlStaticConfig , bridgeTrunkIndex , bridgeTrunk , wiredPorts , wirelessPorts , ovsHost , ovsPort , switchConfig } = await getODLSwitchDetails ( hook , gatewayId )
  const reqBodyWithOdlConfig = micronets.map ( ( micronet , index ) => {
    return {
      ...micronet ,
      "trunk-gateway-port" : bridgeTrunk.trunkPort ,
      "trunk-gateway-ip" : ovsHost ,
      "dhcp-server-port" : "LOCAL" ,
      "dhcp-zone" : bridgeTrunk.trunkIp ,
      "ovs-bridge-name" : bridgeTrunk.name ,
      "ovs-manager-ip" : ovsHost
    }
  } );
  return {
    reqBodyWithOdlConfig ,
    bridgeTrunkIndex ,
    bridgeTrunk ,
    wirelessPorts ,
    wiredPorts ,
    switchConfig ,
    ovsHost ,
    ovsPort,
    requestBody
  }
}

const getSubnet = ( hook , index ) => {
  return subnetAllocation.getNewSubnet ( index ).then ( ( subnet ) => {
    return subnet
  } )
}

/* Get Static Subnet IP's */
const getStaticSubnetIps = async ( hook , subnetDetails , requestBody ) => {

  /* Get gatewayId */
  const registry = await getRegistry ( hook )
  if(isEmpty(registry)){
    return Promise.reject(new errors.GeneralError(new Error('Registry not found')))
  }
  const gatewayId = registry.gatewayId
  /* Get gatewayId */

  /* Get SwitchConfig */
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  if(isEmpty(odlStaticConfig)){
    return Promise.reject(new errors.GeneralError(new Error('Switch Config not found')))
  }
  const { switchConfig } = odlStaticConfig
  /* Get SwitchConfig */

  /* Get Allocated subnets  */
  const micronetFromDB = await getMicronet(hook,{})
  const allocatedSubnetNos = micronetFromDB.micronets.map((micronet)=> { return (micronet['micronet-subnet']) })

  let wiredSwitchConfigSubnets = switchConfig.bridges.map ( ( bridge ) => {
    return bridge.ports.map ( ( port , index ) => {
      if ( port.hasOwnProperty ( 'hwtype' ) && port.hwtype == WIRED ) {
        return port.subnet
      }
    })
  })

  // Flatten array , filter null values , remove duplicate elements, remove previously allocated subnetNos
  wiredSwitchConfigSubnets = [].concat(...wiredSwitchConfigSubnets).filter ( Boolean )
  wiredSwitchConfigSubnets = [...(new Set(wiredSwitchConfigSubnets))]
  wiredSwitchConfigSubnets = wiredSwitchConfigSubnets.filter( ( el ) => !allocatedSubnetNos.includes( el ) );

  let wirelessSwitchConfigSubnets = switchConfig.bridges.map ( ( bridge ) => {
    return bridge.ports.map ( ( port , index ) => {
      if ( port.hasOwnProperty ( 'hwtype' ) && port.hwtype == WIRELESS ) {
        return port.subnet
      }
    })
  })

  // Flatten array , filter null values , remove duplicate elements, remove previously allocated subnetNos
  wirelessSwitchConfigSubnets = [].concat(...wirelessSwitchConfigSubnets).filter ( Boolean )
  wirelessSwitchConfigSubnets = [...(new Set(wirelessSwitchConfigSubnets))]
  wirelessSwitchConfigSubnets = wirelessSwitchConfigSubnets.filter( ( el ) => !allocatedSubnetNos.includes( el ) );

  logger.debug( '\n Static Subnet IPs wiredSwitchConfigSubnets : ' + JSON.stringify ( wiredSwitchConfigSubnets ) + '\t\t wirelessSwitchConfigSubnets : ' + JSON.stringify ( wirelessSwitchConfigSubnets ) )

    const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
      let switchConfigSubnetType = subnet.connection == WIRELESS ? wirelessSwitchConfigSubnets : wiredSwitchConfigSubnets
      logger.debug('\n Subnet : ' + JSON.stringify(subnet) + '\t\t switchConfigSubnetType : ' + JSON.stringify(switchConfigSubnetType) + '\t\t Index : ' + JSON.stringify(index))
      if(isEmpty(switchConfigSubnetType) && isEmpty(wiredSwitchConfigSubnets)) {
        return Promise.reject(new errors.GeneralError(new Error('Micronet cannot be created.No wired subnet available')))
      }
      else if(isEmpty(switchConfigSubnetType) && isEmpty(wirelessSwitchConfigSubnets)) {
        return Promise.reject(new errors.GeneralError(new Error('Micronet cannot be created.No wireless subnet available')))
      }
      else if(subnetDetails.length > switchConfigSubnetType.length) {
        const connectionType = subnet.connection == WIRELESS ? 'wifi' : 'wired'
        logger.debug('\n ConnectionType : ' + JSON.stringify(connectionType))
        const availableSubnetLength = connectionType == 'wifi' ?  wirelessSwitchConfigSubnets.length : wiredSwitchConfigSubnets.length
        return Promise.reject(new errors.GeneralError(new Error(`Cannot add ${subnetDetails.length} ${connectionType} micronets. Only ${availableSubnetLength} ${connectionType} micronet can be added.Please update switch config to add more.`)))
      }
      const subnetNo = parseInt(switchConfigSubnetType[ index ].split ( '.' )[ 2 ])
      const subnets = await subnetAllocation.getNewSubnet ( index , subnetNo )
      return Object.assign ( {} , subnets )
    } ) )
    return promises

}

/* Get Dynamic Subnet IP's */
const getSubnetIps = async ( hook , subnetDetails , requestBody ) => {
  const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
    const subnets = await subnetAllocation.getNewSubnet ( index )
    return Object.assign ( {} , subnets )
  } ) )
  return promises
}

const getDeviceForSubnet = async ( hook , subnetDetails , subnets ) => {
  subnetDetails = [].concat ( ...subnetDetails );
  let devicesWithIp = await Promise.all ( subnets.map ( async ( subnet , subnetIndex ) => {
    if ( subnetIndex < subnetDetails.length && subnetDetails[ subnetIndex ].devices.length >= 1 ) {
      const devices = subnetDetails[ subnetIndex ].devices
      const subnetAndDeviceIpData = await subnetAllocation.getNewIps ( subnet.subnet , devices )
      return {
        ...subnetAndDeviceIpData
      }
    }
  } ) )

  devicesWithIp = [].concat ( ...devicesWithIp )
  return devicesWithIp
}

// TODO : Pass Switch Config object and wired and wireless subnet
const getSubnetAndDeviceIps = async ( hook , requestBody ) => {
  const noOfSubnets = requestBody.length
  // logger.debug ( '\n No of Subnets : ' + JSON.stringify ( noOfSubnets ) )
  const subnetDetails = requestBody.map ( ( micronet , index ) => {
    return Object.assign ( {} , {
      name : micronet.name ,
      connection: micronet['device-connection'] || 'wired',
      devices : micronet[ 'connected-devices' ] || []
    } )
  } )

  // Gets random subnets
  // const subnets = await getSubnetIps ( hook , subnetDetails , requestBody )

  // Gets static subnets
  const subnets = await getStaticSubnetIps ( hook , subnetDetails , requestBody )

  /* Add check for devices length in subnetDetails array */
  let subnetDetailsWithDevices = subnetDetails.map ( ( subnetDetail , index ) => {
    if ( subnetDetail.hasOwnProperty('devices') && subnetDetail.devices.length >= 1 ) {
      return subnetDetail
    }
  } )

  subnetDetailsWithDevices = subnetDetailsWithDevices.filter ( Boolean )

  /* All Subnets have Devices */
  if ( subnets.length == subnetDetailsWithDevices.length ) {
    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetails , subnets )
    logger.debug( '\n All subnets with devices : ' + JSON.stringify ( subnetsWithDevices ) )
    return subnetsWithDevices
  }

  /* Few Subnets have Devices */
  if ( subnets.length > 0 && subnetDetailsWithDevices.length >= 1 && subnets.length > subnetDetailsWithDevices.length ) {
    const subnetsWithDevicesSubset = subnetDetailsWithDevices.map ( ( sbd , index ) => {
      return subnets[ index ]
    } )

    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetailsWithDevices , subnetsWithDevicesSubset )

    const subnetsWithoutDevices = subnets.map ( ( subnet , index ) => {
      if ( index < subnetsWithDevices.length && subnet.subnet != subnetsWithDevices[ index ].subnet ) {
        return subnet
      }
      if ( index >= subnetsWithDevices.length ) {
        return subnet
      }
    } )

    let allSubnets = subnetsWithoutDevices.concat ( subnetsWithDevices )
    allSubnets = allSubnets.filter ( Boolean )
    logger.debug( '\n All subnets with and without devices : ' + JSON.stringify ( allSubnets ) )
    return allSubnets

  }

  /* No subnets have devices */
  if ( subnets.length > 0 && subnetDetailsWithDevices.length == 0 ) {
    return subnets
  }

}

const getRegistryForSubscriber = async ( hook , subscriberId ) => {
  console.log('\n Find registry for subscriber : ' + JSON.stringify(subscriberId))
   if (subscriberId!= undefined ) {
    return await hook.app.service ( '/mm/v1/micronets/registry' ).get ( subscriberId )
  }
  else {
    return Promise.reject(new errors.GeneralError(new Error(`Invalid or missing subscriber ${id}`)))
  }
}

const getSubscriberId = async (hook) => {
  const { params, data } = hook
  const { route } = params
 // logger.debug('\n Get Subscriber id params : ' + JSON.stringify(params) + '\t\t Data : ' + JSON.stringify(data) )
  const subscriberIdFromHook =  !isEmpty(params) && !isEmpty(route) && isEmpty(data) ? route.id : isEmpty(params) && isEmpty(route) && !isEmpty(data) && data.hasOwnProperty('type') && data.type == 'userDeviceRegistered' && data.data.hasOwnProperty('subscriberId') ? data.data.subscriberId : undefined
  const defaultSubscriberId = hook.app.get('mano').subscriberId
 // logger.debug('\n SubscriberIdFromHook : ' + JSON.stringify(subscriberIdFromHook) + '\t\t MANO SubscriberId : ' + JSON.stringify(defaultSubscriberId))
  const subscriberId = subscriberIdFromHook !=undefined ? subscriberIdFromHook : defaultSubscriberId !=undefined ? defaultSubscriberId : undefined
 // logger.debug('\n Subscriber ID : ' + JSON.stringify(subscriberId))
  return subscriberId
}

const getRegistry = async ( hook ) => {
  const mano = hook.app.get('mano')
  const subscriberId = await getSubscriberId(hook)
  logger.debug('\n GET REGISTRY SUBSCRIBER ID : ' + JSON.stringify(subscriberId))
  const registry = await getRegistryForSubscriber ( hook , subscriberId )
  return registry
}

const getMicronet = async ( hook , subscriberId ) => {
  const id = isEmpty(subscriberId) ? await getSubscriberId(hook) : subscriberId
  logger.debug('\n GET MICRONET SUBSCRIBER ID : ' + JSON.stringify(id))
  if (id!= undefined ) {
    return await hook.app.service ( '/mm/v1/subscriber' ).get (  id )
  }
  else {
    return Promise.reject(new errors.GeneralError(new Error(`Invalid or missing subscriber ${id}`)))
  }

}

const populatePostObj = async ( hook , reqBody ) => {
  const { micronets } = reqBody
  const noOfMicronets = micronets.length
  logger.debug('\n micronets : ' + JSON.stringify(micronets) + '\t\t noOfMicronets : ' + JSON.stringify(noOfMicronets))
  /* Get gatewayId */
  const registry = await getRegistry ( hook )
  if(isEmpty(registry)){
    return Promise.reject(new errors.GeneralError(new Error('Registry not found')))
  }
  const gatewayId = registry.gatewayId
  /* Get gatewayId */

  /* Populate ODL Static Config */
  const config = await populateOdlConfig ( hook , reqBody , gatewayId )
  const { reqBodyWithOdlConfig , wirelessPorts , wiredPorts, requestBody } = config


  /* Populate Sub-nets and Devices Config */
  const subnetAndDeviceIps = await getSubnetAndDeviceIps ( hook , reqBodyWithOdlConfig )
  let updatedReqPostBody = reqBodyWithOdlConfig.map ( ( reqPostBody , index ) => {

    let connectedDevicesFull = []
    if ( subnetAndDeviceIps[ index ].hasOwnProperty ( 'connectedDevices' ) && subnetAndDeviceIps[ index ].connectedDevices.length > 0 ) {
      connectedDevicesFull = subnetAndDeviceIps[ index ].connectedDevices.map ( ( device , index ) => {
        const wiredPortsLength = wiredPorts.length
        return {
          "device-mac" : device[ "device-mac" ] ,
          "device-ip" : device.deviceIp ,
          "device-openflow-port" : wiredPortsLength > 0 ? wiredPorts[ 0 ].port : -1 ,
          "device-name" : device[ "device-name" ] ,
          "device-id" : device[ "device-id" ]
        }
      } )
    }
    return {
      ...reqPostBody ,
      "micronet-subnet" : subnetAndDeviceIps[ index ].micronetSubnet ,
      "micronet-gateway-ip" : subnetAndDeviceIps[ index ].micronetGatewayIp ,
      "dhcp-zone" : subnetAndDeviceIps[ index ].micronetSubnet ,
      "connected-devices" : connectedDevicesFull
    }
  } )
  updatedReqPostBody = [].concat ( ...updatedReqPostBody )
  return updatedReqPostBody
}

const initializeMicronets = async ( hook , postBody ) => {
  // Delete all Micronets
  const removeAllMicronetsResponse = await hook.app.service ( '/mm/v1/micronets' ).remove ( null )
  if ( removeAllMicronetsResponse ) {
    /* ACTUAL ODL CALL
    // const odlResponse = await odlOperationsForUpserts ( hook , postBody )
    // return odlResponse
    */

    // FAKE RESPONSE
    const mockOdlResponse = await mockOdlOperationsForUpserts ( hook , postBody , "" , "" )
    return mockOdlResponse
  }
}


/* ODL Config PUT / GET Calls */

const upsertOdLConfigState = async ( hook , postBody ) => {
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry


  // // AXIOS ODL call.Check for Response Code 201 or 200
  // const odlConfigResponse = await axios ( {
  //   ...apiInit ,
  //   auth: odlAuthHeader,
  //   method : 'PUT' ,
  //   url : `http://${odlHost}:${odlSocket}/restconf/config/micronets:micronets` ,
  //   data: postBody
  // })
  //  const {status, data} = odlConfigResponse


  // Uncomment for Fake response
  const odlConfigResponse = Object.assign ( {} , { status : 200 , data : "" } )
  return odlConfigResponse
}

const fetchOdlOperationalState = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry

  // URL : http://{{odlhost}}:{{odlsocket}}/restconf/operational/micronets:micronets
  // const odlOperationalState = await axios ( {
  //   ...apiInit ,
  //   auth: odlAuthHeader,
  //   method : 'GET' ,
  //   url : `http://${odlHost}:${odlSocket}/restconf/operational/micronets:micronets` ,
  // } )
  // const { status, data } = odlOperationalState
  // return odlOperationalState

  // Uncomment for Fake response
  const odlOperationalState = Object.assign ( {} , { data : micronetOperationalConfig , status : 200 } )
  return odlOperationalState
}

// Calls mock-micronet API
const mockOdlOperationsForUpserts = async ( hook , requestBody , reqParams ) => {

  const {micronetId, subnetId, subscriberId} = reqParams
  logger.debug('\n mockOdlOperationsForUpserts requestBody : ' + JSON.stringify(requestBody) + '\t\t reqParams : ' + JSON.stringify(reqParams))
  let postBody = requestBody.hasOwnProperty('micronets') && requestBody.hasOwnProperty('name') && requestBody.hasOwnProperty('id') ? requestBody.micronets : requestBody
  logger.debug('\n mockOdlOperationsForUpserts  postBody : ' + JSON.stringify(postBody))
  const registry = await getRegistry ( hook , {} )
  const { mmUrl } = registry
  const mockResponse = await axios ( {
    ...apiInit ,
    method : 'POST' ,
    url : micronetId && subscriberId ? `${mmUrl}/mm/v1/mock/subscriber/${subscriberId}/micronets/${micronetId}/devices` :  `${mmUrl}/mm/v1/mock/subscriber/${subscriberId}/micronets`   ,
    data : Object.assign ( {} , { micronets :  postBody  } )
  } )
  return Object.assign ( {} , { data : mockResponse.data , status : mockResponse.status } )
}

const odlOperationsForUpserts = async ( hook , putBody ) => {
  const odlConfigStateResponse = await upsertOdLConfigState ( hook , putBody )
  // Check if status code is 200 / 201 OK
  if ( odlConfigStateResponse.status == 200 && odlConfigStateResponse.data == "" ) {
    const odlOperationalState = await fetchOdlOperationalState ( hook )
    return odlOperationalState
  }
}

/* ODL Config PUT / GET Calls */

const subnetPresentCheck = async ( hook , body , micronetFromDb ) => {
  let subnetsStatus = Object.assign ( {} , {
    found : [] ,
    notFound : []
  } )

  const foundMicronet = micronetFromDb.micronets
  const subnetsFromPost = body.micronets
  const existingMicronetClass = foundMicronet.map ( ( micronet , index ) => {
    return micronet.class
  } )
  subnetsFromPost.forEach ( ( subnetFromPost , index ) => {
    const foundIndex = existingMicronetClass.indexOf ( subnetFromPost.name )
    if ( foundIndex == -1 ) {
      subnetsStatus.notFound = [ subnetFromPost.name ]
    }
    if ( foundIndex > -1 ) {
      subnetsStatus.found = [ subnetFromPost.name ]
    }
  } )
  return subnetsStatus
}
// Add subnet to micronet
const createSubnetInMicronet = async ( hook , postBody , subnetsToAdd ) => {
  const finalPostBody = await populatePostObj ( hook , postBody )
  return finalPostBody
}

const upsertSubnetsToMicronet = async ( hook , body, subscriberId ) => {
  let postBodyForODL = []
  const micronetFromDb = await getMicronet ( hook , subscriberId )
  // TODO : Add Logic to check with operational state

  const subnetsStatus = await subnetPresentCheck ( hook , body , micronetFromDb )
  logger.debug('\n SUBNET STATUS : ' + JSON.stringify(subnetsStatus))
  if ( subnetsStatus.notFound.length >= 1 ) {
    const subnetsToAdd = await createSubnetInMicronet ( hook , body , subnetsStatus.notFound )
    postBodyForODL = micronetFromDb.micronets.concat ( subnetsToAdd )
    return { postBodyForODL , addSubnet : true }
  }
  if ( subnetsStatus.notFound.length == 0 ) {
    postBodyForODL = Object.assign ( {} , { micronets :  micronetFromDb.micronets }  )
    return { postBodyForODL , addSubnet : false }
  }
}

/* Add Registered devices to existing or new subnet */
const upsertRegisteredDeviceToMicronet = async ( hook , eventData ) => {
  const { type , data } = eventData
  const { subscriberId , device } = data

  let micronetFromDB = await getMicronet ( hook , subscriberId )
  hook.id = micronetFromDB._id
  const existingMicronetClasses = micronetFromDB.micronets.map ( ( micronet , index ) => {
    return micronet.class
  } )
  const classIndex = existingMicronetClasses.findIndex ( ( className ) => className == device.class )
  /* Add Subnet to Micro-net first */

  if ( classIndex == -1 ) {
    const postBodyForSubnet = Object.assign ( {} , {
        micronets : [ {
          "name" : device.class ,
          "micronet-subnet-id" : device.class ,
          "device-connection":device.deviceConnection,
          "connected-devices" : []
        } ]
    } )

    const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , postBodyForSubnet, subscriberId )
    logger.debug('\n  PostBody for ODL : ' + JSON.stringify(postBodyForODL) + '\t\t addSubnet : ' + JSON.stringify(addSubnet))
    /* ODL API's */
    // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
    const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL, Object.assign({},{subscriberId}) )
    logger.debug('\n ODL Response : ' + JSON.stringify(odlResponse.data) + '\t\t status : ' + JSON.stringify(odlResponse.status))
    if ( odlResponse.data && odlResponse.status == 201 ) {

      const addSubnetPatchResult = await hook.app.service ( `/mm/v1/subscriber` ).patch ( subscriberId ,
        { micronets :  odlResponse.data.micronets  } ,
        { query : {} , mongoose : { upsert : true } } );

      // Add device to subnet
      if ( addSubnetPatchResult ) {
        micronetFromDB = await getMicronet ( hook , {} )
        const micronetToUpdateIndex = micronetFromDB.micronets.findIndex ( ( micronet ) => (micronet.class == device.class) )
        const micronetToUpdate = micronetFromDB.micronets[micronetToUpdateIndex]
        const postODLBody = await addDevicesInSubnet ( hook , micronetToUpdate[ 'micronet-id' ] ,micronetToUpdate[ 'micronet-subnet-id' ] , device )
        return postODLBody
      }
    }
  }

  /* Subnet exists.Add device to subnet */
  if ( classIndex > -1 ) {
    // Add device to subnet
    const micronetIndex = micronetFromDB.micronets.findIndex ( ( micronet ) => (micronet.class == device.class) )
    const micronetToUpdate = micronetFromDB.micronets[ micronetIndex ]
    const postODLBody = await addDevicesInSubnet ( hook , micronetToUpdate[ 'micronet-id' ] , micronetToUpdate[ 'micronet-subnet-id' ] , device )
    return postODLBody
  }
}

// Add Devices in Subnet from registration process and otherwise
const addDevicesInSubnet = async ( hook , micronetId , subnetId , devices ) => {
  devices = [].concat ( devices )
  let formattedDevices = devices.map ( ( device , index ) => {
    if ( device.hasOwnProperty ( "isRegistered" ) ) {
      return {
        "device-mac" : device.macAddress ,
        "device-name" : device.hasOwnProperty('deviceName') ? device.deviceName : `Test Device` ,
        "device-id" : device.deviceId ,
        "device-openflow-port" : 2 // TODO: Add device-openflow-port value from switch config
      }
    }
    else {
      return {
        "device-mac" : device[ "device-mac" ] ,
        "device-name" : device[ "device-name" ] || `Test Device` ,
        "device-id" : device[ "device-id" ] ,
        "device-openflow-port" : device[ "device-openflow-port" ]
      }
    }
  } )
  const micronetFromDB = await getMicronet ( hook , {} )
  const micronetToUpdateIndex = micronetId && subnetId ? micronetFromDB.micronets.findIndex ( ( micronet ) => {
    return (micronetId == micronet[ 'micronet-id' ] )
  } ) : 0

  const micronetToUpdate = micronetFromDB.micronets[ micronetToUpdateIndex ]
  const micronetSubnet = micronetToUpdate[ 'micronet-subnet' ]

  // Convert subnetNo string to Int
  const subnetNo = parseInt ( micronetSubnet.split ( '.' )[ 2 ] , 10 );
  const subnetWithDevices = await subnetAllocation.getNewIps ( subnetNo , formattedDevices )

  const formattedSubnetWithDevices = formattedDevices.map ( ( device , index ) => {
    let deviceFromIpAllocator = subnetWithDevices.connectedDevices.map ( ( ipAllocatorDevice ) => {
      if ( ipAllocatorDevice[ 'device-mac' ] == device[ 'device-mac' ] && ipAllocatorDevice[ 'device-name' ] == device[ 'device-name' ] && ipAllocatorDevice[ 'device-id' ] == device[ 'device-id' ] ) {
        return ipAllocatorDevice
      }
    } )
    deviceFromIpAllocator = deviceFromIpAllocator.filter ( Boolean )
    if ( deviceFromIpAllocator ) {
      return {
        "device-mac" : device[ "device-mac" ] ,
        "device-name" : device[ "device-name" ] ,
        "device-id" : device[ "device-id" ] ,
        "device-openflow-port" : deviceFromIpAllocator[ 0 ][ "device-openflow-port" ] ,
        "device-ip" : deviceFromIpAllocator[ 0 ].deviceIp
      }
    }
  } )
  const updatedMicronetwithDevices = Object.assign ( {} , micronetToUpdate , { 'connected-devices' : micronetToUpdate[ 'connected-devices' ].concat ( formattedSubnetWithDevices ) } )
  const postBodyForODL = micronetFromDB
  postBodyForODL.micronets[ micronetToUpdateIndex ] = updatedMicronetwithDevices
  return postBodyForODL
}
/* Add Registered devices to existing or new subnet */

/* Adding subnets & devices to DHCP */
const addDhcpSubnets = async ( hook , requestBody ) => {
  const dhcpSubnetsToAdd = requestBody.micronets.map ( ( micronet , index ) => {
    return {
      class : micronet.class ? micronet.class : micronet.name ,
      subnetId : micronet[ "micronet-subnet-id" ]
    }
  } )
  const dhcpSubnetLength = dhcpSubnetsToAdd.length
  const micronetFromDB = await getMicronet ( hook , {} )
  const { micronets } = micronetFromDB
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl , mmUrl, gatewayId } = registry
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  const { bridges } = odlStaticConfig.switchConfig
  const bridge = bridges.map((bridge) => {return bridge})

  // Checks if micronet is added to d/b which indicates successful ODL call.
  let dhcpSubnetsPostBody = dhcpSubnetsToAdd.map ( ( dhcpSubnet , index ) => {
    // Original check with class property in request body
    // const matchedMicronetIndex = micronet.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase () && micronet[ "micronet-subnet-id" ].toLowerCase () == dhcpSubnet.subnetId.toLowerCase ()) )
    const matchedMicronetIndex = micronets.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase ()) )

    return bridges.map((bridge) => {
      return bridge.ports.map((port) =>
      {
        if(micronets[ matchedMicronetIndex ][ "micronet-subnet" ] == port.subnet &&  matchedMicronetIndex > -1 ) {
          const matchedPortForSubnet = Object.assign( {},{
            ovsBridge: bridge.name,
            ovsPort: port.port,
            interface: port.interface
          })
          return {
            micronetId : dhcpSubnet.subnetId ,
            ipv4Network : {
              network : micronets[ matchedMicronetIndex ][ "micronet-subnet" ].split ( "/" )[ 0 ] ,
              mask : "255.255.255.0" ,  // TODO : Call IPAllocator to get mask.For /24 its 255.255.255.0
              gateway : micronets[ matchedMicronetIndex ][ "micronet-gateway-ip" ]
            },
            ovsBridge: bridge.name,
            interface: port.interface
          }
        }
      })
    })
  })

  dhcpSubnetsPostBody = flattenArray(dhcpSubnetsPostBody);
  dhcpSubnetsPostBody = dhcpSubnetsPostBody.filter((el)=> { return el!=null} )
  const dhcpSubnets = await axios ( {
    ...apiInit ,
    method : 'GET' ,
    url : `${mmUrl}/mm/v1/dhcp/subnets` ,
  } )
  const { body } = dhcpSubnets.data
  const dhcpSubnetPromises = await Promise.all ( dhcpSubnetsPostBody.map ( async ( subnetToPost , index ) => {
    const dhcpSubnetIndex = body.micronets.findIndex ( ( micronet ) => micronet.micronetId == subnetToPost.subnetId )
    if ( dhcpSubnetIndex == -1 && subnetToPost != null ) {
      const dhcpSubnetResponse = await axios ( {
        ...apiInit ,
        method : 'POST' ,
        url : `${mmUrl}/mm/v1/dhcp/subnets` ,
        data : subnetToPost
      } )
      return dhcpSubnetResponse.data
    }
  } ) )
  return dhcpSubnetPromises
}

/* Adds MUD configuration for devices */
const upsertDhcpDevicesWithMudConfig = async (hook , dhcpDevicesToUpsert) => {

  // Get MUD Url from users
  const mud = hook.app.get('mud')
  logger.debug('\n MUD url : ' + JSON.stringify( mud.url ) + '\t\t MUD version : ' + JSON.stringify(mud.version))
  let user = await hook.app.service('/mm/v1/micronets/users').find({})
  user = user.data[0]
  let userDevices = user.devices
  logger.debug('\n\n userDevices : ' + JSON.stringify(userDevices))
  let dhcpDevicesWithMudConfig = await Promise.all(dhcpDevicesToUpsert.map(async (dhcpDeviceToUpsert , index) => {
    let userDeviceIndex = userDevices.findIndex((userDevice) => userDevice.macAddress == dhcpDeviceToUpsert.macAddress.eui48 && userDevice.deviceId == dhcpDeviceToUpsert.deviceId)
    let mudUrlForDevice = userDeviceIndex != -1 ? userDevices[userDeviceIndex].mudUrl : ''
    // MUD URL Present. Call MUD Parser
    if(  mudUrlForDevice && mudUrlForDevice!='') {
      let mudParserPost = Object.assign ( {} , {
        url : mudUrlForDevice ,
        version : mud.version ,
        ip : dhcpDeviceToUpsert.networkAddress.ipv4
      } )
      logger.debug('\n\n MUD POST : ' + JSON.stringify(mudParserPost))
      // Make MUD Post call
      let mudParserRes = await axios ( {
        method : 'POST' ,
        url : mud.url ,
        data : mudParserPost
      } )
      mudParserRes = mudParserRes.data
      logger.debug('\n\n MUD Parser response : ' + JSON.stringify(mudParserRes))
      // return {... dhcpDevicesToUpsert, ['allowHosts']: mudParserRes.device.allowHosts }

      if(!(mudParserRes.device.hasOwnProperty('allowHosts')) || !(mudParserRes.device.hasOwnProperty('denyHosts'))) {
        return Promise.reject(new errors.GeneralError(new Error('MUD Parser error')))
      }
      if ( mudParserRes.device.allowHosts.length > 0 ) {
        dhcpDeviceToUpsert[ 'allowHosts' ] = mudParserRes.device.allowHosts
      }
      if ( mudParserRes.device.denyHosts.length > 0 ) {
        dhcpDeviceToUpsert[ 'denyHosts' ] = mudParserRes.device.denyHosts
      }
      return dhcpDeviceToUpsert
    } else {
      logger.debug('\n Empty MUD url.' + JSON.stringify(mudUrlForDevice) + ' Do nothing')
      return dhcpDeviceToUpsert
    }
  }))
  dhcpDevicesWithMudConfig = flattenArray(dhcpDevicesWithMudConfig)
  return dhcpDevicesWithMudConfig
}

// Add DHCP Devices with or without MUD configuration
const addDhcpDevices = async ( hook , requestBody , micronetId , subnetId ) => {
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl , mmUrl } = registry
  // Check if micronet exists in DB
  const micronetFromDB = await getMicronet ( hook , {} )
  // Original check with class property in request body
  // const micronetIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId && micronet[ "micronet-subnet-id" ] == subnetId )
  const micronetIndex = micronetFromDB.micronets.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId )
  // Construct POST DHCP Device body
  let dhcpDevicesPostBody =  requestBody.micronets.map ( ( micronet , index ) => {
    const connectedDevices = micronet[ "connected-devices" ]
     return connectedDevices.map ( ( device , index ) => {
      const deviceFromDbIndex = micronetFromDB.micronets[ micronetIndex ][ "connected-devices" ].findIndex ( ( deviceFromDB ) => deviceFromDB[ 'device-mac' ] == device[ 'device-mac' ] )
      const deviceFromDb = micronetFromDB.micronets[ micronetIndex ][ "connected-devices" ][ deviceFromDbIndex ]
      const dhcpDeviceIp = deviceFromDb[ 'device-ip' ]
        return {
          deviceId : device[ "device-id" ] ,
          macAddress : {
            eui48 : device[ "device-mac" ]
          },
          networkAddress : {
            ipv4 : dhcpDeviceIp
          }
        }
    } )
  } )
  dhcpDevicesPostBody = [].concat.apply ( [] , dhcpDevicesPostBody )
  dhcpDevicesPostBody = await upsertDhcpDevicesWithMudConfig(hook, dhcpDevicesPostBody)
  logger.debug('\n DHCP DEVICES POST BODY : ' + JSON.stringify(dhcpDevicesPostBody))
  if ( micronetIndex > -1 ) {
    // Check if subnet exists in DHCP Gateway
    const dhcpSubnet = await axios ( {
      ...apiInit ,
      method : 'GET' ,
      url : `${mmUrl}/mm/v1/dhcp/subnets/${subnetId}` ,
    } )
    logger.debug('\n DHCP Subnet : ' + JSON.stringify(dhcpSubnet.data))
    const { body, status } = dhcpSubnet.data
    if ( status != 404 && ((body.hasOwnProperty('micronets') && body.micronets.micronetId == subnetId) || (body.hasOwnProperty('micronet') && body.micronet.micronetId == subnetId))) {
      const dhcpSubnetDevices = await axios ( {
        ...apiInit ,
        method : 'get' ,
        url : `${mmUrl}/mm/v1/dhcp/subnets/${subnetId}/devices` ,
      } )
      const dhcpDevicePromises = await Promise.all ( dhcpDevicesPostBody.map ( async ( dhcpDevice , index ) => {
        // Check DHCP device to add does not exist in DHCP Subnet
        const devicePresentIndex = dhcpSubnetDevices.data.body.devices.findIndex ( ( subnetDevice ) => subnetDevice.deviceId == dhcpDevice.deviceId )
        if ( devicePresentIndex == -1 ) {
          const dhcpDeviceToAdd = await axios ( {
            ...apiInit ,
            method : 'POST' ,
            url : `${mmUrl}/mm/v1/dhcp/subnets/${subnetId}/devices` ,
            data : dhcpDevice
          } )
          return dhcpDeviceToAdd.data
        }
      } ) )
      return dhcpDevicePromises
    }
  }
}

/* Delete DHCP Subnets */
const deleteDhcpSubnets = async ( hook , micronet , micronetId ) => {
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl } = registry

  // Single micronet was deleted
  if ( micronetId != undefined && Object.keys ( micronet ).length > 0 ) {

    // Get the associated subnetId and name of micronet
    const micronetFromDB = await getMicronet ( hook , {} )
    const subnetId = micronet[ "micronet-subnet-id" ]

    // Delete DHCP Subnet
    dw.connect ( webSocketUrl ).then ( async () => {
      let dhcpSubnet = await dw.send ( {} , "GET" , "subnet" , subnetId )
      // Dhcp Subnet Present check
      if ( dhcpSubnet.status == 200 ) {
        let dhcpSubnetDelete = await dw.send ( {} , "DELETE" , "subnet" , subnetId )
        return dhcpSubnetDelete
      }
    } )
  }

  // All micronets were deleted
  if ( Object.keys ( micronet ).length == 0 && micronetId == undefined ) {
    dw.connect ( webSocketUrl ).then ( async () => {
      let dhcpSubnets = await dw.send ( {} , "GET" , "subnet" )
      // Dhcp Subnets Present check
      if ( dhcpSubnets.status == 200 ) {
        let dhcpSubnetsDelete = await dw.send ( {} , "DELETE" , "subnet" )
        return dhcpSubnetsDelete
      }
    } )
  }
}

/* Adding subnets & devices to DHCP */
const deallocateIPSubnets = async(hook, ipSubnets) => {
  const deallocateSubnetPromises = await Promise.all(ipSubnets.map(async(subnetNo)=> {
    return await subnetAllocation.deallocateSubnet(0,parseInt(subnetNo))
  }))
  return deallocateSubnetPromises
}

module.exports = {
  before : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [
      async hook => {
        const { params , id, data, path } = hook;
        const { route } = params
        logger.debug('\n\n CREATE PARAMS : ' + JSON.stringify(params) + '\t\t DATA : ' + JSON.stringify(data))

        /* User created. Initialize micronets object */
        if ( hook.data && hook.data.type == 'userCreate' ) {
          logger.debug('\n  Event Type ' + JSON.stringify( hook.data.type) +'\t\t Event data : ' + JSON.stringify(hook.data))
          const { type , id, ssid, name, gatewayId } = hook.data
          // Create Micronets object
          hook.data = Object.assign ( {} , {
            id : id ,
            name : name ,
            ssid : ssid ,
            gatewayId: gatewayId ,
            micronets : []
          } )
          return Promise.resolve ( hook )
        }

        // Create subnet and add device through device registration process
        if ( hook.data && hook.data.type == 'userDeviceRegistered' ) {
          logger.debug('\n  Device registration process.Event Type ' + JSON.stringify( hook.data.type) +'\t\t Event data : ' + JSON.stringify(hook.data))
          const { type , data } = hook.data
          const { subscriberId , device } = data
          const micronetFromDB = await getMicronet ( hook , subscriberId )
          const odlPostBody = await upsertRegisteredDeviceToMicronet ( hook , hook.data )
          logger.debug('\n ODL Post Body : ' + JSON.stringify(odlPostBody))
          // const odlResponse = await odlOperationsForUpserts ( hook , odlPostBody )
          // FAKE ODL API's
          const odlResponse = await mockOdlOperationsForUpserts( hook , odlPostBody, Object.assign({},{subscriberId} ))
          logger.debug('\n ODL Response : ' + JSON.stringify(odlResponse))
          if ( odlResponse.data ) {
            const odlResponseData =  odlResponse.data
            const patchRequestData =  (odlResponseData.hasOwnProperty('id') && odlResponseData.hasOwnProperty('name') && odlResponseData.hasOwnProperty('micronets')) ? odlResponseData.micronets
              : ( odlResponseData.hasOwnProperty('micronets') && !odlResponseData.hasOwnProperty('name')) ? odlResponseData.micronets : odlResponseData
            logger.debug('\n PATCH REQUEST DATA : ' + JSON.stringify(patchRequestData))
            const patchResult = await hook.app.service ( '/mm/v1/subscriber' ).patch ( subscriberId ,
              {
                micronets : patchRequestData
              } ,
              { query : {} , mongoose : { upsert : true } } )
            if(patchResult) {
              logger.debug('\n PATCH Result : ' + JSON.stringify(patchResult))
              const dhcpSubnetPostBody = Object.assign({},{
                micronets: [ Object.assign({},{ name: device.class, "micronet-subnet-id": device.class, "connected-devices":[] }) ]
              })
              const dhcpSubnet = await addDhcpSubnets(hook,dhcpSubnetPostBody)
              if(dhcpSubnet) {
                const dhcpDevicePostBody = Object.assign({},{
                  micronets:
                     [ Object.assign({},{
                      "connected-devices": [ Object.assign({}, {
                        "device-mac": device.macAddress,
                        "device-openflow-port": "4",
                        "device-name": device.hasOwnProperty('deviceName') ? device.deviceName : "Test Device", // TODO : Add Device Name
                        "device-id": device.deviceId
                      })]
                    })]
                  })
                const micronetIndex = patchRequestData.findIndex((micronet) => micronet.class == device.class)
                const micronetId = patchRequestData[micronetIndex]['micronet-id']
                const dhcpAddDevice = await addDhcpDevices(hook,dhcpDevicePostBody,micronetId, device.class)
              }
              hook.result = patchResult
              return Promise.resolve ( hook )
            }
          }
        }


        if(hook.data && !hook.data.hasOwnProperty('type')){
          const {id, micronetId} = route
          logger.debug('\n  REQUEST PARAMS ROUTE : ' + JSON.stringify(route) + '\t\t DATA : ' + JSON.stringify(data))
          const addSubnetBoolean = (route.hasOwnProperty('id') && !route.hasOwnProperty('micronetId')) ? true : false
          const addDeviceToSubnetBoolean = (route.hasOwnProperty('id') && route.hasOwnProperty('micronetId')) ? true : false
          logger.debug('\t\t addSubnetBoolean : ' + JSON.stringify(addSubnetBoolean) + '\t\t addDeviceToSubnetBoolean : ' + JSON.stringify(addDeviceToSubnetBoolean))

          // Create Subnet without device registration process
          if ( route.hasOwnProperty('id') && !route.hasOwnProperty('micronetId') ) {
            logger.debug('Create Subnet without device registration process ' + JSON.stringify(route))

            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , hook.data, route.id )
              logger.debug('\n ODL Post Body : ' + JSON.stringify(postBodyForODL) + '\t AddSubnet Flag : ' + JSON.stringify(addSubnet))
              // Call ODL and DHCP to add subnets
              if ( addSubnet ) {
                // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
                const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL, Object.assign({},{subscriberId:route.id}) )
                /* Update DB with ODL Response */
                logger.debug("\n\n ODL Response : " + JSON.stringify(odlResponse))
                if ( odlResponse.data && odlResponse.status == 201 ) {
                  // const dbUpdateResult = await updateMicronetModel ( hook , odlResponse.data )
                  const patchResult = await hook.app.service ( '/mm/v1/subscriber' ).patch ( route.id , { micronets :  odlResponse.data.micronets } );
                  if ( patchResult ) {
                    const dhcpSubnets = await addDhcpSubnets ( hook , hook.data )
                    hook.result = patchResult
                    return Promise.resolve ( hook )
                  }
                }
              }
              else {
                hook.result = await  hook.app.service ( '/mm/v1/subscriber' ).get ( route.id )
                return Promise.resolve ( hook )
              }
            }
          }

          // Reset micronet with an inital state
         // if ( originalUrl.toString () == '/mm/v1/micronets/init' ) {
         //    const isGtwyAlive = await isGatewayAlive ( hook )
         //    const isOdlAlive = await isODLAlive ( hook )
         //    const isGatewayConnected = await connectToGateway ( hook )
         //    if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
         //      const postBodyForODL = await populatePostObj ( hook , body )
         //      const odlResponse = await initializeMicronets ( hook , postBodyForODL )
         //
         //      /* ODL CALLS */
         //      const { status , data } = odlResponse
         //      if ( data && status == 201 ) {
         //        const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
         //          {
         //            id : micronetFromDB.id ,
         //            name : micronetFromDB.name ,
         //            ssid : micronetFromDB.ssid ,
         //            gatewayId : micronetFromDB.gatewayId ,
         //            micronets : data.micronets
         //          } ,
         //          { query : {} , mongoose : { upsert : true } } );
         //
         //        if ( patchResult ) {
         //          const dhcpSubnets = await addDhcpSubnets ( hook , body )
         //          hook.result = patchResult
         //          return Promise.resolve ( hook )
         //        }
         //        hook.result = patchResult
         //        return Promise.resolve ( hook )
         //      }
         //      /* ODL CALLS */
         //      return Promise.resolve ( hook )
         //    }
         //
         //  }

          // Add device to existing subnet
         if ( route.hasOwnProperty('id') && route.hasOwnProperty('micronetId') ) {
            logger.debug('\n Add Device To Subnet' + JSON.stringify(route))
            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              const postBody = hook.data
              // Retrieve all devices in micronet
              const micronetFromDB = await getMicronet ( hook , route.id )
              const micronetToUpdateIndex = micronetFromDB.micronets.findIndex ( ( micronet ) => (micronet[ "micronet-id" ] == route.micronetId) )
              if(micronetToUpdateIndex == -1){
                return Promise.reject(new errors.GeneralError(new Error('Micronet not found')))
              }
              const associatedSubnetId = micronetFromDB.micronets[micronetToUpdateIndex]['micronet-subnet-id']
              const presentDevices = micronetFromDB.micronets[ micronetToUpdateIndex ]
              const devicesToAddFromPost = postBody.micronets[ 0 ][ 'connected-devices' ]
              // Check if device is present in subnet or not
              let devicesToAdd = devicesToAddFromPost.map ( ( deviceToAddFromPost , index ) => {
                const isDevicePresentIndex = presentDevices[ "connected-devices" ].findIndex ( ( presentDevice ) =>
                  presentDevice[ "device-mac" ] == deviceToAddFromPost[ "device-mac" ] && presentDevice[ "device-id" ] == deviceToAddFromPost[ "device-id" ] && presentDevice[ "device-name" ] == deviceToAddFromPost[ "device-name" ] )
                if ( isDevicePresentIndex == -1 ) {
                  return deviceToAddFromPost
                }
              } )
              devicesToAdd = devicesToAdd.filter ( Boolean )
              logger.debug('\n Devices to add : ' + JSON.stringify(devicesToAdd))
              if ( devicesToAdd.length > 0 ) {
                // TODO : Check if user is present.Add device as unregistered.
                const users = await hook.app.service ( '/mm/v1/micronets/users' ).find ( { query : { id : route.id } } )
                logger.debug('\n USERS : ' + JSON.stringify(users))
                // Create user to add unregistered devices
                if(isEmpty(users.data)) {
                  const userDevicesPost = devicesToAdd.map((deviceToAdd)=> {
                    const postBodyMicronet = postBody.micronets[ 0 ]
                      return  Object.assign ( {} , {
                        deviceId : deviceToAdd['device-id'] ,
                        macAddress : deviceToAdd['device-mac'],
                        class: postBodyMicronet.hasOwnProperty('micronet-subnet-id') ? postBodyMicronet['micronet-subnet-id'] : postBodyMicronet.class, // TODO : Check if this shd be class
                        isRegistered : false,
                        deviceName: deviceToAdd['device-name']
                      } )
                  })
                  const userPost = Object.assign ( {} , {
                    id : micronetFromDB.id ,
                    name : micronetFromDB.name ,
                    ssid : micronetFromDB.ssid,
                    gatewayId : micronetFromDB.gatewayId,
                    devices : userDevicesPost
                  } )
                  const userCreated = await hook.app.service ( '/mm/v1/micronets/users').create(userPost)
                  }

               // User present. Check for device
                else {
                  logger.debug('\n User is present. Check for device')
                  const userDevices = users.data[0].devices
                  const postBodyMicronet = postBody.micronets[ 0 ]
                  const userDevicesToAdd = devicesToAdd.map((deviceToAdd)=> {
                    const userDeviceIndex = userDevices.findIndex((userDevice)=> userDevice.macAddress == deviceToAdd['device-mac'] && userDevice.deviceId == deviceToAdd['device-id'] )
                    if(userDeviceIndex == -1) {
                      logger.debug('\n Device not present in users.Add device to users ..')
                      return  Object.assign ( {} , {
                        deviceId : deviceToAdd['device-id'] ,
                        macAddress : deviceToAdd['device-mac'],
                        class: postBodyMicronet.hasOwnProperty('micronet-subnet-id') ? postBodyMicronet['micronet-subnet-id'] : postBodyMicronet.class , // TODO : Check if this shd be class
                        isRegistered : false,
                        deviceName: deviceToAdd['device-name']
                      } )
                    }
                  })
                  const updatedUserPromises = await Promise.all(userDevicesToAdd.map(async(userDeviceToAdd)=> {
                    const updatedUser = await hook.app.service ( '/mm/v1/micronets/users').patch ( null ,  {
                      isRegistered: userDeviceToAdd.isRegistered,
                      deviceId : userDeviceToAdd.deviceId ,
                      macAddress : userDeviceToAdd.macAddress ,
                      class : userDeviceToAdd.class,
                      deviceName: userDeviceToAdd.deviceName
                    }  , { query : { id : micronetFromDB.id }, mongoose: { upsert: true}});
                    return updatedUser.data
                  }))
                }
              }
                const postBodyForODL = await addDevicesInSubnet ( hook , route.micronetId , associatedSubnetId , devicesToAdd )
                logger.debug('\n Post Body for ODL : ' + JSON.stringify(postBodyForODL))
                // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
                const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign({},{ micronetId: route.micronetId , subnetId:associatedSubnetId, subscriberId: route.id })  )
                logger.debug('\n ODL Response : ' + JSON.stringify(odlResponse))
                if ( odlResponse.status == 201 && odlResponse.data ) {
                  // const dbUpdateResult = await updateMicronetModel ( hook , odlResponse.data )
                  // console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
                  const patchResult = await hook.app.service ( '/mm/v1/subscriber' ).patch ( route.id ,
                    {
                      micronets : odlResponse.data.micronets
                    } );
                  logger.debug('\n\n Add Device to subnet response : ' + JSON.stringify(patchResult))
                  if ( patchResult ) {
                    const addedDhcpDevices = await addDhcpDevices ( hook , hook.data , route.micronetId , associatedSubnetId )
                  }
                  hook.result = patchResult
                  return Promise.resolve ( hook );
                }
              }
              if ( devicesToAdd.length == 0 ) {
                hook.result = hook.app.service ( '/mm/v1/subscriber' ).find ( {})
                return Promise.resolve ( hook );
              }
            }

        }
    }
    ] ,
    update : [] ,

    patch : [
      async ( hook ) => {
        const { data , id } = hook;
        hook.data = data
        return Promise.resolve ( hook )
      }
    ] ,
    remove : [
      async ( hook ) => {
        const { data, params } = hook;
        const { route } = params
        const {id, micronetId } = route
        logger.debug('\n  Route params  : ' + JSON.stringify(route))

        if ( id || (id && micronetId) ) {
          const registry = await getRegistry ( hook , {} )
          const { mmUrl } = registry
          let postBodyForDelete = [] , micronetToDelete = {} , registeredDevicesToDelete = [] , ipSubnets = []
          // ODL and Gateway checks
          const isGtwyAlive = await isGatewayAlive ( hook )
          const isOdlAlive = await isODLAlive ( hook )
          const isGatewayConnected = await connectToGateway ( hook )
          if ( isGtwyAlive && isOdlAlive && isGatewayConnected ) {
            const mockMicronetsFromDb = await hook.app.service ( `/mm/v1/mock/subscriber` ).find ( {} )
            const mockMicronetIndex = mockMicronetsFromDb.data.length > 0 ? mockMicronetsFromDb.data.findIndex((mockMicronet) => mockMicronet.id == id) : -1
            logger.debug('\n\n Mock micronet Index : ' + JSON.stringify(mockMicronetIndex))
            // Delete single micro-net
            if ( micronetId ) {
              const micronetFromDB = await getMicronet ( hook , id )
              const { micronets } = micronetFromDB
              const micronetToDeleteIndex = micronets.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId )
              // Valid index. Micronet exists
              if ( micronetToDeleteIndex > -1 ) {
                micronetToDelete = micronets[ micronetToDeleteIndex ]
                ipSubnets = [].concat ( micronetToDelete[ 'micronet-subnet' ].split ( '.' )[ 2 ] )
                registeredDevicesToDelete = micronetToDelete[ 'connected-devices' ]
                postBodyForDelete = micronets.filter ( ( micronet , index ) => index != micronetToDeleteIndex )
              }
            }

            // Delete all micro-nets
            const micronetFromDB = await getMicronet ( hook , {} )
            if ( ipSubnets.length == 0 ) {
              ipSubnets = micronetFromDB.micronets.map ( ( micronet ) => {
                return micronet[ 'micronet-subnet' ].split ( '.' )[ 2 ]
              } )
            }
            logger.debug('\n Remove hook postBodyForDelete : ' + JSON.stringify(postBodyForDelete) + '\t\t IP Subnets : ' + JSON.stringify(ipSubnets))
            const patchResult = await hook.app.service ( '/mm/v1/subscriber' ).patch ( id ,
              {
                micronets : postBodyForDelete
              } );
            logger.debug('\n Remove hook patchResult : ' + JSON.stringify(patchResult))
            if ( patchResult ) {
              if ( micronetId ) {
                const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , micronetToDelete ,micronetId )

                if(mockMicronetIndex > -1 ) {
                  const mockMicronetsDelete = await axios ( {
                    ...apiInit ,
                    method : 'DELETE' ,
                    url : `${mmUrl}/mm/v1/mock/subscriber/${id}/micronets/${micronetId}` ,
                    data : Object.assign ( {} , { micronets : [ postBodyForDelete ] } )
                  } )
                }

                // Deallocate subnets
                if ( ipSubnets.length > 0 ) {
                  deallocateIPSubnets ( hook , ipSubnets )
                }

                let users = await hook.app.service ( `/mm/v1/micronets/users` ).find ( {} )
                if ( !(isEmpty ( users.data )) ) {
                  users = users.data[ 0 ]
                  let updatedDevices = users.devices.map ( ( registeredDevice , index ) => {
                    const deviceToDeleteIndex = registeredDevicesToDelete.findIndex ( ( deviceFromMicronet ) => registeredDevice.macAddress == deviceFromMicronet[ 'device-mac' ] && registeredDevice.deviceId == deviceFromMicronet[ 'device-id' ] )
                    if ( deviceToDeleteIndex == -1 ) {
                      return registeredDevice
                    }
                  } )
                  updatedDevices = updatedDevices.filter ( Boolean )
                  const userPatchResult = await hook.app.service ( '/mm/v1/micronets/users' ).patch ( null , Object.assign ( {
                    devices : updatedDevices ,
                    deleteRegisteredDevices : true
                  } ) , { query : { id : users.id } , mongoose : { upsert : true } } )
                }

              }
              if ( postBodyForDelete.length == 0 && !micronetId && id ) {
                const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , {} , undefined )
                if(mockMicronetIndex > -1 ) {
                  const mockMicronetsDelete = await axios ( {
                    ...apiInit ,
                    method : 'DELETE' ,
                    url : `${mmUrl}/mm/v1/mock/subscriber/${id}/micronets` ,
                    data : Object.assign ( {} , { micronets : [] } )
                  } )
                }
                // De-allocate subnets
                if ( ipSubnets.length > 0 ) {
                  deallocateIPSubnets ( hook , ipSubnets )
                }

                let users = await hook.app.service ( `/mm/v1/micronets/users` ).find ( {} )
                if ( !(isEmpty ( users.data )) ) {
                  users = users.data[ 0 ]
                  let updatedDevices = []
                  const userPatchResult = await hook.app.service ( '/mm/v1/micronets/users' ).patch ( null , Object.assign ( {
                    devices : updatedDevices ,
                    deleteRegisteredDevices : true
                  } ) , { query : { id : users.id } , mongoose : { upsert : true } } )
                }

              }
            }
            hook.result = patchResult
            return Promise.resolve ( hook );
          }
        }
      }
    ]
  } ,

  after : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [] ,
    update : [] ,
    patch : [
      async ( hook ) => {
        const { data , id , params } = hook
        hook.app.service ( '/mm/v1/subscriber' ).emit ( 'micronetUpdated' , {
          type : 'micronetUpdated' ,
          data : data
        } );
      }
    ] ,
    remove : []
  } ,

  error : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [] ,
    update : [] ,
    patch : [] ,
    remove : []
  }
};
