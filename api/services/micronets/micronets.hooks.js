const { authenticate } = require ( '@feathersjs/authentication' ).hooks;
const subnetAllocation = require ( '../../hooks/subnetAllocaiton' )
const micronetWithDevices = require ( '../../mock-data/micronetWithDevices' );
const micronetWithDevices2 = require ( '../../mock-data/micronetWithDevices2' );
const micronetWithoutDevices = require ( '../../mock-data/micronetWithoutDevices' );
const micronetOperationalConfig = require ( '../../mock-data/micronetsOperationalConfig' );
const micronetNotifications = require ( '../../mock-data/micronetNotifications' );
var rn = require ( 'random-number' );
var async = require ( "async" );
const axios = require ( 'axios' );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
var options = { integer : true }
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const dw = require ( '../../hooks/dhcpWrapperPromise' )
const odlAuthHeader = {
  username : 'admin' ,
  password : 'admin'
}
const PORT_WIRED = "wired"
const PORT_WIRELESS = "wifi"

/* BootStrap Sequence */
const isGatewayAlive = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { websocketUrl } = registry
  console.log ( '\n isGatewayAlive hook websocketUrl : ' + JSON.stringify ( websocketUrl ) )
  const dhcpConnection = await dw.connect ( websocketUrl ).then ( () => {
    return true
  } )
  console.log ( '\n DHCP Connection value : ' + JSON.stringify ( dhcpConnection ) )
  return dhcpConnection
}

const flattenArray = (a) => Array.isArray(a) ? [].concat(...a.map(flattenArray)) : a;

const connectToGateway = async ( hook ) => {
  console.log ( '\n connectToGateway hook ...' )
  return true
}

const isODLAlive = async ( hook ) => {
  console.log ( '\n isODLAlive hook ' )
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry
  console.log ( '\n Polling ODL micronet notifications for OVS Manager connection ODL URL : ' + JSON.stringify ( odlUrl ) )
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
  console.log ( '\n isODLAlive NOTIFICATIONS DATA : ' + JSON.stringify ( data ) )
  console.log ( '\n isODLAlive NOTIFICATIONS STATUS : ' + JSON.stringify ( status ) )
  return (data && status == 200) ? true : false

}
/* BootStrap Sequence */

const getOdlConfig = async ( hook , id ) => {
  console.log ( '\n getOdlConfig hook with passed id : ' + JSON.stringify ( id ) )
  return hook.app.service ( '/mm/v1/micronets/odl' ).get ( id )
    .then ( ( data ) => {
      console.log ( '\n Data from odl config : ' + JSON.stringify ( data ) )
      return data
    } )
}

const isOdlStaticConfigPresent = async ( hook , reqBody ) => {
  console.log ( '\n isOdlStaticConfigPresent Hook with Request Body : ' + JSON.stringify ( reqBody ) )
  const { micronet } = reqBody.micronets
  const noOfMicronets = micronet.length
  micronet.forEach ( ( micronet , index ) => {
    if ( hasProp ( micronet , 'trunk-gateway-port' ) && hasProp ( micronet , 'trunk-gateway-ip' ) && hasProp ( micronet , 'dhcp-server-port' ) && hasProp ( micronet , 'ovs-bridge-name' ) && hasProp ( micronet , 'ovs-manager-ip' ) ) {
      console.log ( '\n Properties found for ODL STATIC CONFIG  ' )
      return true
    }
  } )
  return false
}

const getODLSwitchDetails = async ( hook , gatewayId ) => {
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  const { switchConfig } = odlStaticConfig
  console.log ( '\n getODLSwitchDetails SwitchConfig : ' + JSON.stringify ( switchConfig ) )
  const bridgeTrunkIndex = switchConfig.bridges.findIndex ( ( bridge ) => bridge.hasOwnProperty ( "trunkPort" ) && bridge.hasOwnProperty ( "trunkIp" ) )
  const bridgeTrunk = switchConfig.bridges[ bridgeTrunkIndex ]
  const ovsHost = odlStaticConfig.ovsHost
  const ovsPort = odlStaticConfig.ovsPort
  let wirelessPorts = bridgeTrunk.ports.map ( ( port ) => {
    if ( port.hasOwnProperty ( "hwtype" ) && port.hwtype == PORT_WIRELESS ) {
      return port
    }
  } )
  wirelessPorts = wirelessPorts.filter ( Boolean )
  let wiredPorts = bridgeTrunk.ports.map ( ( port ) => {
    if ( port.hasOwnProperty ( "hwtype" ) && port.hwtype == PORT_WIRED ) {
      return port
    }
  } )
  wiredPorts = wiredPorts.filter ( Boolean )
  console.log ( '\n\n Bridge Trunk Index : ' + JSON.stringify ( bridgeTrunkIndex )
    + '\n Bridge Trunk : ' + JSON.stringify ( bridgeTrunk )
    + '\n WiredPorts ' + JSON.stringify ( wiredPorts )
    + '\n WirelessPorts : ' + JSON.stringify ( wirelessPorts ) )
  console.log ( '\n OVS Host : ' + JSON.stringify ( ovsHost ) + '\t\t OVS Port : ' + JSON.stringify ( ovsPort ) )
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
  console.log ( '\n populateOdlConfig requestBody : ' + JSON.stringify ( requestBody ) + '\t\t GatewayId : ' + JSON.stringify ( gatewayId ) )
  const { micronet } = requestBody.micronets;
  const { odlStaticConfig , bridgeTrunkIndex , bridgeTrunk , wiredPorts , wirelessPorts , ovsHost , ovsPort , switchConfig } = await getODLSwitchDetails ( hook , gatewayId )

  console.log ( '\n Populate ODL Config  => bridgeTrunkIndex : ' + JSON.stringify ( bridgeTrunkIndex )
    + '\n bridgeTrunk : ' + JSON.stringify ( bridgeTrunk )
    + '\n wiredPorts : ' + JSON.stringify ( wiredPorts )
    + '\n wirelessPorts : ' + JSON.stringify ( wirelessPorts )
    + '\n ovsHost : ' + JSON.stringify ( ovsHost )
    + '\n ovsPort : ' + JSON.stringify ( ovsPort )
    + '\n switchConfig : ' + JSON.stringify ( switchConfig ) )
  const reqBodyWithOdlConfig = micronet.map ( ( micronet , index ) => {
    return {
      ...micronet ,
      "trunk-gateway-port" : bridgeTrunk.trunkPort ,  // trunkGatewayPort.portTrunk ,
      "trunk-gateway-ip" : ovsHost ,
      "dhcp-server-port" : "LOCAL" ,
      "dhcp-zone" : bridgeTrunk.trunkIp ,    //  switchConfig.bridges[ trunkIndex ].subnet ,  // Maybe this shd be trunkIndex or index
      "ovs-bridge-name" : bridgeTrunk.name ,     // switchConfig.bridges[ trunkIndex ].bridge ,  //Maybe this shd be trunkIndex or index
      "ovs-manager-ip" : ovsHost
    }
  } );
  console.log ( '\n\n populateOdlConfig reqBodyWithOdlConfig : ' + JSON.stringify ( reqBodyWithOdlConfig ) )
  return {
    reqBodyWithOdlConfig ,
    bridgeTrunkIndex ,
    bridgeTrunk ,
    wirelessPorts ,
    wiredPorts ,
    switchConfig ,
    ovsHost ,
    ovsPort
  }
}

