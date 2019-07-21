const subnetAllocation = require ( '../../hooks/subnetAllocation' )
const micronetOperationalConfig = require ( '../../mock-data/micronetsOperationalConfig' );
const micronetNotifications = require ( '../../mock-data/micronetNotifications' );
const axios = require ( 'axios' );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const dw = require ( '../../hooks/dhcpWrapperPromise' )
const WIRED = "ethernet"
const WIRELESS = "wifi"
const errors = require ( '@feathersjs/errors' );
const logger = require ( './../../logger' );
const paths = require ( './../../hooks/servicePaths' )
const { MICRONETS_PATH , REGISTRY_PATH , ODL_PATH , MOCK_MICRONET_PATH , USERS_PATH } = paths
var rn = require('random-number');
var vLanGen = rn.generator({
  min:1000, max:4095,integer: true
})

/* BootStrap Sequence */
const isGatewayAlive = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl } = registry
  await dw.setAddress ( webSocketUrl )
  const dhcpConnection = await dw.connect ().then ( () => {
    return true
  } )
  return dhcpConnection
}

const flattenArray = ( a ) => Array.isArray ( a ) ? [].concat ( ...a.map ( flattenArray ) ) : a;

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

const connectToGateway = async ( hook ) => {
  return true
}

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
  // Fake Notification
  const odlNotifications = Object.assign ( {} , { data : micronetNotifications , status : 200 } )
  const { data , status } = odlNotifications
  return (data && status == 200) ? true : false

}

/* BootStrap Sequence */
const getOdlConfig = async ( hook , id ) => {
  return hook.app.service ( `${ODL_PATH}` ).get ( id )
    .then ( ( data ) => {
      return data
    } )
}

/* Get Switch Config */
const getODLSwitchDetails = async ( hook , gatewayId ) => {
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  if ( isEmpty ( odlStaticConfig ) ) {
    return Promise.reject ( new errors.GeneralError ( new Error ( 'Missing Switch config' ) ) )
  }
  const { micronetInterfaces } = odlStaticConfig
  // const bridgeTrunkIndex = switchConfig.bridges.findIndex ( ( bridge ) => bridge.hasOwnProperty ( "trunkPort" ) && bridge.hasOwnProperty ( "trunkIp" ) )
  // const bridgeTrunk = switchConfig.bridges[ bridgeTrunkIndex ]

  const bridgeTrunk = Object.assign({},{
    "trunkPort": '2',
    "trunkIp": "10.36.32.124/24",
    "name": "brmn001"
  })
  const ovsHost = '10.36.32.124' // odlStaticConfig.ovsHost
  const ovsPort = '8181' // odlStaticConfig.ovsPort

  let wirelessInterfaces = micronetInterfaces.map ( ( interface ) => {
    logger.debug('\n Current interface : ' + JSON.stringify(interface))
    if ( interface.hasOwnProperty ( "medium" ) && interface.medium == WIRELESS ) {
      return interface
    }
  } )
  wirelessInterfaces = wirelessInterfaces.filter ( Boolean )

  let wiredInterfaces = micronetInterfaces.map ( ( interface ) => {
    logger.debug('\n Current interface : ' + JSON.stringify(interface))
    if ( interface.hasOwnProperty ( "medium" ) && interface.medium == WIRED ) {
      return interface
    }
  } )
  wiredInterfaces = wiredInterfaces.filter ( Boolean )

  return {
    odlStaticConfig ,
    bridgeTrunk ,
    wirelessInterfaces ,
    wiredInterfaces ,
    ovsHost ,
    ovsPort ,
    micronetInterfaces
  }
}

const populateOdlConfig = async ( hook , requestBody , gatewayId ) => {
  const { micronets } = requestBody;
  const { odlStaticConfig ,  bridgeTrunk , wirelessInterfaces , wiredInterfaces  , ovsHost , ovsPort , micronetInterfaces } = await getODLSwitchDetails ( hook , gatewayId )
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
    bridgeTrunk ,
    wirelessInterfaces ,
    wiredInterfaces ,
    micronetInterfaces  ,
    ovsHost ,
    ovsPort ,
    requestBody
  }
}

const getSubnet = ( hook , index ) => {
  return subnetAllocation.getNewSubnet ( index ).then ( ( subnet ) => {
    return subnet
  } )
}

