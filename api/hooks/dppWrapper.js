const logger = require ( './../../api/logger' );
const subnetAllocation = require ( './../hooks/subnetAllocation' )
const axios = require ( 'axios' );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const dw = require ( './../hooks//dhcpWrapperPromise' )
const WIRED = "ethernet"
const WIRELESS = "wifi"
const DPP_ON_BOARD_TYPE = 'dpp'
const START_ON_BOARD = 'initial'
const errors = require ( '@feathersjs/errors' );
const micronetOperationalConfig = require ( './../mock-data/micronetsOperationalConfig' );
const micronetNotifications = require ( './../mock-data/micronetNotifications' );
const paths = require ( './../hooks/servicePaths' )
const { MICRONETS_PATH , REGISTRY_PATH , ODL_PATH , MOCK_MICRONET_PATH , USERS_PATH } = paths
var rn = require('random-number');
var validator = require('validator');
var vLanGen = rn.generator({
  min:1000, max:4095,integer: true
})
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
  // FAKE NOTIFICATIONS
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

  const ovsHost = '10.36.32.124'
  const ovsPort = '8181'
  let wirelessInterfaces = micronetInterfaces.map ( ( interface ) => {
    if ( interface.hasOwnProperty ( "medium" ) && interface.medium == WIRELESS ) {
      return interface
    }
  } )
  wirelessInterfaces = wirelessInterfaces.filter ( Boolean )

  let wiredInterfaces = micronetInterfaces.map ( ( interface ) => {
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
    ovsPort ,
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
    if ( interface.hasOwnProperty ( 'medium' ) && interface.medium == WIRED ) {
      return interface
    }
  } )

  // Flatten array , filter null values , remove duplicate elements, remove previously allocated subnetNos
  wiredSwitchConfigSubnets = [].concat ( ...wiredSwitchConfigSubnets ).filter ( Boolean )
  wiredSwitchConfigSubnets = [ ...(new Set ( wiredSwitchConfigSubnets )) ]
  // wiredSwitchConfigSubnets = wiredSwitchConfigSubnets.filter ( ( el ) => !allocatedSubnetNos.includes ( el ) );

  let wirelessSwitchConfigSubnets = micronetInterfaces.map ( ( interface, index ) => {
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
    let switchConfigSubnetType = subnet.connection == WIRELESS ? wirelessSwitchConfigSubnets : wiredSwitchConfigSubnets
    logger.debug('\n Subnet : ' + JSON.stringify(subnet) + '\t\t SwitchConfigSubnetType : ' + JSON.stringify(switchConfigSubnetType) + '\t\t Index : ' + JSON.stringify(index))
    if ( isEmpty ( switchConfigSubnetType )  ) {
      return Promise.reject ( new errors.GeneralError ( new Error ( 'Micronet cannot be created. No subnets available' ) ) )
    }
    else if ( subnetDetails.length > switchConfigSubnetType.length ) {
      const connectionType = subnet.connection == WIRELESS ? WIRELESS : WIRED
    }
    const interfaceSubnets = switchConfigSubnetType
    logger.debug('\n Interface Subnets : ' + JSON.stringify(interfaceSubnets) + '\t\t Subnet connection : ' + JSON.stringify(subnet.connection))
    const subnets = subnet.connection == WIRED ? await subnetAllocation.allocateSubnetAddress ( interfaceSubnets[index].ipv4Subnets[index].subnetRange , interfaceSubnets[index].ipv4Subnets[index].subnetGateway ) :
      await subnetAllocation.allocateSubnetAddress ( interfaceSubnets[index].ipv4SubnetRanges[index].subnetRange , interfaceSubnets[index].ipv4SubnetRanges[index].subnetGateway )
    const result = Object.assign ( {} , { subnets: subnets ,  interface: interfaceSubnets[index], connectionType: subnet.connection } )
    return result
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

const getDeviceForSubnet = async ( hook , subnetDetails , subnets, interface, connectionType ) => {
  logger.debug('\n\n SubnetDetails : ' + JSON.stringify(subnetDetails) + '\t\t Subnets : ' + JSON.stringify(subnets) + '\t\t Interface : ' + JSON.stringify(interface) + '\t\t ConnectionType : ' + JSON.stringify(connectionType))
  subnetDetails = [].concat ( ...subnetDetails );
  let devicesWithIp = await Promise.all ( subnets.map ( async ( subnet , subnetIndex ) => {
    logger.debug('\n Subnet : ' + JSON.stringify(subnet))
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
  const subnetDetails = requestBody.map ( ( micronet , index ) => {
  const connectionType = !isEmpty ( micronet[ 'device-connection' ] ) ? micronet[ 'device-connection' ] : !isEmpty ( hook.data.deviceConnection ) ? hook.data.deviceConnection : WIRED

    return Object.assign ( {} , {
      name : micronet.name ,
      connection : connectionType ,
      devices : micronet[ 'connected-devices' ] || []
    } )
  } )
  // logger.debug('\n\n  SubnetDetails : ' + JSON.stringify(subnetDetails))
  // Gets random subnets
  // const subnets = await getSubnetIps ( hook , subnetDetails , requestBody )

  // Gets static subnets
  const result = await getStaticSubnetIps ( hook , subnetDetails , requestBody )
  logger.debug('\n DPP Obtained result : ' + JSON.stringify(result))
  const { subnets, interface, connectionType } = result[0]
  logger.debug('\n DPP Obtained subnets from IP Allocator : ' + JSON.stringify(subnets) + '\t\t Interface Subnets : ' + JSON.stringify(interface) + '\t\t Connection Type : ' + JSON.stringify(connectionType))

  /* Add check for devices length in subnetDetails array */
  let subnetDetailsWithDevices = subnetDetails.map ( ( subnetDetail , index ) => {
    if ( subnetDetail.hasOwnProperty ( 'devices' ) && subnetDetail.devices.length >= 1 ) {
      return subnetDetail
    }
  } )
  logger.debug('\n\n SubnetDetailsWithDevices : ' + JSON.stringify(subnetDetailsWithDevices))
  subnetDetailsWithDevices = subnetDetailsWithDevices.filter ( Boolean )
  logger.debug('\n\n SubnetDetailsWithDevices after filter : ' + JSON.stringify(subnetDetailsWithDevices))

  /* All Subnets have Devices */
  if ( subnets.length == subnetDetailsWithDevices.length ) {
    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetails , subnets, interface, connectionType )
   logger.debug( '\n All subnets with devices : ' + JSON.stringify ( subnetsWithDevices ) )
    return subnetsWithDevices
  }

  /* Few Subnets have Devices */
  if (subnets.length > 0 && subnetDetailsWithDevices.length >= 1 && subnets.length > subnetDetailsWithDevices.length ) {
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
   logger.debug( '\n Dpp All subnets with and without devices : ' + JSON.stringify ( allSubnets ) )
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
  const subscriberIdFromHook = !isEmpty ( params ) && !isEmpty ( route ) && isEmpty ( data ) ? route.id : isEmpty ( params ) && isEmpty ( route ) && !isEmpty ( data ) && data.hasOwnProperty ( 'type' ) && data.type == 'userDeviceRegistered' && data.data.hasOwnProperty ( 'subscriberId' ) ? data.data.subscriberId : undefined
  const defaultSubscriberId = hook.app.get ( 'mano' ).subscriberId
  const subscriberId = subscriberIdFromHook != undefined ? subscriberIdFromHook : defaultSubscriberId != undefined ? defaultSubscriberId : undefined
  // logger.debug('\n Subscriber ID : ' + JSON.stringify(subscriberId))
  return subscriberId
}

const getRegistry = async ( hook ) => {
  const mano = hook.app.get ( 'mano' )
  const subscriberId = await getSubscriberId ( hook )
  const registry = await getRegistryForSubscriber ( hook , subscriberId )
  return registry
}

const getMicronet = async ( hook , subscriberId ) => {
  const id = isEmpty ( subscriberId ) ? await getSubscriberId ( hook ) : subscriberId
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
  logger.debug('\n  SubnetAndDeviceIps ' + JSON.stringify(subnetAndDeviceIps))
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
      "micronet-gateway-ip" : subnetAndDeviceIps.gatewayAddress ,
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

  // Fake response
  const odlConfigResponse = Object.assign ( {} , { status : 200 , data : "" } )
  return odlConfigResponse
}

const fetchOdlOperationalState = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry

  // Uncomment for Fake response
  const odlOperationalState = Object.assign ( {} , { data : micronetOperationalConfig , status : 200 } )
  return odlOperationalState
}

// Calls mock-micronet API
const mockOdlOperationsForUpserts = async ( hook , requestBody , reqParams ) => {

  const { micronetId , subnetId , subscriberId } = reqParams
  let postBody = requestBody.hasOwnProperty ( 'micronets' ) && requestBody.hasOwnProperty ( 'name' ) && requestBody.hasOwnProperty ( 'id' ) ? requestBody.micronets : requestBody
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
    // logger.debug('\n  PostBody for ODL : ' + JSON.stringify(postBodyForODL) + '\t\t addSubnet : ' + JSON.stringify(addSubnet))
    /* ODL API's */
    // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
    const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , Object.assign ( {} , { subscriberId } ) )
    // logger.debug('\n ODL Response : ' + JSON.stringify(odlResponse.data) + '\t\t status : ' + JSON.stringify(odlResponse.status))
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
  devices = [].concat ( devices )
  let formattedDevices = devices.map ( ( device , index ) => {

    if ( device.hasOwnProperty ( "isRegistered" ) || (device.hasOwnProperty ( "onboardType" ) && device.onboardType == DPP_ON_BOARD_TYPE && device.hasOwnProperty ( 'onboardStatus' ) && device.onboardStatus == START_ON_BOARD) ) {
      return {
        "device-mac" : device.macAddress ,
        "device-name" : device.hasOwnProperty ( 'deviceName' ) ? device.deviceName : `Test Device` ,
        "device-id" : device.deviceId ,
        "device-openflow-port" : 2 // TODO: Add device-openflow-port value from switch config
      }
    }
    else {
      return {
        "device-mac" : device[ "device-mac" ] ,
        "device-name" : device[ "device-name" ] || `Test Device` ,
        "device-id" : device[ "device-id" ] ,
        "device-openflow-port" : device[ "device-openflow-port" ] || 2
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

  const deviceInterfaces =  wirelessInterfaces
  logger.debug('\n\n Device Interfaces : ' + JSON.stringify(deviceInterfaces))
  const deviceSpec =  deviceInterfaces[0].ipv4SubnetRanges[0].deviceRange
  logger.debug('\n\n Device Spec : ' + JSON.stringify(deviceSpec) + '\t\t Subnet No : ' + JSON.stringify(micronetSubnet) + '\t\t Formatted Devices : ' + JSON.stringify(formattedDevices))

  const subnetWithDevices = await subnetAllocation.allocateDeviceAddress ( micronetSubnet , deviceSpec, formattedDevices[0] )
  logger.debug('\n\n subnetWithDevices : ' + JSON.stringify(subnetWithDevices))
  const formattedSubnetWithDevices = formattedDevices.map ( ( device , index ) => {
    let deviceFromIpAllocator = subnetWithDevices.devices.map ( ( ipAllocatorDevice ) => {
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
        "device-ip" : deviceFromIpAllocator[ 0 ].deviceAddress
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
  logger.debug('\n Gateway subnets request body : ' + JSON.stringify(requestBody) + '\t\t DhcpSubnetsToAdd : ' + JSON.stringify(dhcpSubnetsToAdd))

  const dhcpSubnetLength = dhcpSubnetsToAdd.length
  const micronetFromDB = await getMicronet ( hook , {} )
  const { micronets } = micronetFromDB
  const registry = await getRegistry ( hook , {} )
  const { webSocketUrl , mmUrl , gatewayId } = registry
  const {  odlStaticConfig , bridgeTrunk , wirelessInterfaces , wiredInterfaces , ovsHost , ovsPort , micronetInterfaces } = await getODLSwitchDetails ( hook , gatewayId )

  const subnetInterface = wirelessInterfaces
  // Checks if micronet is added to d/b which indicates successful ODL call.
  let dhcpSubnetsPostBody = dhcpSubnetsToAdd.map ( ( dhcpSubnet , index ) => {
    // Original check with class property in request body
    // const matchedMicronetIndex = micronet.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase () && micronet[ "micronet-subnet-id" ].toLowerCase () == dhcpSubnet.subnetId.toLowerCase ()) )
    const matchedMicronetIndex = micronets.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase ()) )
        if ( micronets[ matchedMicronetIndex ][ "micronet-subnet" ] && matchedMicronetIndex > -1 ) {
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
  logger.debug('\n Gateway Subnets : ' + JSON.stringify(body))
  logger.debug('\n Gateway subnets post body : ' + JSON.stringify(dhcpSubnetsPostBody))
  const dhcpSubnetPromises = await Promise.all ( dhcpSubnetsPostBody.map ( async ( subnetToPost , index ) => {
    const dhcpSubnetIndex = body.micronets.length > 0 ? body.micronets.findIndex ( ( micronet ) => micronet.micronetId == subnetToPost.subnetId ) : -1
    logger.debug('\n Gateway subnet index : ' + JSON.stringify(dhcpSubnetIndex))
    if ( dhcpSubnetIndex == -1 && subnetToPost != null ) {
      const dhcpSubnetResponse = await axios ( {
        ...apiInit ,
        method : 'POST' ,
        url : `${mmUrl}/${paths.DHCP_PATH}` ,
        data : subnetToPost
      } )
      //  logger.debug('\n DHCP SUBNET RESPONSE : ' + JSON.stringify(dhcpSubnetResponse.data))
      return dhcpSubnetResponse.data
    }
  } ) )
  return dhcpSubnetPromises
}



/* Replaces MAC address with device IPs to handle same-manufacturer and manufacturer */
const replaceMacWithDeviceIps = async (hook, sameManufacturerMacAddress) => {
  let sameManufacturerDeviceIps = []
 logger.debug('\n ReplaceWithDeviceIps passed sameManufacturerMacAddress :  ' + JSON.stringify(sameManufacturerMacAddress))
  let micronetFromDb = await getMicronet(hook,{})
  logger.debug('\n Micronet from Db : ' + JSON.stringify(micronetFromDb))
  if(micronetFromDb.micronets.length > 0  && sameManufacturerMacAddress.length > 0 ){
   let micronets = micronetFromDb.micronets
    micronets.forEach((currMicronet,index) => {
      let micronetDevices = currMicronet['connected-devices']
       if(micronetDevices.length > 0) {
         logger.debug('\n Current Micronet class ' + JSON.stringify(currMicronet.class) + '\t At Index : ' + JSON.stringify(index))
         logger.debug('\n Current Micronet devices ' + JSON.stringify(micronetDevices))
         micronetDevices.forEach((device) => {
           sameManufacturerMacAddress.forEach((macAddress) => {
            if(macAddress == device['device-mac']){
              logger.debug('\n Match found . Device IP is :'  + JSON.stringify(device['device-ip']) + '\t\t for mac address : ' + JSON.stringify(device['device-mac']))
              sameManufacturerDeviceIps.push(device['device-ip'])
              logger.debug('\n sameManufacturerDeviceIps  : ' + JSON.stringify(sameManufacturerDeviceIps))
            }
           })
         })
       }
    })
  }
  return sameManufacturerDeviceIps
}

/* Adds MUD configuration for devices */
const upsertDhcpDevicesWithMudConfig = async ( hook , dhcpDevicesToUpsert ) => {
  logger.debug ( '\n Gateway devices to upsert with MUD config ' + JSON.stringify(dhcpDevicesToUpsert))
  let sameManufacturerDeviceMacAddrs = []
  // Get MUD Url from users
  const mud = hook.app.get ( 'mud' )
 logger.debug('\n MUD POST URL : ' + JSON.stringify( mud.managerBaseUrl ) + '\t\t MUD VERSION : ' + JSON.stringify(mud.version))
  let user = await hook.app.service ( `${USERS_PATH}` ).find ( {} )
  user = user.data[ 0 ]
  let userDevices = user.devices
  logger.debug('\n\n User Devices : ' + JSON.stringify(userDevices))
  let dhcpDevicesWithMudConfig = await Promise.all ( dhcpDevicesToUpsert.map ( async ( dhcpDeviceToUpsert , index ) => {
   logger.debug('\n  DhcpDeviceToUpsert to match against : ' + JSON.stringify(dhcpDeviceToUpsert))
    let userDeviceIndex = userDevices.findIndex ( ( userDevice ) => userDevice.macAddress == dhcpDeviceToUpsert.macAddress.eui48 && userDevice.deviceId == dhcpDeviceToUpsert.deviceId )
    let mudUrlForDevice = userDeviceIndex != -1 ? userDevices[ userDeviceIndex ].mudUrl : ''
    let onBoardType = userDeviceIndex != -1 ? userDevices[ userDeviceIndex ].onboardType : 'undefined'
    let deviceToUpsertManufacturer = userDevices[userDeviceIndex].deviceManufacturer
    let deviceToUpsertAuthority = userDevices[userDeviceIndex].deviceAuthority

    logger.debug('\n Mud Url Obtained : ' + JSON.stringify(mudUrlForDevice) + '\t\t onBoardType : ' + JSON.stringify(onBoardType))
    // Handling same manufacturer entries
    logger.debug('\n\n DeviceToUpsertManufacturer : ' + JSON.stringify(deviceToUpsertManufacturer) + '\t\t DeviceToUpsertAuthority : ' + JSON.stringify(deviceToUpsertAuthority))

    // MUD URL not present but its still a DPP on-board request.Add PSK.
    if(isEmpty(mudUrlForDevice) && !isEmpty(onBoardType) && onBoardType == DPP_ON_BOARD_TYPE ) {
     logger.debug('\n No Mud Url present. No mud parsing required. Only add PSK for device ...')
      if ( userDevices[ userDeviceIndex ].hasOwnProperty ( 'psk' ) ) {
        dhcpDeviceToUpsert[ 'psk' ] = userDevices[ userDeviceIndex ].psk
      }
      logger.debug('\n Gateway Device after psk without mud processing : ' + JSON.stringify(dhcpDeviceToUpsert))
      return dhcpDeviceToUpsert
    }


    // MUD URL Present. Call MUD Parser
    if ( mudUrlForDevice && mudUrlForDevice != '' ) {
      let mudParserPost = Object.assign ( {} , {
        url : mudUrlForDevice ,
        version : mud.version ,
        ip : dhcpDeviceToUpsert.networkAddress.ipv4
      } )
      logger.debug ( '\n\n MUD Post body : ' + JSON.stringify ( mudParserPost )  )
      // Make MUD Post call
      let mudParserRes = await axios ( {
        method : 'POST' ,
        url : mud.managerBaseUrl + "/getFlowRules",
        data : mudParserPost
      } )

      logger.debug('\n MUD Manager Response : ' + JSON.stringify(mudParserRes.data) + '\t\t Status Code : ' + JSON.stringify(mudParserRes.status) + '\t\t Error : ' + JSON.stringify(mudParserRes.error))

      // if ( !(mudParserRes.device.hasOwnProperty ( 'allowHosts' )) || !(mudParserRes.device.hasOwnProperty ( 'denyHosts' )) ) {
      //   return Promise.reject ( new errors.GeneralError ( new Error ( 'MUD Parser error' ) ) )
      // }

    // MUD Manager returned valid response
      if(mudParserRes.status == '200') {
        mudParserRes = mudParserRes.data
        let manufacturerIndex = -1 , sameManufacturerIndex = -1 , localNetworksIndex = -1
        // Handle same manufacturer
        logger.debug ( '\n\n MUD Manager Response : ' + JSON.stringify ( mudParserRes ) + '\t\t for Gateway Device : ' + JSON.stringify ( dhcpDeviceToUpsert ) )
        // const staticAllowHosts = [
        //   "my-controller",
        //   "same-manufacturer",
        //   "local-networks" ]
        // mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.concat(...staticAllowHosts)
        logger.debug ( '\n Mud Parser Response AllowHosts : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
        if ( mudParserRes.hasOwnProperty ( 'device' ) && mudParserRes.device.hasOwnProperty ( 'allowHosts' ) ) {

          const allowHosts = mudParserRes.device.allowHosts
          logger.debug ( '\n\n Allow Hosts : ' + JSON.stringify ( allowHosts ) )
          sameManufacturerIndex = allowHosts.findIndex ( ( ah ) => ah == 'same-manufacturer' )

          // let manufacturerIndex = allowHosts.findIndex((ah) => ah == 'manufacturer')
          manufacturerIndex = allowHosts.findIndex ( ( ah , idx ) => {
            if ( ah.includes ( 'manufacturer:' ) ) {
              logger.debug ( '\n\n AH : ' + JSON.stringify ( ah ) + '\t\t Index : ' + JSON.stringify ( idx ) )
              return idx
            }
          } )

          // Fix for multiple controllers
          // let controllerIndex = allowHosts.map((ah,idx) =>  {
          //   if(ah.includes('controller:')) {
          //     logger.debug('\n\n AH : ' + JSON.stringify(ah) + '\t\t Index : ' + JSON.stringify(idx))
          //     return idx
          //   }})

          let controllerIndex = allowHosts.findIndex ( ( ah , idx ) => {
            if ( ah.includes ( 'controller:' ) ) {
              logger.debug ( '\n\n AH : ' + JSON.stringify ( ah ) + '\t\t Index : ' + JSON.stringify ( idx ) )
              return idx
            }
          } )

          let myControllerIndex = allowHosts.findIndex ( ( ah ) => ah == 'my-controller' )

          localNetworksIndex = allowHosts.findIndex ( ( ah ) => ah == 'local-networks' )

          logger.debug ( '\n SameManufacturerIndex : ' + JSON.stringify ( sameManufacturerIndex ) )
          logger.debug ( '\n ManufacturerIndex : ' + JSON.stringify ( manufacturerIndex ) )
          logger.debug ( '\n ControllerIndex : ' + JSON.stringify ( controllerIndex ) )
          logger.debug ( '\n MyControllerIndex : ' + JSON.stringify ( myControllerIndex ) )
          logger.debug ( '\n LocalNetworksIndex : ' + JSON.stringify ( localNetworksIndex ) )

          // Same manufacturer case
          if ( sameManufacturerIndex > -1 ) {
            logger.debug ( '\n Same manufacturer found in mud response ... Updating allowHosts ' )
            sameManufacturerDeviceMacAddrs = userDevices.map ( ( userDevice , index ) => {
              if ( userDevice.deviceManufacturer == deviceToUpsertManufacturer && index != userDeviceIndex )
                return userDevice.deviceIp
            } )

            sameManufacturerDeviceMacAddrs = sameManufacturerDeviceMacAddrs.filter ( ( el ) => {
              return el != null
            } )
            logger.debug ( '\n Same manufacturer : ' + JSON.stringify ( sameManufacturerDeviceMacAddrs ) )

            if ( sameManufacturerDeviceMacAddrs.length == 0 && sameManufacturerIndex > -1 ) {
              logger.debug ( '\n Same manufacturer allowHosts before update : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
              mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.filter ( ( allowHost ) => allowHost != 'same-manufacturer' )
              logger.debug ( '\n Same manufacturer allowHosts after update : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            }

            if ( sameManufacturerDeviceMacAddrs.length > 0 && sameManufacturerIndex > -1 ) {
              logger.debug ( '\n Found same manufacturer for other devices ... Updating allowHosts ' )
              // let deviceIpsWithSameManufacturer = await replaceMacWithDeviceIps(hook, sameManufacturerDeviceMacAddrs)
              // logger.debug('\n deviceIpsWithSameManufacturer : ' + JSON.stringify(deviceIpsWithSameManufacturer))
              dhcpDeviceToUpsert[ 'allowHosts' ] = sameManufacturerDeviceMacAddrs
              //dhcpDeviceToUpsert[ 'allowHosts' ] = deviceIpsWithSameManufacturer
              // mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.filter((allowHost) => allowHost!= 'same-manufacturer')
              logger.debug ( '\n Updated  same manufacturer use case  : ' + JSON.stringify ( dhcpDeviceToUpsert ) )
              logger.debug ( '\n Updated allowHosts same manufacturer use case  : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            }
          }

          // Add devices with manufacturer use case
          if ( manufacturerIndex > -1 ) {
            let manufacturerToMatch = mudParserRes.device.allowHosts[ manufacturerIndex ]
            manufacturerToMatch = manufacturerToMatch.split ( 'manufacturer:' )[ 1 ]
            logger.debug ( '\n Manufacturer found in mud response ... Update allowHosts for manufacturer : ' + JSON.stringify ( manufacturerToMatch ) )
            let manufacturerDeviceMacAddrs = userDevices.map ( ( userDevice , index ) => {
              if ( userDevice.deviceAuthority == manufacturerToMatch && index != userDeviceIndex )
                return userDevice.deviceIp
            } )
            manufacturerDeviceMacAddrs = manufacturerDeviceMacAddrs.filter ( ( el ) => {
              return el != null
            } )
            logger.debug ( '\n Same manufacturer : ' + JSON.stringify ( manufacturerDeviceMacAddrs ) )

            // No matching entries found. Remove manufacturer entry from mud response
            if ( manufacturerDeviceMacAddrs.length == 0 && manufacturerIndex > -1 ) {
              logger.debug ( '\n Manufacturer allowHosts before update : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
              mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.filter ( ( allowHost ) => allowHost != mudParserRes.device.allowHosts[ manufacturerIndex ] )
              logger.debug ( '\n Manufacturer allowHosts after update : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            }

            // Matching entries found. Remove manufacturer entry from mud response and add mac addresses
            if ( manufacturerDeviceMacAddrs.length > 0 && manufacturerIndex > -1 ) {
              logger.debug ( '\n Found manufacturer for other devices ... Updating allowHosts ' )
              let deviceIpsWithSameManufacturer = await replaceMacWithDeviceIps ( hook , manufacturerDeviceMacAddrs )
              // logger.debug('\n  deviceIpsWithSameManufacturer : ' + JSON.stringify(deviceIpsWithSameManufacturer))
              // dhcpDeviceToUpsert[ 'allowHosts' ] = deviceIpsWithSameManufacturer
              dhcpDeviceToUpsert[ 'allowHosts' ] = manufacturerDeviceMacAddrs
              //   mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.filter((allowHost) => allowHost!= mudParserRes.device.allowHosts[manufacturerIndex])
              logger.debug ( '\n Updated same manufacturer use case  : ' + JSON.stringify ( dhcpDeviceToUpsert ) )
              logger.debug ( '\n Updated allowHosts same manufacturer use case   : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            }
          }

          // Controller use case
          if ( controllerIndex > -1 ) {
            logger.debug ( '\n Controller found in mud response ...  Updating allowHosts ' )
            let allowHostToUpdate = mudParserRes.device.allowHosts[ controllerIndex ]
            logger.debug ( '\n Controller found in mud response ... AllowHosts : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            logger.debug ( '\n Controller found in mud response ... allowHostToUpdate : ' + JSON.stringify ( allowHostToUpdate ) )
            let controllerToAdd = allowHostToUpdate.split ( 'controller:' )[ 1 ]
            logger.debug ( '\n Controller to add : ' + JSON.stringify ( controllerToAdd ) )
            mudParserRes.device.allowHosts[ controllerIndex ] = controllerToAdd
            // logger.debug('\n\n mudParserRes.device.allowHosts[controllerIndex].split[0] : ' + JSON.stringify(allowHostToUpdate.split('controller:')))
            logger.debug ( '\n Controller found in mud response ... Updated AllowHosts : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )

          }

          // My Controller use case
          if ( myControllerIndex > -1 ) {
            logger.debug ( '\n MyController found in mud response ...  Updating allowHosts ' )
            let allowHostToUpdate = mudParserRes.device.allowHosts[ myControllerIndex ]
            logger.debug ( '\n MyController found in mud response ... AllowHosts : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            logger.debug ( '\n MyController found in mud response ... allowHostToUpdate : ' + JSON.stringify ( allowHostToUpdate ) )
            let publicHostName = hook.app.get ( 'publicBaseUrl' )
            if ( publicHostName.indexOf ( '/sub' ) ) {
              publicHostName = publicHostName.split ( '/sub' )[ 0 ]
              publicHostName = publicHostName.split ( ':443' )[ 0 ]
              publicHostName = publicHostName.split ( '//' )[ 1 ]
            }
            else {
              publicHostName = hook.app.get ( 'listenHost' )
            }

            logger.debug ( '\n Derived publicHostName :  ' + JSON.stringify ( publicHostName ) )
            allowHostToUpdate = publicHostName
            mudParserRes.device.allowHosts[ myControllerIndex ] = allowHostToUpdate
            logger.debug ( '\n MyController found in mud response ... Updated AllowHosts : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )

          }
        }

        if ( mudParserRes.device.allowHosts.length > 0 ) {
          // Remove manufacturer from MUD response
          if ( manufacturerIndex > -1 ) {
            logger.debug ( '\n Mud Parser Allow hosts before filtering manufacturer : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.filter ( ( allowHost ) => allowHost != mudParserRes.device.allowHosts[ manufacturerIndex ] )
            logger.debug ( '\n Mud Parser Allow hosts after filtering manufacturer : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
          }
          // Remove same-manufacturer from MUD response
          if ( sameManufacturerIndex > -1 ) {
            logger.debug ( '\n Mud Parser Allow hosts before filtering same manufacturer : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.filter ( ( allowHost ) => allowHost != 'same-manufacturer' )
            logger.debug ( '\n Mud Parser Allow hosts after filtering same manufacturer : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
          }

          // Remove local-networks from MUD response
          if ( localNetworksIndex > -1 ) {
            logger.debug ( '\n Mud Parser Allow hosts before filtering local networks : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
            mudParserRes.device.allowHosts = mudParserRes.device.allowHosts.filter ( ( allowHost ) => allowHost != 'local-networks' )
            logger.debug ( '\n Mud Parser Allow hosts after filtering local networks  : ' + JSON.stringify ( mudParserRes.device.allowHosts ) )
          }

          dhcpDeviceToUpsert[ 'allowHosts' ] = dhcpDeviceToUpsert.hasOwnProperty ( 'allowHosts' ) && dhcpDeviceToUpsert[ 'allowHosts' ].length > 0 ? dhcpDeviceToUpsert[ 'allowHosts' ].concat ( mudParserRes.device.allowHosts ) : mudParserRes.device.allowHosts
          logger.debug ( '\n allowHosts : ' + JSON.stringify ( dhcpDeviceToUpsert[ 'allowHosts' ] ) )
        }
        if ( mudParserRes.device.denyHosts.length > 0 ) {
          dhcpDeviceToUpsert[ 'denyHosts' ] = mudParserRes.device.denyHosts
        }

        // Device is from DPP Onboarding process and must include PSK property
        if ( userDevices[ userDeviceIndex ].hasOwnProperty ( 'psk' ) ) {
          dhcpDeviceToUpsert[ 'psk' ] = userDevices[ userDeviceIndex ].psk
        }
        logger.debug ( '\n Gateway Device after psk : ' + JSON.stringify ( dhcpDeviceToUpsert ) )
        // TODO : Uncomment later after testing PUT request
        // return Object.assign({dhcpDeviceToUpsert:dhcpDeviceToUpsert, sameManufacturer: true })
        return dhcpDeviceToUpsert
      }
    } else {
      logger.debug ( '\n Empty MUD url.' + JSON.stringify ( mudUrlForDevice ) + ' Added PSK for device' )
      return dhcpDeviceToUpsert
    }
  } ) )

  dhcpDevicesWithMudConfig = flattenArray ( dhcpDevicesWithMudConfig )
  logger.debug ( '\n DHCP Devices with MUD Config : ' + JSON.stringify ( dhcpDevicesWithMudConfig ) )
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
 logger.debug('\n Gateway devices Post Body : ' + JSON.stringify(dhcpDevicesPostBody))
  if ( micronetIndex > -1 ) {
    // Check if subnet exists in DHCP Gateway
    const dhcpSubnet = await axios ( {
      ...apiInit ,
      method : 'GET' ,
      url : `${mmUrl}/${paths.DHCP_PATH}/${subnetId}` ,
    } )
    logger.debug('\n Gateway Subnet : ' + JSON.stringify(dhcpSubnet.data))
    const { body , status } = dhcpSubnet.data

    if ( status != 404 && ((body.hasOwnProperty ( 'micronets' ) && body.micronets.micronetId == subnetId) || (body.hasOwnProperty ( 'micronet' ) && body.micronet.micronetId == subnetId)) ) {
      const dhcpSubnetDevices = await axios ( {
        ...apiInit ,
        method : 'get' ,
        url : `${mmUrl}/${paths.DHCP_PATH}/${subnetId}/devices` ,
      } )

      logger.debug('\n DhcpDevicesPostBody : ' + JSON.stringify(dhcpDevicesPostBody))
      const dhcpDevicePromises = await Promise.all ( dhcpDevicesPostBody.map ( async ( dhcpDevice , index ) => {

        // Check DHCP device to add does not exist in DHCP Subnet
        logger.debug('\n Gateway Device post body : ' + JSON.stringify(dhcpDevice))
        logger.debug('\n GatewayDevices ' + JSON.stringify(dhcpSubnetDevices.data))
        const devicePresentIndex = dhcpSubnetDevices.data.body.devices.findIndex ( ( subnetDevice ) => subnetDevice.deviceId == dhcpDevice.deviceId )
        logger.debug('\n Device Present Index ' + JSON.stringify(devicePresentIndex))

        // Adding the DHCP device to subnet on gateway

        if ( devicePresentIndex == -1 ) {
          const dhcpDeviceToAdd = await axios ( {
            ...apiInit ,
            method : 'POST' ,
            url : `${mmUrl}/${paths.DHCP_PATH}/${subnetId}/devices` ,
            data : dhcpDevice
          } )

          logger.debug('\n Added Gateway device response  .. : ' + JSON.stringify(dhcpDeviceToAdd.data))

          // TODO : Check if MUD response contains same manufacturer or manufacturer property
          if(dhcpDeviceToAdd.data.hasOwnProperty('status') && dhcpDeviceToAdd.data.status == '201'){

            // TODO : Update users api to include deviceIp for added device on gateway.
            logger.debug('\n Gateway device created successfully .... ')
            let gatewayDevice = dhcpDeviceToAdd.data.body.device
            logger.debug('\n Added Gateway device : ' + JSON.stringify(gatewayDevice))
            const users = await hook.app.service ( `${USERS_PATH}` ).get (hook.data.subscriberId);
            logger.debug('\n\n Users with devices : ' + JSON.stringify(users))
            let userDevices = users.devices
            // If users has devices
            let userDeviceIndex = userDevices.findIndex((userDevice) => userDevice.macAddress == gatewayDevice.macAddress.eui48)
            logger.debug('\n User Device Index : ' + JSON.stringify(userDeviceIndex))
            if(userDevices.length > 0 && userDeviceIndex > -1) {
              logger.debug('\n Device to upsert : ' + JSON.stringify(userDevices[userDeviceIndex]))
              let userDeviceToUpsert = Object.assign({}, userDevices[userDeviceIndex] , { deviceIp : gatewayDevice.networkAddress.ipv4 })
              userDevices[userDeviceIndex] = userDeviceToUpsert
              logger.debug('\n Updated user with gateway device : ' + JSON.stringify(userDeviceToUpsert))
              logger.debug('\n Updated user devices : ' + JSON.stringify(userDevices))

              // PATCH UPDATED USER DEVICES
              const upsertDeviceToUser = await hook.app.service ( `${USERS_PATH}` ).patch ( hook.data.subscriberId , userDeviceToUpsert);
              logger.debug('\n Upserted users  : ' + JSON.stringify(upsertDeviceToUser))
            }


            let sameManufacturesDeviceIps = [], devicesToUpsert = []

            // Hnadle empty MUD URL will lead to missing allowHosts.
            if(gatewayDevice.hasOwnProperty('allowHosts'))
            {
              sameManufacturesDeviceIps = gatewayDevice.allowHosts.map((host) => {
                logger.debug('\n GatewayDevice Host : ' + JSON.stringify(host))
                if(validator.isIP(host,4)){
                  return host
                }
              })
            }


           sameManufacturesDeviceIps = sameManufacturesDeviceIps.filter ( ( el ) => { return el != null } )
           logger.debug('\n Same manufacturer DeviceIps found are : ' + JSON.stringify(sameManufacturesDeviceIps))

            let deviceIpToPut =  gatewayDevice.networkAddress.ipv4

            if(deviceIpToPut.length > 0 ) {
             let allDevices = await hook.app.service ( `${USERS_PATH}` ).find({})
             logger.debug('\n All found devices : ' + JSON.stringify(allDevices.data))
              allDevices = allDevices.data[0].devices
             devicesToUpsert = allDevices.map((device) => {
                return sameManufacturesDeviceIps.map((sameManufacturerDeviceIp) => {
                 if(sameManufacturerDeviceIp == device.deviceIp){
                   return device
                 }
               })
             })

              devicesToUpsert = [].concat(...devicesToUpsert);
              devicesToUpsert = devicesToUpsert.filter ( ( el ) => { return el != null } )
              logger.debug('\n Devices to upsert : ' + JSON.stringify(devicesToUpsert))
              let devicesToUpsertPromises = devicesToUpsert.map(async(deviceToUpsert) => {
                logger.debug('\n Current device to upsert ' + JSON.stringify(deviceToUpsert))
                logger.debug('\n Gateway Url for device ' + JSON.stringify(`${mmUrl}/${paths.DHCP_PATH}/${deviceToUpsert.class}/devices/${deviceToUpsert.deviceId}`))
                let gatewayDeviceToUpsert = await axios ( {
                  ...apiInit ,
                  method : 'GET' ,
                  url : `${mmUrl}/${paths.DHCP_PATH}/${deviceToUpsert.class}/devices/${deviceToUpsert.deviceId}`
                })

                logger.debug('\n  Obtained device from gateway status : ' + JSON.stringify(gatewayDeviceToUpsert.status))
                logger.debug('\n  Obtained device from gateway body : ' + JSON.stringify(gatewayDeviceToUpsert.data.body))

                // If device exists do a PUT

                if(gatewayDeviceToUpsert.status == '200'){
                  let devicePutBody = []
                  logger.debug('\n SubnetID : ' + JSON.stringify(subnetId) + '\t\t DeviceToUpsert class : ' + JSON.stringify(deviceToUpsert.class) + '\t\t DeviceToUpsert deviceId : ' + JSON.stringify(deviceToUpsert.deviceId))
                  gatewayDeviceToUpsert = gatewayDeviceToUpsert.data.body.device
                  logger.debug('\n gatewayDeviceToUpsert.allowHosts : ' + JSON.stringify(gatewayDeviceToUpsert.allowHosts))
                  logger.debug('\n deviceIpToPut : ' + JSON.stringify(deviceIpToPut))
                  devicePutBody = [].concat(...gatewayDeviceToUpsert.allowHosts).concat(deviceIpToPut)
                  devicePutBody = [].concat(...devicePutBody)
                  logger.debug('\n Updated PUT request : ' + JSON.stringify(devicePutBody))
                  let deviceUpsertResponse =  await axios ( {
                    ...apiInit ,
                    method : 'PUT' ,
                    url : `${mmUrl}/${paths.DHCP_PATH}/${deviceToUpsert.class}/devices/${deviceToUpsert.deviceId}`,
                    data : Object.assign({},{ allowHosts: devicePutBody })
                  })
                  logger.debug('\n Device Upsert Response : ' + JSON.stringify(deviceUpsertResponse.data))
                }
              })
            }
          }

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
const deallocateIPSubnets = async ( hook , ipSubnets ) => {
  const deallocateSubnetPromises = await Promise.all ( ipSubnets.map ( async ( subnetNo ) => {
    return await subnetAllocation.deallocateSubnet ( 0 , parseInt ( subnetNo ) )
  } ) )
  return deallocateSubnetPromises
}

module.exports = {
  isGatewayAlive ,
  flattenArray ,
  isEmpty ,
  isODLAlive ,
  connectToGateway ,
  getOdlConfig ,
  getODLSwitchDetails ,
  populateOdlConfig ,
  getSubnet ,
  getStaticSubnetIps ,
  getSubnetIps ,
  getDeviceForSubnet ,
  getSubnetAndDeviceIps ,
  getRegistryForSubscriber ,
  getSubscriberId ,
  getRegistry ,
  getMicronet ,
  populatePostObj ,
  upsertOdLConfigState ,
  fetchOdlOperationalState ,
  mockOdlOperationsForUpserts ,
  odlOperationsForUpserts ,
  subnetPresentCheck ,
  createSubnetInMicronet ,
  upsertSubnetsToMicronet ,
  upsertRegisteredDeviceToMicronet ,
  addDevicesInSubnet ,
  addDhcpSubnets ,
  upsertDhcpDevicesWithMudConfig ,
  addDhcpDevices ,
  deleteDhcpSubnets ,
  deallocateIPSubnets
}