const getSubnet = ( hook , index ) => {
  subnetAllocation.getNewSubnet ( index ).then ( ( subnet ) => {
    return subnet
  } )
}
/* Get Static Subnet IP's */
const getStaticSubnetIps = async ( hook , subnetDetails , requestBody ) => {
  console.log ( '\n getStaticSubnetIps requestBody : ' + JSON.stringify ( requestBody ) + '\t\t subnetDetails : ' + JSON.stringify ( subnetDetails ) )

  /* Get gatewayId */
  const registry = await getRegistry ( hook )
  console.log ( '\n Registry obtained : ' + JSON.stringify ( registry ) )
  const gatewayId = registry.gatewayId
  /* Get gatewayId */

  /* Get SwitchConfig */
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  const { switchConfig } = odlStaticConfig
  /* Get SwitchConfig */

  /* Get Allocated subnets  */
  const micronetFromDB = await getMicronet(hook,{})
  const allocatedSubnetNos = micronetFromDB.micronets.micronet.map((micronet)=> { return (micronet['micronet-subnet']) })
  console.log('\n allocatedSubnetNos from Micro-net database : ' + JSON.stringify(allocatedSubnetNos))

  console.log ( '\n\n GET STATIC SUBNET IPs SWITCH CONFIG : ' + JSON.stringify ( switchConfig ) )


  let wiredSwitchConfigSubnets = switchConfig.bridges.map ( ( bridge ) => {
    console.log ( '\n Current bridge : ' + JSON.stringify ( bridge.name ) )
    return bridge.ports.map ( ( port , index ) => {
      console.log('\n\n Port : ' + JSON.stringify(port))
      if ( port.hasOwnProperty ( 'hwtype' ) && port.hwtype == "wired" ) {
        // return { subnet : port.subnet , port : port }
         return port.subnet
      }
    })
  })

  // Flatten array , filter null values , remove duplicate elements, remove previously allocated subnetNos
  wiredSwitchConfigSubnets = [].concat(...wiredSwitchConfigSubnets).filter ( Boolean )
  wiredSwitchConfigSubnets = [...(new Set(wiredSwitchConfigSubnets))]
  wiredSwitchConfigSubnets = wiredSwitchConfigSubnets.filter( ( el ) => !allocatedSubnetNos.includes( el ) );

  let wirelessSwitchConfigSubnets = switchConfig.bridges.map ( ( bridge ) => {
    console.log ( '\n Current bridge : ' + JSON.stringify ( bridge.name ) )
    return bridge.ports.map ( ( port , index ) => {
      console.log('\n\n Port : ' + JSON.stringify(port))
      if ( port.hasOwnProperty ( 'hwtype' ) && port.hwtype == "wifi" ) {
        // return { subnet : port.subnet , port : port }
        return port.subnet
      }
    })
  })

  // Flatten array , filter null values , remove duplicate elements, remove previously allocated subnetNos
  wirelessSwitchConfigSubnets = [].concat(...wirelessSwitchConfigSubnets).filter ( Boolean )
  wirelessSwitchConfigSubnets = [...(new Set(wirelessSwitchConfigSubnets))]
  wirelessSwitchConfigSubnets = wirelessSwitchConfigSubnets.filter( ( el ) => !allocatedSubnetNos.includes( el ) );

  console.log ( '\n GetStaticSubnetIps wiredSwitchConfigSubnets : ' + JSON.stringify ( wiredSwitchConfigSubnets ) + '\t\t wirelessSwitchConfigSubnets : ' + JSON.stringify ( wirelessSwitchConfigSubnets ) )

  if(wiredSwitchConfigSubnets.length > 0) {
    const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
      const subnetNo = parseInt(wiredSwitchConfigSubnets[ index ].split ( '.' )[ 2 ])
      console.log ( '\n Calling IP Allocator to create subnet ' + JSON.stringify ( subnetNo ) )
      const subnets = await subnetAllocation.getNewSubnet ( index , subnetNo )
      // console.log ( '\n GET SUBNET IPs Subnets from IPAllocator : ' + JSON.stringify ( subnets ) )
      return Object.assign ( {} , subnets )
    } ) )
    console.log ( '\n getStaticSubnetIps Obtained subnets : ' + JSON.stringify ( promises ) )
    return promises
  }
  else {
   // TODO : Add Errors
  }

}

/* Get Dynamic Subnet IP's */
const getSubnetIps = async ( hook , subnetDetails , requestBody ) => {
  console.log ( '\n getSubnetIps requestBody : ' + JSON.stringify ( requestBody ) + '\t\t subnetDetails : ' + JSON.stringify ( subnetDetails ) )
  const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
    const subnets = await subnetAllocation.getNewSubnet ( index )
    // console.log ( '\n GET SUBNET IPs Subnets from IPAllocator : ' + JSON.stringify ( subnets ) )
    return Object.assign ( {} , subnets )
  } ) )
  console.log ( '\n getSubnetIps Obtained subnets : ' + JSON.stringify ( promises ) )
  return promises
}

const getDeviceForSubnet = async ( hook , subnetDetails , subnets ) => {
  subnetDetails = [].concat ( ...subnetDetails );
  console.log ( '\n getDeviceForSubnet Passed subnetDetails : ' + JSON.stringify ( subnetDetails ) + '\t\t subnets : ' + JSON.stringify ( subnets ) )
  let devicesWithIp = await Promise.all ( subnets.map ( async ( subnet , subnetIndex ) => {
    // console.log ( '\n Current Subnet : ' + JSON.stringify ( subnet ) + '\t\t Subnet Index : ' + JSON.stringify ( subnetIndex ) )
    // console.log ( '\n Current Subnet Details : ' + JSON.stringify ( subnetDetails[ subnetIndex ] ) + '\t\t subnetDetails[ subnetIndex ].devices.length : ' + JSON.stringify(subnetDetails[ subnetIndex ].devices.length) )
    // console.log ( '\n subnetIndex < subnetDetails.length : ' + JSON.stringify ( subnetIndex < subnetDetails.length ) )
    if ( subnetIndex < subnetDetails.length && subnetDetails[ subnetIndex ].devices.length >= 1 ) {
      const devices = subnetDetails[ subnetIndex ].devices
      // console.log ( '\n All Devices array from Subnet Details : ' + JSON.stringify ( devices ) )
      const subnetAndDeviceIpData = await subnetAllocation.getNewIps ( subnet.subnet , devices )
      // console.log ( '\n getDeviceForSubnet subnetAndDeviceIpData : ' + JSON.stringify ( subnetAndDeviceIpData ) )
      return {
        ...subnetAndDeviceIpData
      }
    }
  } ) )

  devicesWithIp = [].concat ( ...devicesWithIp )
  console.log ( '\n getDeviceForSubnet devicesWithIp : ' + JSON.stringify ( devicesWithIp ) )
  return devicesWithIp
}

// TODO : Pass Switch Config object and wired and wireless subnet
const getSubnetAndDeviceIps = async ( hook , requestBody ) => {
  console.log ( '\n getSubnetAndDeviceIps requestBody : ' + JSON.stringify ( requestBody ) )
  const noOfSubnets = requestBody.length
  // console.log ( '\n No of Subnets : ' + JSON.stringify ( noOfSubnets ) )
  const subnetDetails = requestBody.map ( ( micronet , index ) => {
    return Object.assign ( {} , {
      name : micronet.name ,
      devices : micronet[ 'connected-devices' ]
    } )
  } )
  console.log ( '\n getSubnetAndDeviceIps Subnet Details : ' + JSON.stringify ( subnetDetails ) )

  // Gets random subnets
  // const subnets = await getSubnetIps ( hook , subnetDetails , requestBody )

  // Gets static subnets
  const subnets = await getStaticSubnetIps ( hook , subnetDetails , requestBody )
  console.log ( '\n getSubnetAndDeviceIps Obtained subnets : ' + JSON.stringify ( subnets ) )

  /* Add check for devices length in subnetDetails array */
  let subnetDetailsWithDevices = subnetDetails.map ( ( subnetDetail , index ) => {
    // console.log('\n subnetDetail.devices.length : ' + JSON.stringify(subnetDetail.devices.length))
    if ( subnetDetail.devices.length >= 1 ) {
      return subnetDetail
    }
  } )

  subnetDetailsWithDevices = subnetDetailsWithDevices.filter ( Boolean )
  console.log ( '\n Subnet Details with devices : ' + JSON.stringify ( subnetDetailsWithDevices ) )
  // console.log ( '\n subnetDetailsWithDevices.length : ' + JSON.stringify ( subnetDetailsWithDevices.length ) )
  // console.log ( '\n subnets.length : ' + JSON.stringify ( subnets.length ) )

  /* All Subnets have Devices */
  if ( subnets.length == subnetDetailsWithDevices.length ) {
    console.log ( '\n All subnets have devices .... ' )
    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetails , subnets )
    console.log ( '\n All subnets with devices : ' + JSON.stringify ( subnetsWithDevices ) )
    return subnetsWithDevices
  }

  /* Few Subnets have Devices */
  if ( subnets.length > 0 && subnetDetailsWithDevices.length >= 1 && subnets.length > subnetDetailsWithDevices.length ) {
    console.log ( '\n Not all subnets have devices ...' )
    const subnetsWithDevicesSubset = subnetDetailsWithDevices.map ( ( sbd , index ) => {
      return subnets[ index ]
    } )
    // console.log ( '\n subnetsWithDevicesSubset : ' + JSON.stringify ( subnetsWithDevicesSubset ) )
    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetailsWithDevices , subnetsWithDevicesSubset )
    console.log ( '\n Subnets With Devices : ' + JSON.stringify ( subnetsWithDevices ) )

    const subnetsWithoutDevices = subnets.map ( ( subnet , index ) => {
      // console.log ( '\n subnet : ' + JSON.stringify ( subnet ) + '\t\t Index : ' + JSON.stringify ( index ) + '\t\t subnetsWithDevices.length : ' + JSON.stringify ( subnetsWithDevices ) )

      if ( index < subnetsWithDevices.length && subnet.subnet != subnetsWithDevices[ index ].subnet ) {
        console.log ( '\n Subnet without device : ' + JSON.stringify ( subnet ) )
        return subnet
      }
      if ( index >= subnetsWithDevices.length ) {
        console.log ( '\n Subnet : ' + JSON.stringify ( subnet ) )
        return subnet
      }
    } )

    console.log ( '\n Subnets without Devices : ' + JSON.stringify ( subnetsWithoutDevices ) )
    let allSubnets = subnetsWithoutDevices.concat ( subnetsWithDevices )
    allSubnets = allSubnets.filter ( Boolean )
    console.log ( '\n Subnets with and without devices : ' + JSON.stringify ( allSubnets ) )
    // TODO : Maybe add "device-openflow-port" property here
    return allSubnets

  }

  /* No subnets have devices */
  if ( subnets.length > 0 && subnetDetailsWithDevices.length == 0 ) {
    return subnets
  }

}

function hasProp ( obj , prop ) {
  console.log ( '\n hasProp called for prop ' + JSON.stringify ( prop ) + '\t VALUE : ' + JSON.stringify ( Object.prototype.hasOwnProperty.call ( obj , prop ) ) )
  return Object.prototype.hasOwnProperty.call ( obj , prop );
}