// TODO : Change with Gateway Config
/* Get Static Subnet IP's */
const getStaticSubnetIps = async ( hook , subnetDetails , requestBody ) => {

  /* Get gatewayId */
  const registry = await getRegistry ( hook )
  if ( isEmpty ( registry ) ) {
    return Promise.reject ( new errors.GeneralError ( new Error ( 'Registry not found' ) ) )
  }
  const gatewayId = registry.gatewayId
  /* Get gatewayId */

  /* Get SwitchConfig */
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  if ( isEmpty ( odlStaticConfig ) ) {
    return Promise.reject ( new errors.GeneralError ( new Error ( 'Switch Config not found' ) ) )
  }
  const { micronetInterfaces } = odlStaticConfig
  /* Get SwitchConfig */

  /* Get Allocated subnets  */
  const micronetFromDB = await getMicronet ( hook , {} )
  const allocatedSubnetNos = micronetFromDB.micronets.map ( ( micronet ) => {
    return (micronet[ 'micronet-subnet' ])
  } )

  let wiredSwitchConfigSubnets = micronetInterfaces.map ( ( interface, index ) => {
    logger.debug('\n Current Interface : ' + JSON.stringify(interface))
      if ( interface.hasOwnProperty ( 'medium' ) && interface.medium == WIRED ) {
        return interface
      }
  } )

  // Flatten array , filter null values , remove duplicate elements, remove previously allocated subnetNos
  wiredSwitchConfigSubnets = [].concat ( ...wiredSwitchConfigSubnets ).filter ( Boolean )
  wiredSwitchConfigSubnets = [ ...(new Set ( wiredSwitchConfigSubnets )) ]
  // wiredSwitchConfigSubnets = wiredSwitchConfigSubnets.filter ( ( el ) => !allocatedSubnetNos.includes ( el ) );

  let wirelessSwitchConfigSubnets =  micronetInterfaces.map ( ( interface, index ) => {
    logger.debug('\n Current Interface : ' + JSON.stringify(interface))
    if ( interface.hasOwnProperty ( 'medium' ) && interface.medium == WIRELESS ) {
      return interface
    }
  } )

  // Flatten array , filter null values , remove duplicate elements, remove previously allocated subnetNos
  wirelessSwitchConfigSubnets = [].concat ( ...wirelessSwitchConfigSubnets ).filter ( Boolean )
  wirelessSwitchConfigSubnets = [ ...(new Set ( wirelessSwitchConfigSubnets )) ]
  // wirelessSwitchConfigSubnets = wirelessSwitchConfigSubnets.filter ( ( el ) => !allocatedSubnetNos.includes ( el ) );

  logger.debug( '\n Static Subnet IPs wiredSwitchConfigSubnets : ' + JSON.stringify ( wiredSwitchConfigSubnets ) + '\t\t wirelessSwitchConfigSubnets : ' + JSON.stringify ( wirelessSwitchConfigSubnets ) )

  const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
    logger.debug('\n Current subnet :  ' + JSON.stringify(subnet))
    let switchConfigSubnetType = subnet.connection == WIRELESS ? wirelessSwitchConfigSubnets : wiredSwitchConfigSubnets
    logger.debug('\n Subnet : ' + JSON.stringify(subnet) + '\t\t switchConfigSubnetType : ' + JSON.stringify(switchConfigSubnetType) + '\t\t Index : ' + JSON.stringify(index))
    if ( isEmpty ( switchConfigSubnetType )  ) {
      return Promise.reject ( new errors.GeneralError ( new Error ( 'Micronet cannot be created.No wired subnet available' ) ) )
    }
    else if ( subnetDetails.length > switchConfigSubnetType.length ) {
      const connectionType = subnet.connection == WIRELESS ? WIRELESS : WIRED
      // logger.debug('\n ConnectionType : ' + JSON.stringify(connectionType))
      // const availableSubnetLength = connectionType == 'wifi' ? wirelessSwitchConfigSubnets.length : wiredSwitchConfigSubnets.length
      // return Promise.reject ( new errors.GeneralError ( new Error ( `Cannot add ${subnetDetails.length} ${connectionType} micronets. Only ${availableSubnetLength} ${connectionType} micronet can be added.Please update switch config to add more.` ) ) )
    }
   // const interfaceSubnets =  subnet.connection == 'wired' && switchConfigSubnetType[ index ].hasOwnProperty('ipv4Subnets') ? switchConfigSubnetType[ index ].ipv4Subnets : switchConfigSubnetType[ index ].ipv4SubnetRanges
    const interfaceSubnets = switchConfigSubnetType
    logger.debug('\n Interface Subnets : ' + JSON.stringify(interfaceSubnets) + '\t\t subnet.connection : ' + JSON.stringify(subnet.connection))
    const subnets = subnet.connection == WIRED ? await subnetAllocation.allocateSubnetAddress ( interfaceSubnets[index].ipv4Subnets[index].subnetRange , interfaceSubnets[index].ipv4Subnets[index].subnetGateway ) :
      await subnetAllocation.allocateSubnetAddress ( interfaceSubnets[index].ipv4SubnetRanges[index].subnetRange , interfaceSubnets[index].ipv4SubnetRanges[index].subnetGateway )
    const result = Object.assign ( {} , { subnets: subnets ,  interface: interfaceSubnets[index], connectionType: subnet.connection } )
    return result
  } ) )
  return promises

}
// TODO : Change with Gateway Config
/* Get Dynamic Subnet IP's */
const getSubnetIps = async ( hook , subnetDetails , requestBody ) => {
  const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
    const subnets = await subnetAllocation.getNewSubnet ( index )
    return Object.assign ( {} , subnets )
  } ) )
  return promises
}
// TODO : Change with Gateway Config
const getDeviceForSubnet = async ( hook , subnetDetails , subnets, interface, connectionType ) => {
  logger.debug('\n\n SubnetDetails : ' + JSON.stringify(subnetDetails) + '\t\t subnets : ' + JSON.stringify(subnets) + '\t\t Interface : ' + JSON.stringify(interface) + '\t\t ConnectionType : ' + JSON.stringify(connectionType))
  subnetDetails = [].concat ( ...subnetDetails );
  let devicesWithIp = await Promise.all ( subnets.map ( async ( subnet , subnetIndex ) => {
    logger.debug('\n Current subnet : ' + JSON.stringify(subnet))
    const deviceAddressSpec = connectionType == 'wifi' ? interface.ipv4SubnetRanges[0].deviceRange : interface.ipv4Subnets[0].deviceRange
    if ( subnetIndex < subnetDetails.length && subnetDetails[ subnetIndex ].devices.length >= 1 ) {
      const devices = subnetDetails[ subnetIndex ].devices
      const subnetAndDeviceIpData = await subnetAllocation.allocateDeviceAddress ( subnet.subnetAddress , deviceAddressSpec , devices )
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
      connection : micronet[ 'device-connection' ] || WIRED ,
      devices : micronet[ 'connected-devices' ] || []
    } )
  } )
  logger.debug('\n SubnetDetails : ' + JSON.stringify(subnetDetails) )

  // Gets random subnets
  // const subnets = await getSubnetIps ( hook , subnetDetails , requestBody )

  // Gets static subnets
  const  result = await getStaticSubnetIps ( hook , subnetDetails , requestBody )
  logger.debug('\n Obtained result : ' + JSON.stringify(result))
  const { subnets, interface, connectionType } = result[0]
  logger.debug('\n Obtained subnets from IP Allocator : ' + JSON.stringify(subnets) + '\t\t Interface Subnets : ' + JSON.stringify(interface) + '\t\t Connection Type : ' + JSON.stringify(connectionType))

  /* Add check for devices length in subnetDetails array */
  let subnetDetailsWithDevices = subnetDetails.map ( ( subnetDetail , index ) => {
    if ( subnetDetail.hasOwnProperty ( 'devices' ) && subnetDetail.devices.length >= 1 ) {
      return subnetDetail
    }
  } )
  logger.debug('\n\n subnetDetailsWithDevices : ' + JSON.stringify(subnetDetailsWithDevices))
  subnetDetailsWithDevices = subnetDetailsWithDevices.filter ( Boolean )
  logger.debug('\n\n subnetDetailsWithDevices after filter : ' + JSON.stringify(subnetDetailsWithDevices))

  /* All Subnets have Devices */
  if ( subnets.length == subnetDetailsWithDevices.length ) {
    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetails , subnets, interface, connectionType )
    logger.debug( '\n All subnets with devices : ' + JSON.stringify ( subnetsWithDevices ) )
    return subnetsWithDevices
  }

  /* Few Subnets have Devices */
  if ( subnets.length > 0 && subnetDetailsWithDevices.length >= 1 && subnets.length > subnetDetailsWithDevices.length ) {
    const subnetsWithDevicesSubset = subnetDetailsWithDevices.map ( ( sbd , index ) => {
      return subnets[ index ]
    } )

    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetailsWithDevices , subnetsWithDevicesSubset, interface, connectionType )

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
  if ( !isEmpty(subnets) && subnetDetailsWithDevices.length == 0 ) {
    return subnets
  }

}

const getRegistryForSubscriber = async ( hook , subscriberId ) => {
  if ( subscriberId != undefined ) {
    return await hook.app.service ( `${REGISTRY_PATH}` ).get ( subscriberId )
  }
  else {
    return Promise.reject ( new errors.GeneralError ( new Error ( `Invalid or missing subscriber ${id}` ) ) )
  }
}

const getSubscriberId = async ( hook ) => {
  const { params , data } = hook
  const { route } = params
  // logger.debug('\n Get Subscriber id params : ' + JSON.stringify(params) + '\t\t Data : ' + JSON.stringify(data) )
  const subscriberIdFromHook = !isEmpty ( params ) && !isEmpty ( route ) && isEmpty ( data ) ? route.id : isEmpty ( params ) && isEmpty ( route ) && !isEmpty ( data ) && data.hasOwnProperty ( 'type' ) && data.type == 'userDeviceRegistered' && data.data.hasOwnProperty ( 'subscriberId' ) ? data.data.subscriberId : undefined
  const defaultSubscriberId = hook.app.get ( 'mano' ).subscriberId
  // logger.debug('\n SubscriberIdFromHook : ' + JSON.stringify(subscriberIdFromHook) + '\t\t MANO SubscriberId : ' + JSON.stringify(defaultSubscriberId))
  const subscriberId = subscriberIdFromHook != undefined ? subscriberIdFromHook : defaultSubscriberId != undefined ? defaultSubscriberId : undefined
  // logger.debug('\n Subscriber ID : ' + JSON.stringify(subscriberId))
  return subscriberId
}

const getRegistry = async ( hook ) => {
  const mano = hook.app.get ( 'mano' )
  const subscriberId = await getSubscriberId ( hook )
  // logger.debug('\n Registry for SubscriberID  : ' + JSON.stringify(subscriberId))
  const registry = await getRegistryForSubscriber ( hook , subscriberId )
  return registry
}

const getMicronet = async ( hook , subscriberId ) => {
  const id = isEmpty ( subscriberId ) ? await getSubscriberId ( hook ) : subscriberId
  // logger.debug('\n Micronet for SubscriberID : ' + JSON.stringify(id))
  if ( id != undefined ) {
    return await hook.app.service ( `${MICRONETS_PATH}` ).get ( id )
  }
  else {
    return Promise.reject ( new errors.GeneralError ( new Error ( `Invalid or missing subscriber ${id}` ) ) )
  }

}

const populatePostObj = async ( hook , reqBody ) => {
  const { micronets } = reqBody
  const noOfMicronets = micronets.length
  // logger.debug('\n Micronets : ' + JSON.stringify(micronets) + '\t\t Length : ' + JSON.stringify(noOfMicronets))
  /* Get gatewayId */
  const registry = await getRegistry ( hook )
  if ( isEmpty ( registry ) ) {
    return Promise.reject ( new errors.GeneralError ( new Error ( 'Registry not found' ) ) )
  }
  const gatewayId = registry.gatewayId
  /* Get gatewayId */

  /* Populate ODL Static Config */
  const config = await populateOdlConfig ( hook , reqBody , gatewayId )
  const { reqBodyWithOdlConfig , wirelessPorts , wiredPorts , requestBody } = config

  /* Populate Sub-nets and Devices Config */
  const subnetAndDeviceIps = await getSubnetAndDeviceIps ( hook , reqBodyWithOdlConfig )
  logger.debug('\n Obtained subnetAndDeviceIps : ' + JSON.stringify(subnetAndDeviceIps))
  let updatedReqPostBody = reqBodyWithOdlConfig.map ( ( reqPostBody , index ) => {

    let connectedDevicesFull = []
    if ( !isEmpty(subnetAndDeviceIps) && subnetAndDeviceIps.hasOwnProperty ( 'connectedDevices' ) && subnetAndDeviceIps.connectedDevices.length > 0 ) {
      connectedDevicesFull = subnetAndDeviceIps.connectedDevices.map ( ( device , index ) => {
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
      "micronet-subnet" : subnetAndDeviceIps.subnetAddress ,
      "micronet-gateway-ip" : subnetAndDeviceIps.gatewayAddress,
      "dhcp-zone" : subnetAndDeviceIps.subnetAddress ,
      "connected-devices" : connectedDevicesFull
    }
  } )
  updatedReqPostBody = [].concat ( ...updatedReqPostBody )
  return updatedReqPostBody
}

/* ODL Config PUT / GET Calls */
const upsertOdLConfigState = async ( hook , postBody ) => {
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry

  /* Axios ODL call.Check for Response Code 201 or 200
  const odlConfigResponse = await axios ( {
   ...apiInit ,
   auth: odlAuthHeader,
   method : 'PUT' ,
   url : `http://${odlHost}:${odlSocket}/restconf/config/micronets:micronets` ,
   data: postBody
   })
  const {status, data} = odlConfigResponse
  */

  // Uncomment for Fake response
  const odlConfigResponse = Object.assign ( {} , { status : 200 , data : "" } )
  return odlConfigResponse
}

const fetchOdlOperationalState = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry

  /* URL : http://{{odlhost}}:{{odlsocket}}/restconf/operational/micronets:micronets
  const odlOperationalState = await axios ( {
    ...apiInit ,
    auth: odlAuthHeader,
    method : 'GET' ,
    url : `http://${odlHost}:${odlSocket}/restconf/operational/micronets:micronets` ,
  } )

  // const { status, data } = odlOperationalState
  // return odlOperationalState
  */

  // Uncomment for Fake response
  const odlOperationalState = Object.assign ( {} , { data : micronetOperationalConfig , status : 200 } )
  return odlOperationalState
}

// Calls mock-micronet API
const mockOdlOperationsForUpserts = async ( hook , requestBody , reqParams ) => {
  const { micronetId , subnetId , subscriberId } = reqParams
  // logger.debug('\n MockOdlOperationsForUpserts requestBody : ' + JSON.stringify(requestBody) + '\t\t Req Params : ' + JSON.stringify(reqParams))
  let postBody = requestBody.hasOwnProperty ( 'micronets' ) && requestBody.hasOwnProperty ( 'name' ) && requestBody.hasOwnProperty ( 'id' ) ? requestBody.micronets : requestBody
  // logger.debug('\n MockOdlOperationsForUpserts  postBody : ' + JSON.stringify(postBody))
  const registry = await getRegistry ( hook , {} )
  const { mmUrl } = registry
  const mockResponse = await axios ( {
    ...apiInit ,
    method : 'POST' ,
    url : micronetId && subscriberId ? `${mmUrl}/mm/v1/mock/subscriber/${subscriberId}/micronets/${micronetId}/devices` : `${mmUrl}/mm/v1/mock/subscriber/${subscriberId}/micronets` ,
    data : Object.assign ( {} , { micronets : postBody } )
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

const upsertSubnetsToMicronet = async ( hook , body , subscriberId ) => {
  let postBodyForODL = []
  const micronetFromDb = await getMicronet ( hook , subscriberId )
  // TODO : Add Logic to check with operational state

  const subnetsStatus = await subnetPresentCheck ( hook , body , micronetFromDb )
  // logger.debug('\n SUBNET STATUS : ' + JSON.stringify(subnetsStatus))
  if ( subnetsStatus.notFound.length >= 1 ) {
    const subnetsToAdd = await createSubnetInMicronet ( hook , body , subnetsStatus.notFound )
    postBodyForODL = micronetFromDb.micronets.concat ( subnetsToAdd )
    return { postBodyForODL , addSubnet : true }
  }
  if ( subnetsStatus.notFound.length == 0 ) {
    postBodyForODL = Object.assign ( {} , { micronets : micronetFromDb.micronets } )
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
        "device-connection" : device.deviceConnection ,
        "connected-devices" : []
      } ]
    } )

    const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , postBodyForSubnet , subscriberId )
    //  logger.debug('\n  PostBody for ODL : ' + JSON.stringify(postBodyForODL) + '\t\t addSubnet : ' + JSON.stringify(addSubnet))
    /* ODL API's */
    // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
    const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign ( {} , { subscriberId } ) )
    //  logger.debug('\n ODL Response : ' + JSON.stringify(odlResponse.data) + '\t\t status : ' + JSON.stringify(odlResponse.status))
    if ( odlResponse.data && odlResponse.status == 201 ) {
      const addSubnetPatchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( subscriberId ,
        { micronets : odlResponse.data.micronets } ,
        { query : {} , mongoose : { upsert : true } } );

      // Add device to subnet
      if ( addSubnetPatchResult ) {
        micronetFromDB = await getMicronet ( hook , {} )
        const micronetToUpdateIndex = micronetFromDB.micronets.findIndex ( ( micronet ) => (micronet.class == device.class) )
        const micronetToUpdate = micronetFromDB.micronets[ micronetToUpdateIndex ]
        const postODLBody = await addDevicesInSubnet ( hook , micronetToUpdate[ 'micronet-id' ] , micronetToUpdate[ 'micronet-subnet-id' ] , device )
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
  const { data, params } = hook

 logger.debug('\n Micronet hook addDevicesInSubnet : ' + JSON.stringify(devices) + '\t\t Hook data : ' + JSON.stringify(data))
 logger.debug('\n Micronet hook micronetId : ' + JSON.stringify(micronetId) + '\t\t SubnetId : ' + JSON.stringify(subnetId))

  devices = [].concat ( devices )
  let formattedDevices = devices.map ( ( device , index ) => {
    if ( device.hasOwnProperty ( "isRegistered" ) ) {
      return {
        "device-mac" : device.macAddress ,
        "device-name" : device.hasOwnProperty ( 'deviceName' ) ? device.deviceName : `Test Device` ,
        "device-id" : device.deviceId ,
        "device-openflow-port" : 2, // TODO: Add device-openflow-port value from switch config
        "device-medium":device.deviceConnection || WIRED
      }
    }
    else {
      return {
        "device-mac" : device[ "device-mac" ] ,
        "device-name" : device[ "device-name" ] || `Test Device` ,
        "device-id" : device[ "device-id" ] ,
        "device-openflow-port" : device[ "device-openflow-port" ],
        "device-medium":device.deviceConnection || WIRED
      }
    }
  } )
  const micronetFromDB = await getMicronet ( hook , {} )
  const micronetToUpdateIndex = micronetId && subnetId ? micronetFromDB.micronets.findIndex ( ( micronet ) => {
    return (micronetId == micronet[ 'micronet-id' ])
  } ) : 0

  const micronetToUpdate = micronetFromDB.micronets[ micronetToUpdateIndex ]
  const micronetSubnet = micronetToUpdate[ 'micronet-subnet' ]
 const { odlStaticConfig , bridgeTrunk , wirelessInterfaces , wiredInterfaces , ovsHost , ovsPort , micronetInterfaces } = await getODLSwitchDetails(hook,micronetFromDB.gatewayId)
  logger.debug('\n\n Micronet Subnet : ' + JSON.stringify(micronetSubnet) + '\t\t Wireless Interface : ' + JSON.stringify(wirelessInterfaces) + '\t\t Wired Interfaces : ' + JSON.stringify(wiredInterfaces))
  logger.debug('\n Formatted Devices : ' + JSON.stringify(formattedDevices))

  // Convert subnetNo string to Int
  const subnetNo = parseInt ( micronetSubnet.split ( '.' )[ 2 ] , 10 );

  const deviceInterfaces = devices.length == 1 ? devices[0].deviceConnection == WIRELESS ? wirelessInterfaces : wiredInterfaces : ''
  logger.debug('\n\n Device Interfaces : ' + JSON.stringify(deviceInterfaces))
  const deviceSpec = devices.length == 1 ? devices[0].deviceConnection == WIRELESS ? deviceInterfaces[0].ipv4SubnetRanges[0].deviceRange :  deviceInterfaces[0].ipv4Subnets[0].deviceRange : ''
  logger.debug('\n\n Device Spec : ' + JSON.stringify(deviceSpec) + '\t\t Subnet No : ' + JSON.stringify(micronetSubnet) + '\t\t Formatted Devices : ' + JSON.stringify(formattedDevices))

  const subnetWithDevices = await subnetAllocation.allocateDeviceAddress ( micronetSubnet , deviceSpec, formattedDevices[0] )  // TODO: Ashwini change this function
  logger.debug('\n\n subnetWithDevices : ' + JSON.stringify(subnetWithDevices))
  const formattedSubnetWithDevices = formattedDevices.map ( ( device , index ) => {
    let deviceFromIpAllocator = subnetWithDevices.devices.map ( ( ipAllocatorDevice ) => {
      if ( ipAllocatorDevice[ 'device-mac' ] == device[ 'device-mac' ] && ipAllocatorDevice[ 'device-name' ] == device[ 'device-name' ] && ipAllocatorDevice[ 'device-id' ] == device[ 'device-id' ] ) {
        return ipAllocatorDevice
      }
    } )
    logger.debug('\n DeviceFromIpAllocator : ' + JSON.stringify(deviceFromIpAllocator))
    deviceFromIpAllocator = deviceFromIpAllocator.filter ( Boolean )
    logger.debug('\n DeviceFromIpAllocator from filter : ' + JSON.stringify(deviceFromIpAllocator))
    if ( deviceFromIpAllocator ) {
      return {
        "device-mac" : device[ "device-mac" ] ,
        "device-name" : device[ "device-name" ] ,
        "device-id" : device[ "device-id" ] ,
        "device-openflow-port" : deviceFromIpAllocator[ 0 ][ "device-openflow-port" ] ,
        "device-ip" : deviceFromIpAllocator[ 0 ].deviceAddress
      }
    }
  } )
  logger.debug('\n\n Formatted SubnetWithDevices : ' + JSON.stringify(formattedSubnetWithDevices))
  const updatedMicronetwithDevices = Object.assign ( {} , micronetToUpdate , { 'connected-devices' : micronetToUpdate[ 'connected-devices' ].concat ( formattedSubnetWithDevices ) } )
  const postBodyForODL = micronetFromDB
  postBodyForODL.micronets[ micronetToUpdateIndex ] = updatedMicronetwithDevices
  return postBodyForODL
}
/* Add Registered devices to existing or new subnet */

/* Adding subnets & devices to DHCP */
const addDhcpSubnets = async ( hook , requestBody ) => {

  const { data } = hook
  let connectionType = ''
  logger.debug('\n Hook data addDhcpSubnets : ' + JSON.stringify(data))
  if(data.hasOwnProperty('type') && data.hasOwnProperty('data') && data.data.hasOwnProperty('device') && data.data.device.hasOwnProperty('deviceConnection')){
    connectionType =  data.data.device.deviceConnection == WIRELESS ? WIRELESS : WIRED
  }
  if(!data.hasOwnProperty('type') && !data.hasOwnProperty('data') && data.hasOwnProperty('device') && data.device.hasOwnProperty('deviceConnection')){
    connectionType =  data.device.deviceConnection == WIRELESS ? WIRELESS : WIRED
  }
  logger.debug('\n Connection Type : ' + JSON.stringify(connectionType))
  const dhcpSubnetsToAdd = requestBody.micronets.map ( ( micronet , index ) => {
    return {
      class : micronet.class ? micronet.class : micronet.name ,
      subnetId : micronet[ "micronet-subnet-id" ]
    }
  } )

  logger.debug('\n addDhcpSubnets requestBody : ' + JSON.stringify(requestBody) + '\t\t dhcpSubnetsToAdd : ' + JSON.stringify(dhcpSubnetsToAdd))

  const dhcpSubnetLength = dhcpSubnetsToAdd.length
  const micronetFromDB = await getMicronet ( hook , {} )
  const { micronets } = micronetFromDB
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl , mmUrl , gatewayId } = registry
  const {  odlStaticConfig , bridgeTrunk , wirelessInterfaces , wiredInterfaces , ovsHost , ovsPort , micronetInterfaces } = await getODLSwitchDetails ( hook , gatewayId )

  const subnetInterface = connectionType == WIRELESS ? wirelessInterfaces : wiredInterfaces
  logger.debug('\n Subnet Interface : ' + JSON.stringify(subnetInterface))

  // const { bridges } = odlStaticConfig.switchConfig
  // const bridge = bridges.map ( ( bridge ) => {
  //   return bridge
  // } )

  // TODO: Retrieve interface name from gateway config
  // Checks if micronet is added to d/b which indicates successful ODL call.
  let dhcpSubnetsPostBody = dhcpSubnetsToAdd.map ( ( dhcpSubnet , index ) => {
    // Original check with class property in request body
    // const matchedMicronetIndex = micronet.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase () && micronet[ "micronet-subnet-id" ].toLowerCase () == dhcpSubnet.subnetId.toLowerCase ()) )
    const matchedMicronetIndex = micronets.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase ()) )
        if ( micronets[ matchedMicronetIndex ][ "micronet-subnet" ]  && matchedMicronetIndex > -1 ) {
      if(connectionType == WIRELESS) {
        return {
          micronetId : dhcpSubnet.subnetId ,
          ipv4Network : {
            network : micronets[ matchedMicronetIndex ][ "micronet-subnet" ].split ( "/" )[ 0 ] ,
            mask : "255.255.255.0" ,  // TODO : Call IPAllocator to get mask.For /24 its 255.255.255.0
            gateway : micronets[ matchedMicronetIndex ][ "micronet-gateway-ip" ]
          } ,
          interface : subnetInterface[0].name,
          vlan : parseInt ( vLanGen() )
        }
      }
      else{
        return {
          micronetId : dhcpSubnet.subnetId ,
          ipv4Network : {
            network : micronets[ matchedMicronetIndex ][ "micronet-subnet" ].split ( "/" )[ 0 ] ,
            mask : "255.255.255.0" ,  // TODO : Call IPAllocator to get mask.For /24 its 255.255.255.0
            gateway : micronets[ matchedMicronetIndex ][ "micronet-gateway-ip" ]
          } ,
          interface : subnetInterface[0].name
        }
      }
      }
  } )

  dhcpSubnetsPostBody = flattenArray ( dhcpSubnetsPostBody );
  dhcpSubnetsPostBody = dhcpSubnetsPostBody.filter ( ( el ) => {
    return el != null
  } )
  const dhcpSubnets = await axios ( {
    ...apiInit ,
    method : 'GET' ,
    url : `${mmUrl}/${paths.DHCP_PATH}` ,
  } )
  const { body } = dhcpSubnets.data
  const dhcpSubnetPromises = await Promise.all ( dhcpSubnetsPostBody.map ( async ( subnetToPost , index ) => {
    const dhcpSubnetIndex = body.micronets.findIndex ( ( micronet ) => micronet.micronetId == subnetToPost.subnetId )
    if ( dhcpSubnetIndex == -1 && subnetToPost != null ) {
      const dhcpSubnetResponse = await axios ( {
        ...apiInit ,
        method : 'POST' ,
        url : `${mmUrl}/${paths.DHCP_PATH}` ,
        data : subnetToPost
      } )
      return dhcpSubnetResponse.data
    }
  } ) )
  return dhcpSubnetPromises
}