const getRegistryForSubscriber = async ( hook , subscriberId ) => {
  const query = Object.assign ( {} , { subscriberId : subscriberId } , hook.params.query );
  console.log ( '\n getRegistryForSubscriber Query : ' + JSON.stringify ( query ) )
  return hook.app.service ( '/mm/v1/micronets/registry' ).find ( query )
    .then ( ( { data } ) => {
      console.log ( '\n getRegistryForSubscriber Data : ' + JSON.stringify ( data ) )
      if ( data.length === 1 ) {
        return omitMeta ( data[ 0 ] );
      }
    } )
}

const getRegistry = async ( hook ) => {
  const micronetFromDB = await getMicronet ( hook , {} )
  const subscriberId = micronetFromDB.id
  const registry = await getRegistryForSubscriber ( hook , subscriberId )
  return registry
}

const populatePostObj = async ( hook , reqBody ) => {
  console.log ( '\n PopulatePostObj Request-Body : ' + JSON.stringify ( reqBody ) )
  const { micronet } = reqBody.micronets
  const noOfMicronets = micronet.length
  console.log ( '\n PopulatePostObj for : ' + JSON.stringify ( noOfMicronets ) + ' micronets. ' )

  /* Get gatewayId */
  const registry = await getRegistry ( hook )
  console.log ( '\n Registry obtained : ' + JSON.stringify ( registry ) )
  const gatewayId = registry.gatewayId
  /* Get gatewayId */

  /* Populate ODL Static Config */
  const config = await populateOdlConfig ( hook , reqBody , gatewayId )
  const { reqBodyWithOdlConfig , wirelessPorts , wiredPorts } = config
  console.log ( '\n PopulatePostObj  CONFIG : ' + JSON.stringify ( config ) )
  // console.log ( '\n\n PopulatePostObj reqBodyWithOdlConfig : ' + JSON.stringify ( reqBodyWithOdlConfig ) )

  /* Populate Sub-nets and Devices Config */
  const subnetAndDeviceIps = await getSubnetAndDeviceIps ( hook , reqBodyWithOdlConfig )
  console.log ( '\n PopulatePostObj SUBNET AND DEVICE IPs  : ' + JSON.stringify ( subnetAndDeviceIps ) )
  console.log ( '\n PopulatePostObj WITH ODL CONFIG : ' + JSON.stringify ( reqBodyWithOdlConfig ) )
  let updatedReqPostBody = reqBodyWithOdlConfig.map ( ( reqPostBody , index ) => {
    console.log ( '\n\n reqPostBody : ' + JSON.stringify ( reqPostBody ) )
    console.log ( '\n\n subnetAndDeviceIps : ' + JSON.stringify ( subnetAndDeviceIps[ index ] ) )

    let connectedDevicesFull = []
    if ( subnetAndDeviceIps[ index ].hasOwnProperty ( 'connectedDevices' ) && subnetAndDeviceIps[ index ].connectedDevices.length > 0 ) {
      console.log ( '\n SubnetAndDeviceIps connectedDevices Length : ' + JSON.stringify ( subnetAndDeviceIps[ index ].connectedDevices.length ) )
      connectedDevicesFull = subnetAndDeviceIps[ index ].connectedDevices.map ( ( device , index ) => {
        console.log ( '\n Device : ' + JSON.stringify ( device ) + '\t\t Index : ' + JSON.stringify ( index ) )
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
    //console.log ( '\n ConnectedDevicesFull : ' + JSON.stringify ( connectedDevicesFull ) )
    return {
      ...reqPostBody ,
      "micronet-subnet" : subnetAndDeviceIps[ index ].micronetSubnet ,
      "micronet-gateway-ip" : subnetAndDeviceIps[ index ].micronetGatewayIp ,
      "dhcp-zone" : subnetAndDeviceIps[ index ].micronetSubnet ,
      "connected-devices" : connectedDevicesFull
    }
  } )
  updatedReqPostBody = [].concat ( ...updatedReqPostBody )
  console.log ( '\n  Populated Post Body  : ' + JSON.stringify ( updatedReqPostBody ) )
  return updatedReqPostBody
}

const initializeMicronets = async ( hook , postBody ) => {
  console.log ( '\n InitializeMicronets postBody: ' + JSON.stringify ( postBody ) )
  // Delete all Micronets
  // const removeAllMicronetsResponse = await hook.app.service ( '/mm/v1/micronets' ).remove ( null )
  // console.log ( '\n removeAllMicronetsResponse : ' + JSON.stringify ( removeAllMicronetsResponse ) )
  // if ( removeAllMicronetsResponse ) {
  /* ACTUAL ODL CALL
  // const odlResponse = await odlOperationsForUpserts ( hook , postBody )
  // return odlResponse
  */

  // FAKE RESPONSE

  const mockOdlResponse = await mockOdlOperationsForUpserts ( hook , postBody , "" , "" )
  return mockOdlResponse
  // }
}

const getMicronet = async ( hook , query ) => {
  // console.log('\n getMicronet query : ' + JSON.stringify(query))
  const micronetFromDb = await hook.app.service ( '/mm/v1/micronets' ).find ( query )
  // console.log('\n Micronet From DB  : ' + JSON.stringify(micronetFromDb.data[0]))
  return micronetFromDb.data[ 0 ]
}

/* ODL Config PUT / GET Calls */

const upsertOdLConfigState = async ( hook , postBody ) => {
  const registry = await getRegistry ( hook , {} )
  const { odlUrl } = registry

  // console.log ( '\n upsertOdLConfigState hook postBody : ' + JSON.stringify ( postBody ) )
  // // AXIOS ODL call.Check for Response Code 201 or 200
  // const odlConfigResponse = await axios ( {
  //   ...apiInit ,
  //   auth: odlAuthHeader,
  //   method : 'PUT' ,
  //   url : `http://${odlHost}:${odlSocket}/restconf/config/micronets:micronets` ,
  //   data: postBody
  // })
  //  const {status, data} = odlConfigResponse
  // console.log ( '\n PUT ODL CONFIG RESPONSE STATUS : ' + JSON.stringify ( status ) + '\t\t DATA : ' + JSON.stringify(data) )
  //

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
  // console.log('\n ODL OPERATIONAL STATE DATA : ' + JSON.stringify(data))
  // console.log('\n ODL OPERATIONAL STATE STATUS CODE : ' + JSON.stringify(status))
  // return odlOperationalState

  // Uncomment for Fake response
  const odlOperationalState = Object.assign ( {} , { data : micronetOperationalConfig , status : 200 } )
  console.log ( '\n FAKE OPERATIONAL STATE : ' + JSON.stringify ( odlOperationalState ) )
  console.log ( '\n fetchOdlOperationalState DATA : ' + JSON.stringify ( odlOperationalState.data ) + '\t\t STATUS : ' + JSON.stringify ( odlOperationalState.status ) )
  return odlOperationalState
}

// Calls mock-micronet API
const mockOdlOperationsForUpserts = async ( hook , requestBody , micronetId , subnetId ) => {
  console.log ( '\n mockOdlOperationsForUpserts hook requestBody : ' + JSON.stringify ( requestBody ) + '\t\t MicronetId : ' + JSON.stringify ( micronetId ) + '\t\t SubnetId : ' + JSON.stringify ( subnetId ) )
  let postBody = requestBody.hasOwnProperty('micronets') && requestBody.hasOwnProperty('name') && requestBody.hasOwnProperty('id') ? requestBody.micronets.micronet : requestBody
  console.log('\n mockOdlOperationsForUpserts POSTBODY : ' + JSON.stringify(postBody))
  const registry = await getRegistry ( hook , {} )
  const { mmUrl } = registry
  const mockResponse = await axios ( {
    ...apiInit ,
    method : 'POST' ,
    url : micronetId && subnetId ? `${mmUrl}/mm/v1/mock/micronets/${micronetId}/subnets/${subnetId}/devices` : `${mmUrl}/mm/v1/mock/micronets` ,
    data : Object.assign ( {} , { micronets : { micronet : postBody } } )
  } )
  console.log ( '\n Mock ODL Response Data : ' + JSON.stringify ( mockResponse.data ) + '\t\t Status : ' + JSON.stringify ( mockResponse.status ) )
  return Object.assign ( {} , { data : mockResponse.data , status : mockResponse.status } )
}

const odlOperationsForUpserts = async ( hook , putBody ) => {
  console.log ( '\n odlOperationsForUpserts hook putBody : ' + JSON.stringify ( putBody ) )
  const odlConfigStateResponse = await upsertOdLConfigState ( hook , putBody )
  console.log ( '\n odlOperationsForUpserts odlConfigStateResponse DATA : ' + JSON.stringify ( odlConfigStateResponse.data ) + '\t\t STATUS : ' + JSON.stringify ( odlConfigStateResponse.status ) )
  // Check if status code is 200 / 201 OK
  if ( odlConfigStateResponse.status == 200 && odlConfigStateResponse.data == "" ) {
    console.log ( '\n Check odlConfigStateResponse.status == 200 &&  odlConfigStateResponse.data == "" suceeded' )
    const odlOperationalState = await fetchOdlOperationalState ( hook )
    return odlOperationalState
  }
  else {
    console.log ( '\n ODL PUT CONFIG FAILED STATUS : ' + JSON.stringify ( odlConfigStateResponse.status ) + '\t\t ERRORS : ' + JSON.stringify ( odlConfigStateResponse.errors ) )

  }
}

/* ODL Config PUT / GET Calls */

const subnetPresentCheck = async ( hook , body , micronetFromDb ) => {
  let subnetsStatus = Object.assign ( {} , {
    found : [] ,
    notFound : []
  } )

  //console.log('\n SubnetPresentCheck BODY : ' + JSON.stringify(body) + '\t\t FOUND MICRO-NET : ' + JSON.stringify(micronetFromDb))
  const foundMicronet = micronetFromDb.micronets.micronet
  //console.log('\n SubnetPresentCheck subnets present : ' + JSON.stringify(foundMicronet))
  const subnetsFromPost = body.micronets.micronet
  //console.log('\n SubnetPresentCheck postBody : ' + JSON.stringify(subnetsFromPost))
  const existingMicronetClass = foundMicronet.map ( ( micronet , index ) => {
    return micronet.class
  } )
  //console.log('\n Existing Micronet Class : ' + JSON.stringify(existingMicronetClass))
  subnetsFromPost.forEach ( ( subnetFromPost , index ) => {
    const foundIndex = existingMicronetClass.indexOf ( subnetFromPost.name )
    console.log ( '\n FoundIndex : ' + JSON.stringify ( foundIndex ) + '\t\t Subnet Name : ' + JSON.stringify ( subnetFromPost.name ) )
    if ( foundIndex == -1 ) {
      subnetsStatus.notFound = [ subnetFromPost.name ]
    }
    if ( foundIndex > -1 ) {
      subnetsStatus.found = [ subnetFromPost.name ]
    }
  } )

  console.log ( '\n SubnetPresentCheck Subnet Status : ' + JSON.stringify ( subnetsStatus ) )
  return subnetsStatus
}
// Add subnet to micronet
const createSubnetInMicronet = async ( hook , postBody , subnetsToAdd ) => {
  console.log ( '\n CreateSubnetInMicronet  postBody : ' + JSON.stringify ( postBody ) + '\t\t subnetsToAdd : ' + JSON.stringify ( subnetsToAdd ) )
  const finalPostBody = await populatePostObj ( hook , postBody )
  console.log ( '\n Constructed Post Body  : ' + JSON.stringify ( finalPostBody ) )
  return finalPostBody
}

const upsertSubnetsToMicronet = async ( hook , body ) => {
  let postBodyForODL = []
  console.log ( '\n UpsertSubnetsToMicronet  BODY : ' + JSON.stringify ( body ) )
  const micronetFromDb = await getMicronet ( hook , query = {} )
  // console.log ( '\n  UpsertSubnetsToMicronet micronetFromDB : ' + JSON.stringify ( micronetFromDb ) )

  // TODO : Add Logic to check with operational state

  const subnetsStatus = await subnetPresentCheck ( hook , body , micronetFromDb )
  console.log ( '\n UpsertSubnetsToMicronet Subnets Status : ' + JSON.stringify ( subnetsStatus ) )
  console.log ( '\n UpsertSubnetsToMicronet subnetsNotFound length : ' + JSON.stringify ( subnetsStatus.notFound.length ) )
  if ( subnetsStatus.notFound.length >= 1 ) {
    console.log ( '\n Create subnets for ' + JSON.stringify ( subnetsStatus.notFound ) )
    const subnetsToAdd = await createSubnetInMicronet ( hook , body , subnetsStatus.notFound )
    console.log ( '\n UpsertSubnetsToMicronet subnetsToAdd : ' + JSON.stringify ( subnetsToAdd ) )
    postBodyForODL = micronetFromDb.micronets.micronet.concat ( subnetsToAdd )
    console.log ( '\n UpsertSubnetsToMicronet PostBodyForODL with added subnets : ' + JSON.stringify ( postBodyForODL ) )
    return { postBodyForODL , addSubnet : true }
  }
  if ( subnetsStatus.notFound.length == 0 ) {
    console.log ( '\n Subnet already present . Do nothing ' ) //TODO: Send a flag indicating that just a get is required
    postBodyForODL = Object.assign ( {} , { micronets : { micronet : micronetFromDb.micronets.micronet } } )
    console.log ( '\n PostBodyForODL from DB : ' + JSON.stringify ( postBodyForODL ) )
    return { postBodyForODL , addSubnet : false }
  }

  // return postBodyForODL
}

const updateMicronetModel = async ( hook , response ) => {
  console.log ( '\n updateMicronetModel response: ' + JSON.stringify ( response ) )
  // TODO : Check if class attribute is present.Or use micronet-subnet-id
  let dbModelResponse = response.micronets.micronet.map ( ( micronet , index ) => {
    return {
      ...micronet ,
      "class" : micronet.name
    }
  } )
  console.log ( '\n dbModelResponse : ' + JSON.stringify ( dbModelResponse ) )
  return dbModelResponse
}

/* Add Registered devices to existing or new subnet */
const upsertRegisteredDeviceToMicronet = async ( hook , eventData ) => {
  const { type , data } = eventData
  const { subscriberId , device } = data
  console.log ( '\n UpsertRegisteredDeviceToMicronet type : ' + JSON.stringify ( type ) + '\t\t subscriberId : ' + JSON.stringify ( subscriberId ) + '\t\t UpsertRegisteredDeviceToMicronet device : ' + JSON.stringify ( device ) )

  let micronetFromDB = await getMicronet ( hook , {} )
  hook.id = micronetFromDB._id

  console.log ( '\n Micronet from DB : ' + JSON.stringify ( micronetFromDB ) )
  const existingMicronetClasses = micronetFromDB.micronets.micronet.map ( ( micronet , index ) => {
    return micronet.class
  } )
  console.log ( '\n Existing Micro-net Classes : ' + JSON.stringify ( existingMicronetClasses ) )
  const classIndex = existingMicronetClasses.findIndex ( ( className ) => className == device.class )
  console.log ( '\n ClassIndex for ' + JSON.stringify ( device.class ) + ' : ' + JSON.stringify ( classIndex ) )

  /* Add Subnet to Micro-net first */

  if ( classIndex == -1 ) {
    console.log ( '\n Micronet class does not exist.Create a new subnet and add device ...' )
    const postBodyForSubnet = Object.assign ( {} , {
      micronets : {
        micronet : [ {
          "name" : device.class ,
          "micronet-subnet-id" : device.class ,
          "connected-devices" : []
        } ]
      }
    } )
    console.log ( '\n PostBodyForSubnet to create subnet : ' + JSON.stringify ( postBodyForSubnet ) )
    const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , postBodyForSubnet )
    console.log ( '\n UpsertRegisteredDeviceToMicronet postBodyForODL : ' + JSON.stringify ( postBodyForODL ) + '\t\t addSubnet Flag : ' + JSON.stringify ( addSubnet ) )

    /* ODL API's */
   // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
    const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL )
    if ( odlResponse.data && odlResponse.status == 201 ) {
      console.log ( '\n UpsertRegisteredDeviceToMicronet odlResponse : ' + JSON.stringify ( odlResponse ) )
      const addSubnetPatchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( hook.id ,
        { micronets : { micronet : odlResponse.data.micronets.micronet } } ,
        { query : {} , mongoose : { upsert : true } } );
      console.log ( '\n UpsertRegisteredDeviceToMicronet addSubnetPatchResult : ' + JSON.stringify ( addSubnetPatchResult ) )

      // Add device to subnet
      if ( addSubnetPatchResult ) {
        micronetFromDB = await getMicronet ( hook , {} )
        const micronetToUpdateIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => (micronet.class == device.class) )
        const micronetToUpdate = micronetFromDB.micronets.micronet[micronetToUpdateIndex]
        console.log('\n micronetToUpdateIndex : ' + JSON.stringify(micronetToUpdateIndex) + '\t\t\t MicronetToUpdate : ' + JSON.stringify(micronetToUpdate))
        const postODLBody = await addDevicesInSubnet ( hook , micronetToUpdate[ 'micronet-id' ] ,micronetToUpdate[ 'micronet-subnet-id' ] , device )
        console.log ( '\n UpsertRegisteredDeviceToMicronet postODLBody : ' + JSON.stringify ( postODLBody ) )
        return postODLBody
      }
    }
  }

  /* Subnet exists.Add device to subnet */
  if ( classIndex > -1 ) {
    console.log ( '\n Micronet class exists.Add device to subnet ...' )
    // Add device to subnet
    const micronetIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => (micronet.class == device.class) )
    console.log ( '\n Found micronet from database to add device to micronetIndex  : ' + JSON.stringify ( micronetIndex ) )
    const micronetToUpdate = micronetFromDB.micronets.micronet[ micronetIndex ]
    const postODLBody = await addDevicesInSubnet ( hook , micronetToUpdate[ 'micronet-id' ] , micronetToUpdate[ 'micronet-subnet-id' ] , device )
    console.log ( '\n UpsertRegisteredDeviceToMicronet postODLBody : ' + JSON.stringify ( postODLBody ) )
    return postODLBody
  }
}

// Add Devices in Subnet from registration process and otherwise
const addDevicesInSubnet = async ( hook , micronetId , subnetId , devices ) => {
  console.log ( '\n addDevicesInSubnet micronetId : ' + JSON.stringify ( micronetId ) + '\t\t subnetId : ' + JSON.stringify ( subnetId ) )
  devices = [].concat ( devices )
  console.log ( '\n addDevicesInSubnet devices : ' + JSON.stringify ( devices ) )
  let formattedDevices = devices.map ( ( device , index ) => {
    console.log ( '\n Current Device : ' + JSON.stringify ( device ) )
    if ( device.hasOwnProperty ( "isRegistered" ) ) {
      console.log ( '\n Device is from registration process ... ' )
      return {
        "device-mac" : device.macAddress ,
        "device-name" : `Test Device` ,  // deviceName not present in Token
        "device-id" : device.deviceId ,
        "device-openflow-port" : 2 // TODO: Add device-openflow-port value from switch config
      }
    }
    else {
      return {
        "device-mac" : device[ "device-mac" ] ,
        "device-name" : device[ "device-name" ] || `Test Device` ,  // deviceName not present in Token
        "device-id" : device[ "device-id" ] ,
        "device-openflow-port" : device[ "device-openflow-port" ]
      }
    }
  } )
  console.log ( '\n FormattedDevices : ' + JSON.stringify ( formattedDevices ) )
  const micronetFromDB = await getMicronet ( hook , {} )
  //console.log ( '\n addDevicesInSubnet micronetFromDB : ' + JSON.stringify ( micronetFromDB ) )

  const micronetToUpdateIndex = micronetId && subnetId ? micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => {
      return (micronetId == micronet[ 'micronet-id' ] && subnetId == micronet[ 'micronet-subnet-id' ])
    } ) : 0
  console.log ( '\n Micronet to Update Index: ' + JSON.stringify ( micronetToUpdateIndex ) )
  const micronetToUpdate = micronetFromDB.micronets.micronet[ micronetToUpdateIndex ]
  const micronetSubnet = micronetToUpdate[ 'micronet-subnet' ]
  console.log ( '\n Micronet-Subnet : ' + JSON.stringify ( micronetSubnet ) )
  // Convert subnetNo string to Int
  const subnetNo = parseInt ( micronetSubnet.split ( '.' )[ 2 ] , 10 );
  console.log ( '\n SubnetNo : ' + JSON.stringify ( subnetNo ) )
  // Remove hard-coded subnetNo laterSubnet to add device to
  const subnetWithDevices = await subnetAllocation.getNewIps ( subnetNo , formattedDevices )
  console.log ( '\n SubnetWithDevices : ' + JSON.stringify ( subnetWithDevices ) )

  const formattedSubnetWithDevices = formattedDevices.map ( ( device , index ) => {
    console.log ( '\n Adding device ' + JSON.stringify ( device ) + '\t\t to formattedSubnetWithDevices ... ' )
    let deviceFromIpAllocator = subnetWithDevices.connectedDevices.map ( ( ipAllocatorDevice ) => {
      if ( ipAllocatorDevice[ 'device-mac' ] == device[ 'device-mac' ] && ipAllocatorDevice[ 'device-name' ] == device[ 'device-name' ] && ipAllocatorDevice[ 'device-id' ] == device[ 'device-id' ] ) {
        return ipAllocatorDevice
      }
    } )
    deviceFromIpAllocator = deviceFromIpAllocator.filter ( Boolean )
    console.log ( '\n Matched deviceFromIpAllocator : ' + JSON.stringify ( deviceFromIpAllocator ) )
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
  console.log ( '\n formattedSubnetWithDevices : ' + JSON.stringify ( formattedSubnetWithDevices ) )
  console.log ( '\n Micronet to update : ' + JSON.stringify ( micronetToUpdate ) )
  const updatedMicronetwithDevices = Object.assign ( {} , micronetToUpdate , { 'connected-devices' : micronetToUpdate[ 'connected-devices' ].concat ( formattedSubnetWithDevices ) } )
  console.log ( '\n UpdatedMicronetwithDevices : ' + JSON.stringify ( updatedMicronetwithDevices ) )

  const postBodyForODL = micronetFromDB
  postBodyForODL.micronets.micronet[ micronetToUpdateIndex ] = updatedMicronetwithDevices
  console.log ( '\n postBodyForODL : ' + JSON.stringify ( postBodyForODL ) )
  return postBodyForODL

}
/* Add Registered devices to existing or new subnet */

/* Adding subnets & devices to DHCP */

const addDhcpSubnets = async ( hook , requestBody ) => {
  console.log ( '\n\n addDhcpSubnets requestBody : ' + JSON.stringify ( requestBody ) )
  const dhcpSubnetsToAdd = requestBody.micronets.micronet.map ( ( micronet , index ) => {
    console.log('\n\n Request Body micro-net : ' + JSON.stringify(micronet['micronet-subnet-id']))
    return {
      class : micronet.class ? micronet.class : micronet.name ,
      subnetId : micronet[ "micronet-subnet-id" ]
    }
  } )
  console.log ( '\n dhcpSubnetsToAdd : ' + JSON.stringify ( dhcpSubnetsToAdd ) )
  const dhcpSubnetLength = dhcpSubnetsToAdd.length
  const micronetFromDB = await getMicronet ( hook , {} )
  const { micronet } = micronetFromDB.micronets
  const registry = await getRegistry ( hook , {} )
  const { websocketUrl , mmUrl, gatewayId } = registry
  console.log ( '\n WebsocketUrl : ' + JSON.stringify ( websocketUrl ) )
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  const { bridges } = odlStaticConfig.switchConfig
  console.log('\n switchConfig bridges : ' + JSON.stringify(bridges))
  const bridge = bridges.map((bridge) => {return bridge})

  // Checks if micronet is added to d/b which indicates successful ODL call.
  let dhcpSubnetsPostBody = dhcpSubnetsToAdd.map ( ( dhcpSubnet , index ) => {
    console.log ('\n\n DHCP SUBNET TO ADD : ' + JSON.stringify ( dhcpSubnet ) + '\t\t INDEX : ' + JSON.stringify ( index ) )
    console.log('\n\n MICRO-NET FROM DB : ' + JSON.stringify(micronet))
    // Original check with class property in request body
    // const matchedMicronetIndex = micronet.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase () && micronet[ "micronet-subnet-id" ].toLowerCase () == dhcpSubnet.subnetId.toLowerCase ()) )
    const matchedMicronetIndex = micronet.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase ()) )
    console.log ( '\n matchedMicronetIndex : ' + JSON.stringify ( matchedMicronetIndex ) )
    return bridges.map((bridge) => {
      console.log('\n Bridge : ' + JSON.stringify(bridge))
      console.log('\n\n micronet[ matchedMicronetIndex ][ "micronet-subnet" ] : ' + JSON.stringify(micronet[ matchedMicronetIndex ][ "micronet-subnet" ]))
      return bridge.ports.map((port) =>
      {
        if(micronet[ matchedMicronetIndex ][ "micronet-subnet" ] == port.subnet &&  matchedMicronetIndex > -1 ) {
          const matchedPortForSubnet = Object.assign( {},{
            ovsBridge: bridge.name,
            ovsPort: port.port,
            interface: port.interface
          })
           console.log('\n Current matchedPortForSubnet : ' + JSON.stringify(matchedPortForSubnet))
            return {
              subnetId : dhcpSubnet.subnetId ,
              ipv4Network : {
                network : micronet[ matchedMicronetIndex ][ "micronet-subnet" ].split ( "/" )[ 0 ] ,
                mask : "255.255.255.0" ,  // TODO : Call IPAllocator to get mask.For /24 its 255.255.255.0
                gateway : micronet[ matchedMicronetIndex ][ "micronet-gateway-ip" ]
              },
              ovsBridge: bridge.name,
              ovsPort: port.port,
              interface: port.interface
            }
        }
      })
    })
  })
  console.log ( '\n dhcpSubnetsPostBody : ' + JSON.stringify ( dhcpSubnetsPostBody ) )
  dhcpSubnetsPostBody = flattenArray(dhcpSubnetsPostBody);
  console.log('\n AFTER FLATTEN ARRAY dhcpSubnetsPostBody : ' + JSON.stringify(dhcpSubnetsPostBody))
  dhcpSubnetsPostBody = dhcpSubnetsPostBody.filter((el)=> { return el!=null} )
  console.log ( '\n AFTER REMOVING NULL dhcpSubnetsPostBody : ' + JSON.stringify ( dhcpSubnetsPostBody ) )

  const dhcpSubnets = await axios ( {
    ...apiInit ,
    method : 'get' ,
    url : `${mmUrl}/mm/v1/dhcp/subnets` ,
  } )
  const { subnets } = dhcpSubnets.data.body
  console.log ( '\n Subnets from DHCP Hook : ' + JSON.stringify ( subnets ) )
  const dhcpSubnetPromises = await Promise.all ( dhcpSubnetsPostBody.map ( async ( subnetToPost , index ) => {
    const dhcpSubnetIndex = subnets.findIndex ( ( subnet ) => subnet.subnetId == subnetToPost.subnetId )
    console.log ( '\n dhcpSubnetIndex : ' + JSON.stringify ( dhcpSubnetIndex ) )
    if ( dhcpSubnetIndex == -1 && subnetToPost!=null ) {
      //const dhcpSubnetResponse = await hook.app.service ( '/mm/v1/dhcp/subnets' ).create ( subnetToPost )
      console.log ( '\n DHCP WEB PROXY POST : ' + JSON.stringify ( subnetToPost ) )
      const dhcpSubnetResponse = await axios ( {
        ...apiInit ,
        method : 'POST' ,
        url : `${mmUrl}/mm/v1/dhcp/subnets` ,
        data : subnetToPost
      } )
      console.log ( '\n dhcpSubnetResponse : ' + JSON.stringify ( dhcpSubnetResponse.data ) )
      return dhcpSubnetResponse.data
    }
  } ) )
  console.log ( '\n dhcpSubnetPromises : ' + JSON.stringify ( dhcpSubnetPromises ) )
  return dhcpSubnetPromises
}