/* Adds MUD configuration for devices */
const upsertDhcpDevicesWithMudConfig = async ( hook , dhcpDevicesToUpsert ) => {

  // Get MUD Url from users
  const mud = hook.app.get ( 'mud' )
  logger.debug ( '\n MUD url : ' + JSON.stringify ( mud.url ) + '\t\t MUD version : ' + JSON.stringify ( mud.version ) )
  let user = await hook.app.service ( `${USERS_PATH}` ).find ( {} )
  user = user.data[ 0 ]
  let userDevices = user.devices
  // logger.debug('\n\n User Devices : ' + JSON.stringify(userDevices))
  let dhcpDevicesWithMudConfig = await Promise.all ( dhcpDevicesToUpsert.map ( async ( dhcpDeviceToUpsert , index ) => {
    let userDeviceIndex = userDevices.findIndex ( ( userDevice ) => userDevice.macAddress == dhcpDeviceToUpsert.macAddress.eui48 && userDevice.deviceId == dhcpDeviceToUpsert.deviceId )
    let mudUrlForDevice = userDeviceIndex != -1 ? userDevices[ userDeviceIndex ].mudUrl : ''
    // MUD URL Present. Call MUD Parser
    if ( mudUrlForDevice && mudUrlForDevice != '' ) {
      let mudParserPost = Object.assign ( {} , {
        url : mudUrlForDevice ,
        version : mud.version ,
        ip : dhcpDeviceToUpsert.networkAddress.ipv4
      } )
      logger.debug ( '\n\n MUD POST : ' + JSON.stringify ( mudParserPost ) )
      // Make MUD Post call
      let mudParserRes = await axios ( {
        method : 'POST' ,
        url : mud.url ,
        data : mudParserPost
      } )
      mudParserRes = mudParserRes.data
      logger.debug ( '\n\n MUD Parser response : ' + JSON.stringify ( mudParserRes ) )
      // return {... dhcpDevicesToUpsert, ['allowHosts']: mudParserRes.device.allowHosts }

      if ( !(mudParserRes.device.hasOwnProperty ( 'allowHosts' )) || !(mudParserRes.device.hasOwnProperty ( 'denyHosts' )) ) {
        return Promise.reject ( new errors.GeneralError ( new Error ( 'MUD Parser error' ) ) )
      }
      if ( mudParserRes.device.allowHosts.length > 0 ) {
        dhcpDeviceToUpsert[ 'allowHosts' ] = mudParserRes.device.allowHosts
      }
      if ( mudParserRes.device.denyHosts.length > 0 ) {
        dhcpDeviceToUpsert[ 'denyHosts' ] = mudParserRes.device.denyHosts
      }
      return dhcpDeviceToUpsert
    } else {
      logger.debug ( '\n Empty MUD url.' + JSON.stringify ( mudUrlForDevice ) + ' Do nothing' )
      return dhcpDeviceToUpsert
    }
  } ) )
  dhcpDevicesWithMudConfig = flattenArray ( dhcpDevicesWithMudConfig )
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
  let dhcpDevicesPostBody = requestBody.micronets.map ( ( micronet , index ) => {
    const connectedDevices = micronet[ "connected-devices" ]
    return connectedDevices.map ( ( device , index ) => {
      const deviceFromDbIndex = micronetFromDB.micronets[ micronetIndex ][ "connected-devices" ].findIndex ( ( deviceFromDB ) => deviceFromDB[ 'device-mac' ] == device[ 'device-mac' ] )
      const deviceFromDb = micronetFromDB.micronets[ micronetIndex ][ "connected-devices" ][ deviceFromDbIndex ]
      const dhcpDeviceIp = deviceFromDb[ 'device-ip' ]
      return {
        deviceId : device[ "device-id" ] ,
        macAddress : {
          eui48 : device[ "device-mac" ]
        } ,
        networkAddress : {
          ipv4 : dhcpDeviceIp
        }
      }
    } )
  } )
  dhcpDevicesPostBody = [].concat.apply ( [] , dhcpDevicesPostBody )
  dhcpDevicesPostBody = await upsertDhcpDevicesWithMudConfig ( hook , dhcpDevicesPostBody )
  // logger.debug('\n DHCP DEVICES POST BODY : ' + JSON.stringify(dhcpDevicesPostBody))
  if ( micronetIndex > -1 ) {
    // Check if subnet exists in DHCP Gateway
    const dhcpSubnet = await axios ( {
      ...apiInit ,
      method : 'GET' ,
      url : `${mmUrl}/${paths.DHCP_PATH}/${subnetId}` ,
    } )
    //  logger.debug('\n DHCP Subnet : ' + JSON.stringify(dhcpSubnet.data))
    const { body , status } = dhcpSubnet.data
    if ( status != 404 && ((body.hasOwnProperty ( 'micronets' ) && body.micronets.micronetId == subnetId) || (body.hasOwnProperty ( 'micronet' ) && body.micronet.micronetId == subnetId)) ) {
      const dhcpSubnetDevices = await axios ( {
        ...apiInit ,
        method : 'get' ,
        url : `${mmUrl}/${paths.DHCP_PATH}/${subnetId}/devices` ,
      } )
      const dhcpDevicePromises = await Promise.all ( dhcpDevicesPostBody.map ( async ( dhcpDevice , index ) => {
        // Check DHCP device to add does not exist in DHCP Subnet
        const devicePresentIndex = dhcpSubnetDevices.data.body.devices.findIndex ( ( subnetDevice ) => subnetDevice.deviceId == dhcpDevice.deviceId )
        if ( devicePresentIndex == -1 ) {
          const dhcpDeviceToAdd = await axios ( {
            ...apiInit ,
            method : 'POST' ,
            url : `${mmUrl}/${paths.DHCP_PATH}/${subnetId}/devices` ,
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

/* Delete DHCP Device in Subnet */
const deleteDhcpDeviceInSubnet = async ( hook , micronet  ) => {
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl } = registry
  const {data, params } = hook
  const { route } = params
  const {id, micronetId,  deviceId} = route

  // Single micronet was deleted
  if ( micronetId != undefined && Object.keys ( micronet ).length > 0 ) {

    // Get the associated subnetId and name of micronet
    const micronetFromDB = await getMicronet ( hook , {} )
    const micronetIndex = micronetFromDB.micronets.findIndex((micronet) => micronet['micronet-id'] == micronetId )
    const subnetId = micronetFromDB.micronets[micronetIndex][ "micronet-subnet-id" ]

    // Delete DHCP Device in Subnet
    dw.connect ( webSocketUrl ).then ( async () => {
      let dhcpDevice = await dw.send ( {} , "GET" , "device" , subnetId, deviceId )
      // Dhcp Subnet Present check
      if ( dhcpDevice.status == 200 ) {
        let dhcpDeviceToDelete = await dw.send ( {} , "DELETE" , "device" , subnetId, deviceId  )
        return dhcpDeviceToDelete
      }
    } )
  }
}

/* Adding subnets & devices to DHCP */
const deallocateIPSubnets = async ( hook , ipSubnets ) => {
  logger.debug('\n Deallocate IP Subnets called : ' + JSON.stringify(ipSubnets))
  const deallocateSubnetPromises = await Promise.all ( ipSubnets.map ( async ( subnetNo ) => {
    return await subnetAllocation.releaseSubnetAddress (  ( subnetNo ) )
  } ) )
  return deallocateSubnetPromises
}

module.exports = {
  before : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [
      async hook => {
        const { params , id , data , path } = hook;
        const { route } = params

        /* User created. Initialize micronets object */
        if ( hook.data && hook.data.type == 'userCreate' ) {
          logger.debug ( '\n  Event Type ' + JSON.stringify ( hook.data.type ) + '\t\t Event data : ' + JSON.stringify ( hook.data ) )
          const { type , id , ssid , name , gatewayId } = hook.data
          // Create Micronets object
          const micronets = []
          hook.data = Object.assign ( {} , {
            id : id ,
            name : name ,
            ssid : ssid ,
            gatewayId : gatewayId ,
            micronets : micronets
          } )
          return Promise.resolve ( hook )
        }

        // Create subnet and add device through device registration process
        if ( hook.data && hook.data.type == 'userDeviceRegistered' ) {
          logger.debug ( '\n  Device registration process.Event Type ' + JSON.stringify ( hook.data.type ) + '\t\t Event data : ' + JSON.stringify ( hook.data ) )
          const { type , data } = hook.data
          const { subscriberId , device } = data
          const micronetFromDB = await getMicronet ( hook , subscriberId )
          const odlPostBody = await upsertRegisteredDeviceToMicronet ( hook , hook.data )
          // logger.debug('\n ODL Post Body : ' + JSON.stringify(odlPostBody))
          // const odlResponse = await odlOperationsForUpserts ( hook , odlPostBody )
          // FAKE ODL API's
          const odlResponse = await mockOdlOperationsForUpserts ( hook , odlPostBody , Object.assign ( {} , { subscriberId } ) )
          //  logger.debug('\n ODL Response : ' + JSON.stringify(odlResponse))
          if ( odlResponse.data ) {
            const odlResponseData = odlResponse.data
            const patchRequestData = (odlResponseData.hasOwnProperty ( 'id' ) && odlResponseData.hasOwnProperty ( 'name' ) && odlResponseData.hasOwnProperty ( 'micronets' )) ? odlResponseData.micronets
              : (odlResponseData.hasOwnProperty ( 'micronets' ) && !odlResponseData.hasOwnProperty ( 'name' )) ? odlResponseData.micronets : odlResponseData
            const patchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( subscriberId ,
              {
                micronets : patchRequestData
              } ,
              { query : {} , mongoose : { upsert : true } } )
            if ( patchResult ) {
              // logger.debug('\n Micronets Patch Result : ' + JSON.stringify(patchResult))
              const dhcpSubnetPostBody = Object.assign ( {} , {
                micronets : [ Object.assign ( {} , {
                  name : device.class ,
                  "micronet-subnet-id" : device.class ,
                  "connected-devices" : []
                } ) ]
              } )
              const dhcpSubnet = await addDhcpSubnets ( hook , dhcpSubnetPostBody )
              if ( dhcpSubnet ) {
                const dhcpDevicePostBody = Object.assign ( {} , {
                  micronets :
                    [ Object.assign ( {} , {
                      "connected-devices" : [ Object.assign ( {} , {
                        "device-mac" : device.macAddress ,
                        "device-openflow-port" : "4" ,
                        "device-name" : device.hasOwnProperty ( 'deviceName' ) ? device.deviceName : "Test Device" , // TODO : Add Device Name
                        "device-id" : device.deviceId
                      } ) ]
                    } ) ]
                } )
                const micronetIndex = patchRequestData.findIndex ( ( micronet ) => micronet.class == device.class )
                const micronetId = patchRequestData[ micronetIndex ][ 'micronet-id' ]
                const dhcpAddDevice = await addDhcpDevices ( hook , dhcpDevicePostBody , micronetId , device.class )
              }
              hook.result = patchResult
              return Promise.resolve ( hook )
            }
          }
        }

        if ( hook.data && !hook.data.hasOwnProperty ( 'type' ) ) {
          const { id , micronetId } = route
          //  logger.debug('\n  REQUEST PARAMS ROUTE : ' + JSON.stringify(route) + '\t\t DATA : ' + JSON.stringify(data))
          const addSubnetBoolean = (route.hasOwnProperty ( 'id' ) && !route.hasOwnProperty ( 'micronetId' )) ? true : false
          const addDeviceToSubnetBoolean = (route.hasOwnProperty ( 'id' ) && route.hasOwnProperty ( 'micronetId' )) ? true : false
          logger.debug ( '\t\t addSubnetBoolean : ' + JSON.stringify ( addSubnetBoolean ) + '\t\t addDeviceToSubnetBoolean : ' + JSON.stringify ( addDeviceToSubnetBoolean ) )

          // Create Subnet without device registration process
          if ( route.hasOwnProperty ( 'id' ) && !route.hasOwnProperty ( 'micronetId' ) ) {
            //   logger.debug('Create Subnet without device registration process ' + JSON.stringify(route))

            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , hook.data , route.id )
              //   logger.debug('\n ODL Post Body : ' + JSON.stringify(postBodyForODL) + '\t AddSubnet Flag : ' + JSON.stringify(addSubnet))
              // Call ODL and DHCP to add subnets
              if ( addSubnet ) {
                // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
                const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign ( {} , { subscriberId : route.id } ) )
                /* Update DB with ODL Response */
                //  logger.debug("\n\n ODL Response : " + JSON.stringify(odlResponse))
                if ( odlResponse.data && odlResponse.status == 201 ) {
                  // const dbUpdateResult = await updateMicronetModel ( hook , odlResponse.data )
                  const patchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( route.id , { micronets : odlResponse.data.micronets } );
                  if ( patchResult ) {
                    const dhcpSubnets = await addDhcpSubnets ( hook , hook.data )
                    hook.result = patchResult
                    return Promise.resolve ( hook )
                  }
                }
              }
              else {
                hook.result = await  hook.app.service ( `${MICRONETS_PATH}` ).get ( route.id )
                return Promise.resolve ( hook )
              }
            }
          }

          // Add device to existing subnet
          if ( route.hasOwnProperty ( 'id' ) && route.hasOwnProperty ( 'micronetId' ) ) {
            // logger.debug('\n Add Device To Subnet' + JSON.stringify(route))
            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              const postBody = hook.data
              // Retrieve all devices in micronet
              const micronetFromDB = await getMicronet ( hook , route.id )
              const micronetToUpdateIndex = micronetFromDB.micronets.findIndex ( ( micronet ) => (micronet[ "micronet-id" ] == route.micronetId) )
              if ( micronetToUpdateIndex == -1 ) {
                return Promise.reject ( new errors.GeneralError ( new Error ( 'Micronet not found' ) ) )
              }
              const associatedSubnetId = micronetFromDB.micronets[ micronetToUpdateIndex ][ 'micronet-subnet-id' ]
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
              logger.debug ( '\n Devices to add : ' + JSON.stringify ( devicesToAdd ) )
              if ( devicesToAdd.length > 0 ) {

                const users = await hook.app.service ( `${USERS_PATH}` ).find ( { query : { id : route.id } } )
                // logger.debug('\n Users : ' + JSON.stringify(users))

                // Check if user is present. Add device as unregistered. Create user if necessary
                if ( isEmpty ( users.data ) ) {
                  const userDevicesPost = devicesToAdd.map ( ( deviceToAdd ) => {
                    const postBodyMicronet = postBody.micronets[ 0 ]
                    return Object.assign ( {} , {
                      deviceId : deviceToAdd[ 'device-id' ] ,
                      macAddress : deviceToAdd[ 'device-mac' ] ,
                      class : postBodyMicronet.hasOwnProperty ( 'micronet-subnet-id' ) ? postBodyMicronet[ 'micronet-subnet-id' ] : postBodyMicronet.class , // TODO : Check if this shd be class
                      isRegistered : false ,
                      deviceName : deviceToAdd[ 'device-name' ]
                    } )
                  } )
                  const userPost = Object.assign ( {} , {
                    id : micronetFromDB.id ,
                    name : micronetFromDB.name ,
                    ssid : micronetFromDB.ssid ,
                    gatewayId : micronetFromDB.gatewayId ,
                    devices : userDevicesPost
                  } )
                  const userCreated = await hook.app.service ( `${USERS_PATH}` ).create ( userPost )
                }

                // User present. Check for device
                else {
                  //   logger.debug('\n User is present. Check for device')
                  const userDevices = users.data[ 0 ].devices
                  const postBodyMicronet = postBody.micronets[ 0 ]
                  const userDevicesToAdd = devicesToAdd.map ( ( deviceToAdd ) => {
                    const userDeviceIndex = userDevices.findIndex ( ( userDevice ) => userDevice.macAddress == deviceToAdd[ 'device-mac' ] && userDevice.deviceId == deviceToAdd[ 'device-id' ] )
                    if ( userDeviceIndex == -1 ) {
                      //     logger.debug('\n Device not present in users.Add device to users ..')
                      return Object.assign ( {} , {
                        deviceId : deviceToAdd[ 'device-id' ] ,
                        macAddress : deviceToAdd[ 'device-mac' ] ,
                        class : postBodyMicronet.hasOwnProperty ( 'micronet-subnet-id' ) ? postBodyMicronet[ 'micronet-subnet-id' ] : postBodyMicronet.class , // TODO : Check if this shd be class
                        isRegistered : false ,
                        deviceName : deviceToAdd[ 'device-name' ]
                      } )
                    }
                  } )
                  const updatedUserPromises = await Promise.all ( userDevicesToAdd.map ( async ( userDeviceToAdd ) => {
                    const updatedUser = await hook.app.service ( `${USERS_PATH}` ).patch ( null , {
                      isRegistered : userDeviceToAdd.isRegistered ,
                      deviceId : userDeviceToAdd.deviceId ,
                      macAddress : userDeviceToAdd.macAddress ,
                      class : userDeviceToAdd.class ,
                      deviceName : userDeviceToAdd.deviceName
                    } , { query : { id : micronetFromDB.id } , mongoose : { upsert : true } } );
                    return updatedUser.data
                  } ) )
                }
              }
              const postBodyForODL = await addDevicesInSubnet ( hook , route.micronetId , associatedSubnetId , devicesToAdd )
              //   logger.debug('\n Post Body for ODL : ' + JSON.stringify(postBodyForODL))
              // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
              const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign ( {} , {
                micronetId : route.micronetId ,
                subnetId : associatedSubnetId ,
                subscriberId : route.id
              } ) )
              //     logger.debug('\n ODL Response : ' + JSON.stringify(odlResponse))
              if ( odlResponse.status == 201 && odlResponse.data ) {
                // const dbUpdateResult = await updateMicronetModel ( hook , odlResponse.data )
                // console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
                const patchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( route.id ,
                  {
                    micronets : odlResponse.data.micronets
                  } );
                //     logger.debug('\n\n Add Device to subnet response : ' + JSON.stringify(patchResult))
                if ( patchResult ) {
                  const addedDhcpDevices = await addDhcpDevices ( hook , hook.data , route.micronetId , associatedSubnetId )
                }
                hook.result = patchResult
                return Promise.resolve ( hook );
              }
            }
            if ( devicesToAdd.length == 0 ) {
              hook.result = hook.app.service ( `${MICRONETS_PATH}` ).find ( {} )
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
        const { data , params } = hook;
        const { route, requestHeaders, requestUrl } = params
        const { id , micronetId, deviceId } = route
       logger.debug('\n  Params  : ' + JSON.stringify(params) + '\t\t RequestUrl : ' + JSON.stringify(requestUrl))

        // Delete a specific device from micronet
        if ( (id && micronetId && deviceId) || requestUrl ==`/mm/v1/subscriber/${id}/micronets/${micronetId}/devices/${deviceId}` ) {
         logger.debug(`\n Device ID to remove ${deviceId} from micronet ${micronetId}`)
          const registry = await getRegistry ( hook , {} )
          const { mmUrl } = registry
          let postBodyForDelete = [] , micronetToDelete = {} , registeredDevicesToDelete = [] , subnetAllocator = Object.assign({}) , deviceToDeleteIndex = '', ipSubnets = []
          const micronetFromDB = await getMicronet ( hook , {} )
          // ODL and Gateway checks
          const isGtwyAlive = await isGatewayAlive ( hook )
          const isOdlAlive = await isODLAlive ( hook )
          const isGatewayConnected = await connectToGateway ( hook )
          if ( isGtwyAlive && isOdlAlive && isGatewayConnected ) {
            const mockMicronetsFromDb = await hook.app.service ( `${MOCK_MICRONET_PATH}` ).find ( {} )
            const mockMicronetIndex = mockMicronetsFromDb.data.length > 0 ? mockMicronetsFromDb.data.findIndex ( ( mockMicronet ) => mockMicronet.id == id ) : -1
            logger.debug ( '\n\n Mock micronet Index : ' + JSON.stringify ( mockMicronetIndex ) )

            // Delete single micro-net
            if ( micronetId && deviceId ) {
              const micronetFromDB = await getMicronet ( hook , id )
              const { micronets } = micronetFromDB
              const micronetToDeleteIndex = micronets.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId )

              // Valid index. Micronet exists
              if ( micronetToDeleteIndex > -1 ) {
                micronetToDelete = micronets[ micronetToDeleteIndex ]
                ipSubnets = [].concat ( micronetToDelete[ 'micronet-subnet' ].split ( '.' )[ 2 ] )
                registeredDevicesToDelete = micronetToDelete[ 'connected-devices' ]
                deviceToDeleteIndex = registeredDevicesToDelete.findIndex((device)=> device['device-id'] == deviceId)
                logger.debug('\n deviceToDeleteIndex : ' + JSON.stringify(deviceToDeleteIndex))

                // Valid Index. Device Exists
                if(deviceToDeleteIndex > -1){
                  let updatedDevices = registeredDevicesToDelete.filter((registeredDevice,index) => index != deviceToDeleteIndex)
                  logger.debug('\n Updated Devices : ' + JSON.stringify(updatedDevices))
                  micronets[ micronetToDeleteIndex ]['connected-devices'] = updatedDevices
                  postBodyForDelete =   micronets

                  // Delete specific device from subnet allocator
                  if ( isEmpty(subnetAllocator) ) {
                    subnetAllocator.deviceAddress = registeredDevicesToDelete[deviceToDeleteIndex]['device-ip']
                    subnetAllocator.subnetAddress = micronetToDelete[ 'micronet-subnet' ]
                    logger.debug('\n SubnetAllocator for deleting a device : ' + JSON.stringify(subnetAllocator))

                  }

                }
              }
            }

            logger.debug ( '\n Remove hook postBodyForDelete : ' + JSON.stringify ( postBodyForDelete ))
            const patchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( id ,
              {
                micronets : postBodyForDelete
              } );
            logger.debug ( '\n Remove hook patchResult : ' + JSON.stringify ( patchResult ) )
            if ( patchResult ) {
              if ( micronetId ) {
                const dhcpDhcpDeviceDeletePromise = await deleteDhcpDeviceInSubnet ( hook , micronetToDelete , micronetId )

                if ( mockMicronetIndex > -1 ) {
                  const mockMicronetsDelete = await axios ( {
                    ...apiInit ,
                    method : 'DELETE' ,
                    url : `${mmUrl}/mm/v1/mock/subscriber/${id}/micronets/${micronetId}` ,
                    data : Object.assign ( {} , { micronets : [ postBodyForDelete ] } )
                  } )
                }

                // TODO: Delete specific device in subnet allocator.
                 if ( !isEmpty(subnetAllocator)) {
                   await subnetAllocation.releaseDeviceAddress(subnetAllocator.subnetAddress, subnetAllocator.deviceAddress)
                }

                let users = await hook.app.service ( `${USERS_PATH}` ).find ( {} )
                if ( !(isEmpty ( users.data )) ) {
                  users = users.data[ 0 ]
                  let deviceToDeleteIndex = users.devices.findIndex((registeredDevice, index) => registeredDevice.deviceId == hook.params.route.deviceId)
                  let filteredDevices =  users.devices.filter((registeredDevice,index) => index != deviceToDeleteIndex)
                  const userPatchResult = await hook.app.service ( `${USERS_PATH}` ).patch ( users.id , Object.assign ( {
                    devices : filteredDevices ,
                    deleteRegisteredDevices : true
                  } ) )
                }

              }
              if ( postBodyForDelete.length == 0 && !micronetId && id ) {
                const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , {} , undefined )
                if ( mockMicronetIndex > -1 ) {
                  const mockMicronetsDelete = await axios ( {
                    ...apiInit ,
                    method : 'DELETE' ,
                    url : `${mmUrl}/mm/v1/mock/subscriber/${id}/micronets` ,
                    data : Object.assign ( {} , { micronets : [] } )
                  } )
                }

                let users = await hook.app.service ( `${USERS_PATH}` ).find ( {} )
                if ( !(isEmpty ( users.data )) ) {
                  users = users.data[ 0 ]
                  let updatedDevices = []
                  const userPatchResult = await hook.app.service ( `${USERS_PATH}` ).patch ( users.id , Object.assign ( {
                    devices : updatedDevices ,
                    deleteRegisteredDevices : true
                  } ) )
                }

              }
            }
            hook.result = patchResult
            return Promise.resolve ( hook );
          }

        }


        // Delete all micronets or specific micronet
        if (  ( id && micronetId && !deviceId) || requestUrl ==`/mm/v1/subscriber/${id}/micronets` || requestUrl ==`/mm/v1/subscriber/${id}/micronets/${micronetId}` ) {
          logger.debug(`\n Micronet ID to remove ${micronetId} from id ${id}`)
          const registry = await getRegistry ( hook , {} )
          const { mmUrl } = registry
          let postBodyForDelete = [] , micronetToDelete = {} , registeredDevicesToDelete = [] , ipSubnets = []
          // ODL and Gateway checks
          const isGtwyAlive = await isGatewayAlive ( hook )
          const isOdlAlive = await isODLAlive ( hook )
          const isGatewayConnected = await connectToGateway ( hook )
          if ( isGtwyAlive && isOdlAlive && isGatewayConnected ) {
            const mockMicronetsFromDb = await hook.app.service ( `${MOCK_MICRONET_PATH}` ).find ( {} )
            const mockMicronetIndex = mockMicronetsFromDb.data.length > 0 ? mockMicronetsFromDb.data.findIndex ( ( mockMicronet ) => mockMicronet.id == id ) : -1
            logger.debug ( '\n\n Mock micronet Index : ' + JSON.stringify ( mockMicronetIndex ) )
            // Delete single micro-net
            if ( micronetId ) {
              const micronetFromDB = await getMicronet ( hook , id )
              const { micronets } = micronetFromDB
              const micronetToDeleteIndex = micronets.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId )
              // Valid index. Micronet exists
              if ( micronetToDeleteIndex > -1 ) {
                micronetToDelete = micronets[ micronetToDeleteIndex ]
                ipSubnets = [].concat ( micronetToDelete[ 'micronet-subnet' ])
                registeredDevicesToDelete = micronetToDelete[ 'connected-devices' ]
                postBodyForDelete = micronets.filter ( ( micronet , index ) => index != micronetToDeleteIndex )
              }
            }

            // Delete all micro-nets
            const micronetFromDB = await getMicronet ( hook , {} )
            if ( ipSubnets.length == 0 ) {
              ipSubnets = micronetFromDB.micronets.map ( ( micronet ) => {
                return micronet[ 'micronet-subnet' ]
              } )
            }
            logger.debug ( '\n Remove hook postBodyForDelete : ' + JSON.stringify ( postBodyForDelete ) + '\t\t IP Subnets : ' + JSON.stringify ( ipSubnets ) )
            const patchResult = await hook.app.service ( `${MICRONETS_PATH}` ).patch ( id ,
              {
                micronets : postBodyForDelete
              } );
            logger.debug ( '\n Remove hook patchResult : ' + JSON.stringify ( patchResult ) )
            if ( patchResult ) {
              if ( micronetId ) {
                const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , micronetToDelete , micronetId )

                if ( mockMicronetIndex > -1 ) {
                  const mockMicronetsDelete = await axios ( {
                    ...apiInit ,
                    method : 'DELETE' ,
                    url : `${mmUrl}/mm/v1/mock/subscriber/${id}/micronets/${micronetId}` ,
                    data : Object.assign ( {} , { micronets : [ postBodyForDelete ] } )
                  } )
                }

                // Deallocate subnets
                if ( ipSubnets.length > 0 ) {
                  logger.debug('\n IP Subnets to deallocate : ' + JSON.stringify(ipSubnets))
                  ipSubnets.map(async(subnetAddress)=> {
                     return await subnetAllocation.releaseSubnetAddress(subnetAddress)
                  })
                }

                let users = await hook.app.service ( `${USERS_PATH}` ).find ( {} )
                if ( !(isEmpty ( users.data )) ) {
                  users = users.data[ 0 ]
                  let updatedDevices = users.devices.map ( ( registeredDevice , index ) => {
                    const deviceToDeleteIndex = registeredDevicesToDelete.findIndex ( ( deviceFromMicronet ) => registeredDevice.macAddress == deviceFromMicronet[ 'device-mac' ] && registeredDevice.deviceId == deviceFromMicronet[ 'device-id' ] )
                    if ( deviceToDeleteIndex == -1 ) {
                      return registeredDevice
                    }
                  } )
                  updatedDevices = updatedDevices.filter ( Boolean )
                  const userPatchResult = await hook.app.service ( `${USERS_PATH}` ).patch ( users.id , Object.assign ( {
                    devices : updatedDevices ,
                    deleteRegisteredDevices : true
                  } ) )
                }

              }
              if ( postBodyForDelete.length == 0 && !micronetId && id ) {
                const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , {} , undefined )
                if ( mockMicronetIndex > -1 ) {
                  const mockMicronetsDelete = await axios ( {
                    ...apiInit ,
                    method : 'DELETE' ,
                    url : `${mmUrl}/mm/v1/mock/subscriber/${id}/micronets` ,
                    data : Object.assign ( {} , { micronets : [] } )
                  } )
                }
                // De-allocate subnets
                if ( ipSubnets.length > 0 ) {
                  logger.debug('\n IP Subnets to deallocate : ' + JSON.stringify(ipSubnets))
                  ipSubnets.map(async(subnetAddress)=> {
                    return await subnetAllocation.releaseSubnetAddress(subnetAddress)
                  })
                }

                let users = await hook.app.service ( `${USERS_PATH}` ).find ( {} )
                if ( !(isEmpty ( users.data )) ) {
                  users = users.data[ 0 ]
                  let updatedDevices = []
                  const userPatchResult = await hook.app.service ( `${USERS_PATH}` ).patch ( users.id , Object.assign ( {
                    devices : updatedDevices ,
                    deleteRegisteredDevices : true
                  } ) )
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
        hook.app.service ( `${MICRONETS_PATH}` ).emit ( 'micronetUpdated' , {
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