const addDhcpDevices = async ( hook , requestBody , micronetId , subnetId ) => {
  console.log ( '\n\n addDhcpDevices requestBody : ' + JSON.stringify ( requestBody ) + '\t\t micronetId : ' + JSON.stringify ( micronetId ) + '\t\t subnetId : ' + JSON.stringify ( subnetId ) )

  const registry = await getRegistry ( hook , {} )
  const { websocketUrl , mmUrl } = registry
  console.log ( '\n Web Socket Url : ' + JSON.stringify ( websocketUrl ) + '\t\t mmUrl for DHCP : ' + JSON.stringify ( mmUrl ) )

  // Check if micronet exists in DB
  const micronetFromDB = await getMicronet ( hook , {} )
  // Original check with class property in request body
  // const micronetIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId && micronet[ "micronet-subnet-id" ] == subnetId )
  const micronetIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId )
  console.log ( '\n micronetIndex : ' + JSON.stringify ( micronetIndex ) )
  // Construct POST DHCP Device body
  let dhcpDevicesPostBody = requestBody.micronets.micronet.map ( ( micronet , index ) => {
    console.log ( '\n Micronet from request body : ' + JSON.stringify ( micronet ) )
    const connectedDevices = micronet[ "connected-devices" ]
    console.log ( '\n connectedDevices from request body : ' + JSON.stringify ( connectedDevices ) )
    return connectedDevices.map ( ( device , index ) => {
      console.log ( '\n Current device from request body : ' + JSON.stringify ( device ) )
      const deviceFromDbIndex = micronetFromDB.micronets.micronet[ micronetIndex ][ "connected-devices" ].findIndex ( ( deviceFromDB ) => deviceFromDB[ 'device-mac' ] == device[ 'device-mac' ] )
      console.log ( '\n deviceFromDbIndex : ' + JSON.stringify ( deviceFromDbIndex ) )
      const deviceFromDb = micronetFromDB.micronets.micronet[ micronetIndex ][ "connected-devices" ][ deviceFromDbIndex ]
      const dhcpDeviceIp = deviceFromDb[ 'device-ip' ]
      console.log ( '\n dhcpDeviceIp : ' + JSON.stringify ( dhcpDeviceIp ) )
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
  console.log ( '\n dhcpDevicesPostBody : ' + JSON.stringify ( dhcpDevicesPostBody ) )

  if ( micronetIndex > -1 ) {
    // Check if subnet exists in DHCP Gateway
    const dhcpSubnet = await axios ( {
      ...apiInit ,
      method : 'get' ,
      url : `${mmUrl}/mm/v1/dhcp/subnets/${subnetId}` ,
    } )
    const { subnet } = dhcpSubnet.data.body
    if ( subnet.subnetId == subnetId ) {
      console.log ( '\n DHCP Subnet Found.Check device does not exist : ' )
      const dhcpSubnetDevices = await axios ( {
        ...apiInit ,
        method : 'get' ,
        url : `${mmUrl}/mm/v1/dhcp/subnets/${subnetId}/devices` ,
      } )
      console.log ( '\n DHCP Subnet Devices : ' + JSON.stringify ( dhcpSubnetDevices.data ) )
      const dhcpDevicePromises = await Promise.all ( dhcpDevicesPostBody.map ( async ( dhcpDevice , index ) => {
        // Check DHCP device to add does not exist in DHCP Subnet
        const devicePresentIndex = dhcpSubnetDevices.data.body.devices.findIndex ( ( subnetDevice ) => subnetDevice.deviceId == dhcpDevice.deviceId )
        console.log ( '\n isDevicePresentIndex : ' + JSON.stringify ( devicePresentIndex ) )
        if ( devicePresentIndex == -1 ) {
          console.log ( '\n DHCP Device not found . Add device' )
          const dhcpDeviceToAdd = await axios ( {
            ...apiInit ,
            method : 'POST' ,
            url : `${mmUrl}/mm/v1/dhcp/subnets/${subnetId}/devices` ,
            data : dhcpDevice
          } )
          console.log ( '\n DHCP Response for adding device : ' + JSON.stringify ( dhcpDeviceToAdd.data ) )
          return dhcpDeviceToAdd.data
        }
      } ) )
      return dhcpDevicePromises
    }
  }
}

const deleteDhcpSubnets = async ( hook , micronet , micronetId ) => {
  console.log ( '\n\n deleteDhcpSubnets micronet : ' + JSON.stringify ( micronet ) + '\t\t micronetId : ' + JSON.stringify ( micronetId ) )

  const registry = await getRegistry ( hook , {} )
  const { websocketUrl } = registry
  console.log ( '\n WebsocketUrl : ' + JSON.stringify ( websocketUrl ) )

  // Single micronet was deleted
  if ( micronetId != undefined && Object.keys ( micronet ).length > 0 ) {

    // Get the associated subnetId and name of micronet
    const micronetFromDB = await getMicronet ( hook , {} )
    const subnetId = micronet[ "micronet-subnet-id" ]

    // Delete DHCP Subnet
    dw.connect ( websocketUrl ).then ( async () => {
      console.log ( '\n Deleting dhcp subnet ' + JSON.stringify ( subnetId ) )
      let dhcpSubnet = await dw.send ( {} , "GET" , "subnet" , subnetId )
      console.log ( '\n\n DHCP Subnet : ' + JSON.stringify ( dhcpSubnet ) )
      // Dhcp Subnet Present check
      if ( dhcpSubnet.status == 200 ) {
        let dhcpSubnetDelete = await dw.send ( {} , "DELETE" , "subnet" , subnetId )
        console.log ( '\n deleteDhcpSubnets single subnet : ' + JSON.stringify ( dhcpSubnetDelete ) )
        return dhcpSubnetDelete
      }
    } )
  }

  // All micronets were deleted
  if ( Object.keys ( micronet ).length == 0 && micronetId == undefined ) {
    dw.connect ( websocketUrl ).then ( async () => {
      console.log ( '\n Deleting all dhcp subnets ' )
      let dhcpSubnets = await dw.send ( {} , "GET" , "subnet" )
      console.log ( '\n\n All DHCP Subnets : ' + JSON.stringify ( dhcpSubnets ) )
      // Dhcp Subnets Present check
      if ( dhcpSubnets.status == 200 ) {
        let dhcpSubnetsDelete = await dw.send ( {} , "DELETE" , "subnet" )
        console.log ( '\n deleteDhcpSubnets all subnets : ' + JSON.stringify ( dhcpSubnetDelete ) )
        return dhcpSubnetsDelete
      }
    } )
  }
}

const deleteDhcpDevices = async ( hook , requestBody ) => {
  const registry = await getRegistry ( hook , {} )
  const { websocketUrl } = registry
  console.log ( '\n WebsocketUrl : ' + JSON.stringify ( websocketUrl ) )
}

/* Adding subnets & devices to DHCP */

module.exports = {
  before : {
    all : [ // authenticate('jwt')
    ] ,
    find : [
      hook => {
        const { data , params , id } = hook;
      }
    ] ,
    get : [
      hook => {
        const { data , params , id } = hook;
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }
        const query = Object.assign ( { 'micronet-id' : id ? id.micronetId : params.micronetId } , hook.params.query );
        console.log ( '\n Get Hook ID : ' + JSON.stringify ( id ) + '\t\t DATA : ' + JSON.stringify ( data ) + '\t\t PARAMS : ' + JSON.stringify ( params ) + '\t\t QUERY : ' + JSON.stringify ( query ) )
        return hook.app.service ( '/mm/v1/micronets' ).find ( query )
          .then ( ( { data } ) => {
            hook.result = omitMeta ( data[ 0 ] );
            console.log ( '\n Get Hook Result : ' + JSON.stringify ( hook.result ) )
            Promise.resolve ( hook )
          } )
      }
    ] ,
    create : [
      async hook => {
        const { params , id, data } = hook;
        const micronetFromDB = await getMicronet ( hook , {} )
        // console.log('\n\n CREATE MICRO-NETS HOOK PARAMS : ' + JSON.stringify(params) + '\t\t\t ID : ' + JSON.stringify(id) + '\t\t\t DATA : ' + JSON.stringify(data))
        if ( micronetFromDB ) {
          hook.id = micronetFromDB._id
          console.log ( '\n Hook.id for patch : ' + JSON.stringify ( micronetFromDB._id ) )
        }

        /* User created. Initialize micronets object */
        // TODO : Create micronet when user is created
        if ( hook.data && hook.data.type == 'userCreate' ) {
          const { type , id, ssid, name } = hook.data
          console.log ( '\n USER CREATE EVENT DETECTED . TYPE .... : ' + JSON.stringify ( type ) + '\t\t ID : ' + JSON.stringify ( id ) )
          // Create Micronets object
          hook.data = Object.assign ( {} , {
            id : id ,
            name : name ,
            ssid : ssid ,
            micronets : Object.assign ( {} , {
              micronet : []
            } )
          } )
          return Promise.resolve ( hook )
        }

         if ( hook.data && hook.data.type == 'userDeviceRegistered' ) {
          console.log ( '\n User Device Registered event detected.Adding device to new or existing subnet for data .. : ' + JSON.stringify ( hook.data ) )
          const { type , data } = hook.data
          const { subscriberId , device } = data
          const micronetFromDB = await getMicronet ( hook , {} )
          console.log ( '\n micronetFromDB._id for patch : ' + JSON.stringify ( micronetFromDB._id ) )
          const odlPostBody = await upsertRegisteredDeviceToMicronet ( hook , hook.data )
          // const odlResponse = await odlOperationsForUpserts ( hook , odlPostBody )
          // FAKE ODL API's
          const odlResponse = await mockOdlOperationsForUpserts( hook , odlPostBody )
          console.log('\n ')
          if ( odlResponse.data ) {
            const odlResponseData =  odlResponse.data
            const patchRequestData =  (odlResponseData.hasOwnProperty('id') && odlResponseData.hasOwnProperty('name') && odlResponseData.hasOwnProperty('micronets')) ? odlResponseData.micronets.micronet.micronets.micronet
              : ( odlResponseData.hasOwnProperty('micronets') && !odlResponseData.hasOwnProperty('name')) ? odlResponseData.micronets.micronet : odlResponseData
            console.log('\n userDeviceRegistered patchRequestData : ' + JSON.stringify(patchRequestData))
            const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
              {
                id : micronetFromDB.id ,
                name : micronetFromDB.name ,
                ssid : micronetFromDB.ssid ,
                micronets : { micronet : patchRequestData }
              } ,
              { query : {} , mongoose : { upsert : true } } )
            console.log ( '\n CREATE HOOK ADD SUBNET PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )
            if(patchResult) {
              console.log ( '\n MICRONET ADDED.ADDING SUBNETS TO DHCP GATEWAY ... ' )
               const dhcpSubnetPostBody = Object.assign({},{
                 micronets:{
                   micronet: [ Object.assign({},{
                       name: device.class,
                      "micronet-subnet-id": device.class,
                      "connected-devices":[]
                   })
                   ]
                 }
               })
              const dhcpSubnet = await addDhcpSubnets(hook,dhcpSubnetPostBody)
              console.log('\n dhcpSubnet : ' + JSON.stringify(dhcpSubnet.body))
              if(dhcpSubnet) {
                const dhcpDevicePostBody = Object.assign({},{
                  micronets:{
                    micronet: [ Object.assign({},{
                      "connected-devices": [ Object.assign({}, {
                        "device-mac": device.macAddress,
                        "device-openflow-port": "4",
                        "device-name": "Test Device", // TODO : Add Device Name
                        "device-id": device.deviceId
                      })]
                    })]
                  }})
                const micronetIndex = patchRequestData.findIndex((micronet) => micronet.class == device.class)
                const micronetId = patchRequestData[micronetIndex]['micronet-id']
                console.log('\n micronetIndex : ' + JSON.stringify(micronetIndex) + '\t\t\t micronetId : ' + JSON.stringify(micronetId))
                const dhcpAddDevice = await addDhcpDevices(hook,dhcpDevicePostBody,micronetId, device.class)
                console.log('\n dhcpAdddDevice : ' + JSON.stringify(dhcpAddDevice.body))
              }
              hook.result = patchResult
              return Promise.resolve ( hook )
            }
          }
        }

        else {
          const { req } = hook.data
          const { body , originalUrl , method , path } = req
          const micronetFromDB = await getMicronet ( hook , {} )

          if ( originalUrl.toString () == '/mm/v1/micronets/init' ) {
            console.log ( '\n INCOMING REQUEST BODY  : ' + JSON.stringify ( body ) )
            console.log ( '\n\n URL : ' + JSON.stringify ( originalUrl ) )
            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              console.log ( '\n isGatewayAlive : ' + JSON.stringify ( isGtwyAlive ) + '\t\t isGatewayConnected : ' + JSON.stringify ( isGatewayConnected ) + '\t\t isODLAlive : ' + JSON.stringify ( isOdlAlive ) )
              const postBodyForODL = await populatePostObj ( hook , body )

              console.log ( '\n CREATE HOOK INIT OBTAINED POST BODY : ' + JSON.stringify ( postBodyForODL ) )

              const odlResponse = await initializeMicronets ( hook , postBodyForODL )
              console.log ( '\n CREATE MICRO-NET INIT HOOK RESULT : ' + JSON.stringify ( odlResponse ) )

              /* ODL CALLS */
              const { status , data } = odlResponse
              if ( data && status == 201 ) {
                console.log ( '\n CREATE HOOK ODL OPERATIONAL RESPONSE DATA : ' + JSON.stringify ( data ) )
                // const dbUpdateResult = await updateMicronetModel ( hook , odlResponse.data )
                // console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
                const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
                  {
                    id : micronetFromDB.id ,
                    name : micronetFromDB.name ,
                    ssid : micronetFromDB.ssid ,
                    micronets : data.micronets
                  } ,
                  { query : {} , mongoose : { upsert : true } } );
                console.log ( '\n CREATE HOOK INIT PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )
                if ( patchResult ) {
                  console.log ( '\n INIT MICRONET ADDED.ADDING SUBNETS TO DHCP GATEWAY ... ' )
                  const dhcpSubnets = await addDhcpSubnets ( hook , body )
                  console.log ( '\n OBTAINED DHCP SUBNETS IN CREATE HOOK : ' + JSON.stringify ( dhcpSubnets ) )
                  hook.result = patchResult
                  return Promise.resolve ( hook )
                }
                hook.result = patchResult
                return Promise.resolve ( hook )
              }
              /* ODL CALLS */

              return Promise.resolve ( hook )
            }

          }

          if ( originalUrl.toString () == `/mm/v1/micronets/subnets` ) {
            const { data , id } = hook;
            const { req } = hook.data
            const micronetFromDB = await getMicronet ( hook , {} )
            // console.log ( '\n CREATE micronetFromDB : ' + JSON.stringify ( micronetFromDB ) )
            hook.id = micronetFromDB._id
            console.log ( '\n HOOK.ID FOR DB UPSERTS : ' + JSON.stringify ( hook.id ) )
            const { body , originalUrl , method , path , params } = req

            console.log ( '\n CREATE HOOK REQ POST BODY : ' + JSON.stringify ( body ) + '\t\t REQ-URL : ' + JSON.stringify ( originalUrl ) + '\t  METHOD : ' + JSON.stringify ( method ) + '\t PATH : ' + JSON.stringify ( path ) + '\t PARAMS : ' + JSON.stringify ( params ) )

            hook.params.mongoose = {
              runValidators : true ,
              setDefaultsOnInsert : true
            }

            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {

              console.log ( '\n isGatewayAlive : ' + JSON.stringify ( isGtwyAlive ) + '\t\t isGatewayConnected : ' + JSON.stringify ( isGatewayConnected ) + '\t\t isODLAlive : ' + JSON.stringify ( isOdlAlive ) )
              const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , body )
              console.log ( '\n ADD SUBNET TO MICRO-NET PostBodyForODL : ' + JSON.stringify ( postBodyForODL ) + '\t\t addSubnet Flag : ' + JSON.stringify ( addSubnet ) )
              // Call ODL and DHCP to add subnets
              if ( addSubnet ) {
                // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
                const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL )
                /* Update DB with ODL Response */
                if ( odlResponse.data && odlResponse.status == 201 ) {
                  console.log ( '\n ODL Response : ' + JSON.stringify ( odlResponse ) )
                  // const dbUpdateResult = await updateMicronetModel ( hook , odlResponse.data )
                  // console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
                  const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( hook.id ,
                    {
                      id : micronetFromDB.id ,
                      name : micronetFromDB.name ,
                      ssid : micronetFromDB.ssid ,
                      micronets : { micronet : odlResponse.data.micronets.micronet }
                    } ,
                    { query : {} , mongoose : { upsert : true } } );
                  console.log ( '\n CREATE HOOK ADD SUBNET PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )

                  if ( patchResult ) {
                    console.log ( '\n MICRONET ADDED.ADDING SUBNETS TO DHCP GATEWAY ... ' )
                    const dhcpSubnets = await addDhcpSubnets ( hook , body )
                    console.log ( '\n OBTAINED DHCP SUBNETS IN CREATE HOOK : ' + JSON.stringify ( dhcpSubnets ) )
                    hook.result = patchResult
                    return Promise.resolve ( hook )
                  }
                }
              }
              else {
                console.log ( '\n Subnets already Present.Get data from database ... ' )
                hook.result = await  hook.app.service ( '/mm/v1/micronets' ).get ( null )
                return Promise.resolve ( hook )
              }
            }
          }

          if ( originalUrl.toString () == `/mm/v1/micronets/${req.params.micronetId}/subnets/${req.params.subnetId}/devices` ) {
            console.log ( '\n\n URL : ' + JSON.stringify ( originalUrl ) )
            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              console.log ( '\n isGatewayAlive : ' + JSON.stringify ( isGtwyAlive ) + '\t\t isGatewayConnected : ' + JSON.stringify ( isGatewayConnected ) + '\t\t isODLAlive : ' + JSON.stringify ( isOdlAlive ) )
              const postBody = hook.data.req.body
              console.log ( '\n POST BODY ADD DEVICE TO MICRONET : ' + JSON.stringify ( postBody ) )

              // Retreive all devices in micronet
              const micronetFromDB = await getMicronet ( hook , {} )
              const micronetToUpdateIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => (micronet[ "micronet-id" ] == req.params.micronetId && micronet[ "micronet-subnet-id" ] == req.params.subnetId) )
              const presentDevices = micronetFromDB.micronets.micronet[ micronetToUpdateIndex ]
              console.log ( '\n Present devices in micronet : ' + JSON.stringify ( presentDevices ) )
              const devicesToAddFromPost = postBody.micronets.micronet[ 0 ][ 'connected-devices' ]
              console.log ( '\n Devices to add from post  : ' + JSON.stringify ( devicesToAddFromPost ) )

              // Check if device is present in subnet or not
              let devicesToAdd = devicesToAddFromPost.map ( ( deviceToAddFromPost , index ) => {
                console.log ( '\n DeviceToAddFromPost : ' + JSON.stringify ( deviceToAddFromPost ) )
                const isDevicePresentIndex = presentDevices[ "connected-devices" ].findIndex ( ( presentDevice ) =>
                  presentDevice[ "device-mac" ] == deviceToAddFromPost[ "device-mac" ] && presentDevice[ "device-id" ] == deviceToAddFromPost[ "device-id" ] && presentDevice[ "device-name" ] == deviceToAddFromPost[ "device-name" ] )
                console.log ( '\n isDevicePresentIndex : ' + JSON.stringify ( isDevicePresentIndex ) )
                if ( isDevicePresentIndex == -1 ) {
                  console.log ( '\n Device not present ...' )
                  return deviceToAddFromPost
                }
              } )
              devicesToAdd = devicesToAdd.filter ( Boolean )
              console.log ( '\n DEVICES TO ADD : ' + JSON.stringify ( devicesToAdd ) + '\t\t LENGTH : ' + JSON.stringify ( devicesToAdd.length ) )
              if ( devicesToAdd.length > 0 ) {
                const postBodyForODL = await addDevicesInSubnet ( hook , req.params.micronetId , req.params.subnetId , devicesToAdd )
                console.log ( '\n addDevicesInSubnet postBodyForODL  : ' + JSON.stringify ( postBodyForODL ) )
                // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
                const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , req.params.micronetId , req.params.subnetId )
                if ( odlResponse.status == 201 && odlResponse.data ) {
                  console.log ( '\n ODL Response : ' + JSON.stringify ( odlResponse ) )
                  // const dbUpdateResult = await updateMicronetModel ( hook , odlResponse.data )
                  // console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
                  const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
                    {
                      id : micronetFromDB.id ,
                      name : micronetFromDB.name ,
                      ssid : micronetFromDB.ssid ,
                      micronets : odlResponse.data.micronets
                    } ,
                    { query : {} , mongoose : { upsert : true } } );
                  console.log ( '\n CREATE HOOK ADD DEVICES TO SUBNET PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )
                  if ( patchResult ) {
                    const addedDhcpDevices = await addDhcpDevices ( hook , body , req.params.micronetId , req.params.subnetId )
                    console.log ( '\n Added DHCP Devices : ' + JSON.stringify ( addedDhcpDevices ) )
                  }
                  hook.result = patchResult
                  return Promise.resolve ( hook );
                }
              }
              if ( devicesToAdd.length == 0 ) {
                console.log ( '\n Device already present in subnet ...' )
                hook.result = hook.app.service ( '/mm/v1/micronets' ).get ( null )
                return Promise.resolve ( hook );
              }

            }
          }

          // Temporary Test
          // if ( originalUrl.toString () == '/mm/v1/micronets/subnets/testdhcp' ) {
          //   console.log ( '\n test dhcp add device temp url' )
          //   const subnetId = "WIRED_enp4s0"
          //   const micronetId = "1534270984"
          //   const addedDhcpDevices = await addDhcpDevices ( hook , body , micronetId , subnetId )
          //   console.log ( '\n Added DHCP Devices : ' + JSON.stringify ( addedDhcpDevices ) )
          // }

        }
      }
    ] ,
    update : [] ,
    patch : [
      async ( hook ) => {
        const { data , id } = hook;
        console.log ( '\n PATCH HOOK DATA : ' + JSON.stringify ( data ) + '\t ID : ' + JSON.stringify ( id ) )
        hook.data = data
        return Promise.resolve ( hook )
      }
    ] ,
    remove : [
      async ( hook ) => {
        const { data , id , params } = hook;
        const registry = await getRegistry ( hook , {} )
        const { odlUrl , mmUrl } = registry
        console.log ( '\n DELETE HOOK DATA : ' + JSON.stringify ( data ) + '\t\t ID : ' + JSON.stringify ( id ) )
        let postBodyForDelete = [] , micronetToDelete = {}
        // ODL and Gateway checks
        const isGtwyAlive = await isGatewayAlive ( hook )
        const isOdlAlive = await isODLAlive ( hook )
        const isGatewayConnected = await connectToGateway ( hook )
        console.log ( '\n\n DELETE HOOK isGtwyAlive : ' + JSON.stringify ( isGtwyAlive ) + '\t\t\t isOdlAlive : ' + JSON.stringify ( isOdlAlive ) + '\t\t\t isGatewayConnected : ' + JSON.stringify ( isGatewayConnected ) )
        if ( isGtwyAlive && isOdlAlive && isGatewayConnected ) {

          // Delete single micro-net
          if ( hook.id ) {
            console.log ( '\n DELETE MICRONET BY ID ' + JSON.stringify ( hook.id ) )
            const micronetFromDB = await getMicronet ( hook , {} )
            const { micronet } = micronetFromDB.micronets
            const micronetToDeleteIndex = micronet.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == hook.id )
            console.log ( '\n micronetToDeleteIndex : ' + JSON.stringify ( micronetToDeleteIndex ) )

            // Valid index. Micronet exists
            if ( micronetToDeleteIndex > -1 ) {
              micronetToDelete = micronet[ micronetToDeleteIndex ]
              postBodyForDelete = micronet.filter ( ( micronet , index ) => index != micronetToDeleteIndex )
              console.log ( '\n POST BODY FOR DELETE : ' + JSON.stringify ( postBodyForDelete ) + '\t\t for hook.id : ' + JSON.stringify ( hook.id ) )
            }
          }

          // Delete all micro-nets

          const micronetFromDB = await getMicronet ( hook , {} )
          const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
            {
              id : micronetFromDB.id ,
              name : micronetFromDB.name ,
              ssid : micronetFromDB.ssid ,
              micronets : { micronet : postBodyForDelete }  // TODO : Add actual response odlResponse.data
            } ,
            { query : {} , mongoose : { upsert : true } } );
          console.log ( '\n DELETE HOOK PATCH RESULT : ' + JSON.stringify ( patchResult ) )
          if ( patchResult ) {
            console.log ( '\n Micro-net deleted from MM DB.Deleting subnets and devices on dhcp ' )
            if ( hook.id ) {
              const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , micronetToDelete , hook.id )
              console.log ( '\n dhcpSubnetsDeletePromise : ' + JSON.stringify ( dhcpSubnetsDeletePromise ) )
              const mockMicronetsDelete = await axios ( {
                ...apiInit ,
                method : 'DELETE' ,
                url : `${mmUrl}/mm/v1/mock/micronets/${hook.id}` ,
                data : Object.assign ( {} , { micronets : { micronet : postBodyForDelete } } )
              } )
              console.log ( '\n\n\n mock Micro-nets Delete : ' + JSON.stringify ( mockMicronetsDelete.data ) )
              // TODO : Add subnet Allocation Delete
            }
            if ( postBodyForDelete.length == 0 && !hook.id ) {
              const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , {} , undefined )
              console.log ( '\n dhcpSubnetsDeletePromise : ' + JSON.stringify ( dhcpSubnetsDeletePromise ) )
              const mockMicronetsDelete = await axios ( {
                ...apiInit ,
                method : 'DELETE' ,
                url : `${mmUrl}/mm/v1/mock/micronets` ,
                data : Object.assign ( {} , { micronets : { micronet : [] } } )
              } )
              console.log ( '\n\n\n mock Micro-nets Delete : ' + JSON.stringify ( mockMicronetsDelete.data ) )
              // TODO : Add subnet Allocation Delete
            }
          }
          hook.result = patchResult
          return Promise.resolve ( hook );

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
        console.log ( '\n PATCH AFTER HOOK DATA : ' + JSON.stringify ( data ) + '\t\t ID : ' + JSON.stringify ( id ) + '\t\t PARAMS : ' + JSON.stringify ( params ) )
        hook.app.service ( '/mm/v1/micronets' ).emit ( 'micronetUpdated' , {
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
