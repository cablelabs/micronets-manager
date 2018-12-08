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
const MUD_URL = "http://45.79.13.192:8888/getFlowRules"

/* BootStrap Sequence */
const isGatewayAlive = async ( hook ) => {
  const registry = await getRegistry ( hook , {} )
  const { websocketUrl } = registry
  await dw.setAddress(websocketUrl)
  const dhcpConnection = await dw.connect().then ( () => { return true } )
  return dhcpConnection
}

const flattenArray = (a) => Array.isArray(a) ? [].concat(...a.map(flattenArray)) : a;

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
  return (data && status == 200) ? true : false

}
/* BootStrap Sequence */

const getOdlConfig = async ( hook , id ) => {
  return hook.app.service ( '/mm/v1/micronets/odl' ).get ( id )
    .then ( ( data ) => { return data } )
}

const getODLSwitchDetails = async ( hook , gatewayId ) => {
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
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
  const { micronet } = requestBody.micronets;
  const { odlStaticConfig , bridgeTrunkIndex , bridgeTrunk , wiredPorts , wirelessPorts , ovsHost , ovsPort , switchConfig } = await getODLSwitchDetails ( hook , gatewayId )
  const reqBodyWithOdlConfig = micronet.map ( ( micronet , index ) => {
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
  const gatewayId = registry.gatewayId
  /* Get gatewayId */

  /* Get SwitchConfig */
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  const { switchConfig } = odlStaticConfig
  /* Get SwitchConfig */

  /* Get Allocated subnets  */
  const micronetFromDB = await getMicronet(hook,{})
  const allocatedSubnetNos = micronetFromDB.micronets.micronet.map((micronet)=> { return (micronet['micronet-subnet']) })

  let wiredSwitchConfigSubnets = switchConfig.bridges.map ( ( bridge ) => {
    // console.log ( '\n Current bridge : ' + JSON.stringify ( bridge.name ) )
    return bridge.ports.map ( ( port , index ) => {
     // console.log('\n\n Port : ' + JSON.stringify(port))
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

  console.log ( '\n GetStaticSubnetIps wiredSwitchConfigSubnets : ' + JSON.stringify ( wiredSwitchConfigSubnets ) + '\t\t wirelessSwitchConfigSubnets : ' + JSON.stringify ( wirelessSwitchConfigSubnets ) )

  // if(wiredSwitchConfigSubnets.length > 0) {
    const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
      let switchConfigSubnetType = subnet.connection == WIRELESS ? wirelessSwitchConfigSubnets : wiredSwitchConfigSubnets
      const subnetNo = parseInt(switchConfigSubnetType[ index ].split ( '.' )[ 2 ])
      const subnets = await subnetAllocation.getNewSubnet ( index , subnetNo )
      return Object.assign ( {} , subnets )
    } ) )
    return promises
 // }


}

/* Get Dynamic Subnet IP's */
const getSubnetIps = async ( hook , subnetDetails , requestBody ) => {
  const promises = await Promise.all ( subnetDetails.map ( async ( subnet , index ) => {
    const subnets = await subnetAllocation.getNewSubnet ( index )
    // console.log ( '\n GET SUBNET IPs Subnets from IPAllocator : ' + JSON.stringify ( subnets ) )
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
  // console.log ( '\n No of Subnets : ' + JSON.stringify ( noOfSubnets ) )
  const subnetDetails = requestBody.map ( ( micronet , index ) => {
    return Object.assign ( {} , {
      name : micronet.name ,
      connection: micronet['device-connection'] || 'wired',
      devices : micronet[ 'connected-devices' ]
    } )
  } )

  // Gets random subnets
  // const subnets = await getSubnetIps ( hook , subnetDetails , requestBody )

  // Gets static subnets
  const subnets = await getStaticSubnetIps ( hook , subnetDetails , requestBody )

  /* Add check for devices length in subnetDetails array */
  let subnetDetailsWithDevices = subnetDetails.map ( ( subnetDetail , index ) => {
    if ( subnetDetail.devices.length >= 1 ) {
      return subnetDetail
    }
  } )

  subnetDetailsWithDevices = subnetDetailsWithDevices.filter ( Boolean )

  /* All Subnets have Devices */
  if ( subnets.length == subnetDetailsWithDevices.length ) {
    const subnetsWithDevices = await getDeviceForSubnet ( hook , subnetDetails , subnets )
    console.log ( '\n All subnets with devices : ' + JSON.stringify ( subnetsWithDevices ) )
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
    // TODO : Maybe add "device-openflow-port" property here
    return allSubnets

  }

  /* No subnets have devices */
  if ( subnets.length > 0 && subnetDetailsWithDevices.length == 0 ) {
    return subnets
  }

}

const getRegistryForSubscriber = async ( hook , subscriberId ) => {
  const query = Object.assign ( {} , { subscriberId : subscriberId } , hook.params.query );
  return hook.app.service ( '/mm/v1/micronets/registry' ).find ( query )
    .then ( ( { data } ) => {
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
  const { micronet } = reqBody.micronets
  const noOfMicronets = micronet.length

  /* Get gatewayId */
  const registry = await getRegistry ( hook )
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

const getMicronet = async ( hook , query ) => {
  const micronetFromDb = await hook.app.service ( '/mm/v1/micronets' ).find ( query )
  return micronetFromDb.data[ 0 ]
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
const mockOdlOperationsForUpserts = async ( hook , requestBody , micronetId , subnetId ) => {
  let postBody = requestBody.hasOwnProperty('micronets') && requestBody.hasOwnProperty('name') && requestBody.hasOwnProperty('id') ? requestBody.micronets.micronet : requestBody
  const registry = await getRegistry ( hook , {} )
  const { mmUrl } = registry
  const mockResponse = await axios ( {
    ...apiInit ,
    method : 'POST' ,
    url : micronetId && subnetId ? `${mmUrl}/mm/v1/mock/micronets/${micronetId}/subnets/${subnetId}/devices` : `${mmUrl}/mm/v1/mock/micronets` ,
    data : Object.assign ( {} , { micronets : { micronet : postBody } } )
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

  const foundMicronet = micronetFromDb.micronets.micronet
  const subnetsFromPost = body.micronets.micronet
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

const upsertSubnetsToMicronet = async ( hook , body ) => {
  let postBodyForODL = []
  const micronetFromDb = await getMicronet ( hook , query = {} )

  // TODO : Add Logic to check with operational state

  const subnetsStatus = await subnetPresentCheck ( hook , body , micronetFromDb )
  if ( subnetsStatus.notFound.length >= 1 ) {
    const subnetsToAdd = await createSubnetInMicronet ( hook , body , subnetsStatus.notFound )
    postBodyForODL = micronetFromDb.micronets.micronet.concat ( subnetsToAdd )
    return { postBodyForODL , addSubnet : true }
  }
  if ( subnetsStatus.notFound.length == 0 ) {
    postBodyForODL = Object.assign ( {} , { micronets : { micronet : micronetFromDb.micronets.micronet } } )
    return { postBodyForODL , addSubnet : false }
  }
}

/* Add Registered devices to existing or new subnet */
const upsertRegisteredDeviceToMicronet = async ( hook , eventData ) => {
  const { type , data } = eventData
  const { subscriberId , device } = data

  let micronetFromDB = await getMicronet ( hook , {} )
  hook.id = micronetFromDB._id
  const existingMicronetClasses = micronetFromDB.micronets.micronet.map ( ( micronet , index ) => {
    return micronet.class
  } )
  const classIndex = existingMicronetClasses.findIndex ( ( className ) => className == device.class )

  /* Add Subnet to Micro-net first */

  if ( classIndex == -1 ) {
    const postBodyForSubnet = Object.assign ( {} , {
      micronets : {
        micronet : [ {
          "name" : device.class ,
          "micronet-subnet-id" : device.class ,
          "device-connection":device.deviceConnection,
          "connected-devices" : []
        } ]
      }
    } )
    const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , postBodyForSubnet )

    /* ODL API's */
    // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
    const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL )
    if ( odlResponse.data && odlResponse.status == 201 ) {
      const addSubnetPatchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( hook.id ,
        { micronets : { micronet : odlResponse.data.micronets.micronet } } ,
        { query : {} , mongoose : { upsert : true } } );

      // Add device to subnet
      if ( addSubnetPatchResult ) {
        micronetFromDB = await getMicronet ( hook , {} )
        const micronetToUpdateIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => (micronet.class == device.class) )
        const micronetToUpdate = micronetFromDB.micronets.micronet[micronetToUpdateIndex]
        const postODLBody = await addDevicesInSubnet ( hook , micronetToUpdate[ 'micronet-id' ] ,micronetToUpdate[ 'micronet-subnet-id' ] , device )
        return postODLBody
      }
    }
  }

  /* Subnet exists.Add device to subnet */
  if ( classIndex > -1 ) {
    // Add device to subnet
    const micronetIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => (micronet.class == device.class) )
    const micronetToUpdate = micronetFromDB.micronets.micronet[ micronetIndex ]
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
  const micronetToUpdateIndex = micronetId && subnetId ? micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => {
    return (micronetId == micronet[ 'micronet-id' ] && subnetId == micronet[ 'micronet-subnet-id' ])
  } ) : 0

  const micronetToUpdate = micronetFromDB.micronets.micronet[ micronetToUpdateIndex ]
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
  postBodyForODL.micronets.micronet[ micronetToUpdateIndex ] = updatedMicronetwithDevices
  return postBodyForODL
}
/* Add Registered devices to existing or new subnet */

/* Adding subnets & devices to DHCP */
const addDhcpSubnets = async ( hook , requestBody ) => {
  const dhcpSubnetsToAdd = requestBody.micronets.micronet.map ( ( micronet , index ) => {
    return {
      class : micronet.class ? micronet.class : micronet.name ,
      subnetId : micronet[ "micronet-subnet-id" ]
    }
  } )
  const dhcpSubnetLength = dhcpSubnetsToAdd.length
  const micronetFromDB = await getMicronet ( hook , {} )
  const { micronet } = micronetFromDB.micronets
  const registry = await getRegistry ( hook , {} )
  const { websocketUrl , mmUrl, gatewayId } = registry
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  const { bridges } = odlStaticConfig.switchConfig
  const bridge = bridges.map((bridge) => {return bridge})

  // Checks if micronet is added to d/b which indicates successful ODL call.
  let dhcpSubnetsPostBody = dhcpSubnetsToAdd.map ( ( dhcpSubnet , index ) => {
    // Original check with class property in request body
    // const matchedMicronetIndex = micronet.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase () && micronet[ "micronet-subnet-id" ].toLowerCase () == dhcpSubnet.subnetId.toLowerCase ()) )
    const matchedMicronetIndex = micronet.findIndex ( ( micronet , index ) => (micronet.class.toLowerCase () == dhcpSubnet.class.toLowerCase ()) )

    return bridges.map((bridge) => {
      return bridge.ports.map((port) =>
      {
        if(micronet[ matchedMicronetIndex ][ "micronet-subnet" ] == port.subnet &&  matchedMicronetIndex > -1 ) {
          const matchedPortForSubnet = Object.assign( {},{
            ovsBridge: bridge.name,
            ovsPort: port.port,
            interface: port.interface
          })
          return {
            subnetId : dhcpSubnet.subnetId ,
            ipv4Network : {
              network : micronet[ matchedMicronetIndex ][ "micronet-subnet" ].split ( "/" )[ 0 ] ,
              mask : "255.255.255.0" ,  // TODO : Call IPAllocator to get mask.For /24 its 255.255.255.0
              gateway : micronet[ matchedMicronetIndex ][ "micronet-gateway-ip" ]
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
    method : 'get' ,
    url : `${mmUrl}/mm/v1/dhcp/subnets` ,
  } )
  const { subnets } = dhcpSubnets.data.body
  const dhcpSubnetPromises = await Promise.all ( dhcpSubnetsPostBody.map ( async ( subnetToPost , index ) => {
    const dhcpSubnetIndex = subnets.findIndex ( ( subnet ) => subnet.subnetId == subnetToPost.subnetId )
    if ( dhcpSubnetIndex == -1 && subnetToPost!=null ) {
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
const upsertDhcpDevicesWithMudConfig = async (hook , dhcpDevicesToUpsert) => {
  // Get MUD Url from users
  let user = await hook.app.service('/mm/v1/micronets/users').find({})
  user = user.data[0]
  let userDevices = user.devices
  let dhcpDevicesWithMudConfig = await Promise.all(dhcpDevicesToUpsert.map(async (dhcpDeviceToUpsert , index) => {
    let userDeviceIndex = userDevices.findIndex((userDevice) => userDevice.macAddress == dhcpDeviceToUpsert.macAddress.eui48 && userDevice.deviceId == dhcpDeviceToUpsert.deviceId)
    let mudUrlForDevice = userDevices[userDeviceIndex].mudUrl
    let mudParserPost = Object.assign({},{
      url:mudUrlForDevice,
      version:"1.1",
      ip:dhcpDeviceToUpsert.networkAddress.ipv4
    })
    // Make MUD Post call
    let mudParserRes = await axios ( {
      method : 'POST' ,
      url : MUD_URL ,
      data : mudParserPost
    } )
    mudParserRes = mudParserRes.data
    // return {... dhcpDevicesToUpsert, ['allowHosts']: mudParserRes.device.allowHosts }
    if(mudParserRes.device.allowHosts.length > 0) {
      dhcpDeviceToUpsert['allowHosts'] = mudParserRes.device.allowHosts
    }
    if(mudParserRes.device.denyHosts.length > 0) {
      dhcpDeviceToUpsert['denyHosts'] = mudParserRes.device.denyHosts
    }
    return dhcpDeviceToUpsert
  }))
  dhcpDevicesWithMudConfig = flattenArray(dhcpDevicesWithMudConfig)
  return dhcpDevicesWithMudConfig
}

// Updates for MUD integration
const addDhcpDevices = async ( hook , requestBody , micronetId , subnetId ) => {
  const registry = await getRegistry ( hook , {} )
  const { websocketUrl , mmUrl } = registry
  // Check if micronet exists in DB
  const micronetFromDB = await getMicronet ( hook , {} )
  // Original check with class property in request body
  // const micronetIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId && micronet[ "micronet-subnet-id" ] == subnetId )
  const micronetIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == micronetId )
  // Construct POST DHCP Device body
  let dhcpDevicesPostBody =  requestBody.micronets.micronet.map ( ( micronet , index ) => {
    const connectedDevices = micronet[ "connected-devices" ]
     return connectedDevices.map ( ( device , index ) => {
      const deviceFromDbIndex = micronetFromDB.micronets.micronet[ micronetIndex ][ "connected-devices" ].findIndex ( ( deviceFromDB ) => deviceFromDB[ 'device-mac' ] == device[ 'device-mac' ] )
      const deviceFromDb = micronetFromDB.micronets.micronet[ micronetIndex ][ "connected-devices" ][ deviceFromDbIndex ]
      console.log('\n\n Device from micronets database : ' + JSON.stringify(deviceFromDb))
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
  console.log('\n\n\n  Dhcp devices post body without MUD : ' + JSON.stringify(dhcpDevicesPostBody))
  dhcpDevicesPostBody = await upsertDhcpDevicesWithMudConfig(hook, dhcpDevicesPostBody)
  console.log('\n\n\n  Dhcp devices post body with MUD : ' + JSON.stringify(dhcpDevicesPostBody))
  if ( micronetIndex > -1 ) {
    // Check if subnet exists in DHCP Gateway
    const dhcpSubnet = await axios ( {
      ...apiInit ,
      method : 'get' ,
      url : `${mmUrl}/mm/v1/dhcp/subnets/${subnetId}` ,
    } )
    const { subnet } = dhcpSubnet.data.body
    if ( subnet.subnetId == subnetId ) {
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

const deleteDhcpSubnets = async ( hook , micronet , micronetId ) => {
  const registry = await getRegistry ( hook , {} )
  const { websocketUrl } = registry

  // Single micronet was deleted
  if ( micronetId != undefined && Object.keys ( micronet ).length > 0 ) {

    // Get the associated subnetId and name of micronet
    const micronetFromDB = await getMicronet ( hook , {} )
    const subnetId = micronet[ "micronet-subnet-id" ]

    // Delete DHCP Subnet
    dw.connect ( websocketUrl ).then ( async () => {
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
    dw.connect ( websocketUrl ).then ( async () => {
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
        return hook.app.service ( '/mm/v1/micronets' ).find ( query )
          .then ( ( { data } ) => {
            hook.result = omitMeta ( data[ 0 ] );
            Promise.resolve ( hook )
          } )
      }
    ] ,
    create : [
      async hook => {
        const { params , id, data, path } = hook;
        const micronetFromDB = await getMicronet ( hook , {} )
        if ( micronetFromDB ) {
          hook.id = micronetFromDB._id
        }
        /* User created. Initialize micronets object */
        if ( hook.data && hook.data.type == 'userCreate' ) {
          const { type , id, ssid, name } = hook.data
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
          const { type , data } = hook.data
          const { subscriberId , device } = data
          const micronetFromDB = await getMicronet ( hook , {} )
          const odlPostBody = await upsertRegisteredDeviceToMicronet ( hook , hook.data )
          // const odlResponse = await odlOperationsForUpserts ( hook , odlPostBody )
          // FAKE ODL API's
          const odlResponse = await mockOdlOperationsForUpserts( hook , odlPostBody )
          console.log('\n ')
          if ( odlResponse.data ) {
            const odlResponseData =  odlResponse.data
            const patchRequestData =  (odlResponseData.hasOwnProperty('id') && odlResponseData.hasOwnProperty('name') && odlResponseData.hasOwnProperty('micronets')) ? odlResponseData.micronets.micronet.micronets.micronet
              : ( odlResponseData.hasOwnProperty('micronets') && !odlResponseData.hasOwnProperty('name')) ? odlResponseData.micronets.micronet : odlResponseData
            const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
              {
                id : micronetFromDB.id ,
                name : micronetFromDB.name ,
                ssid : micronetFromDB.ssid ,
                micronets : { micronet : patchRequestData }
              } ,
              { query : {} , mongoose : { upsert : true } } )
            if(patchResult) {
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
              if(dhcpSubnet) {
                const dhcpDevicePostBody = Object.assign({},{
                  micronets:{
                    micronet: [ Object.assign({},{
                      "connected-devices": [ Object.assign({}, {
                        "device-mac": device.macAddress,
                        "device-openflow-port": "4",
                        "device-name": device.hasOwnProperty('deviceName') ? device.deviceName : "Test Device", // TODO : Add Device Name
                        "device-id": device.deviceId
                      })]
                    })]
                  }})
                const micronetIndex = patchRequestData.findIndex((micronet) => micronet.class == device.class)
                const micronetId = patchRequestData[micronetIndex]['micronet-id']
                const dhcpAddDevice = await addDhcpDevices(hook,dhcpDevicePostBody,micronetId, device.class)
              }
              hook.result = patchResult
              return Promise.resolve ( hook )
            }
          }
        }

        if ( path == `mm/v1/micronets` && !hook.data.req  ) {
          hook.params.mongoose = {
            runValidators : true ,
            setDefaultsOnInsert : true
          }
          const isGtwyAlive = await isGatewayAlive ( hook )
          const isOdlAlive = await isODLAlive ( hook )
          const isGatewayConnected = await connectToGateway ( hook )
          if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
            const { postBodyForODL , addSubnet } = await upsertSubnetsToMicronet ( hook , hook.data )
            // Call ODL and DHCP to add subnets
            if ( addSubnet ) {
              // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
              const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL )
              /* Update DB with ODL Response */
              if ( odlResponse.data && odlResponse.status == 201 ) {
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
                if ( patchResult ) {
                  const dhcpSubnets = await addDhcpSubnets ( hook , hook.data )
                  hook.result = patchResult
                  return Promise.resolve ( hook )
                }
              }
            }
            else {
              hook.result = await  hook.app.service ( '/mm/v1/micronets' ).get ( null )
              return Promise.resolve ( hook )
            }
          }
        }

        if(hook.data.req){
          const { req } = hook.data
          const { body , originalUrl , method , path } = req
          const micronetFromDB = await getMicronet ( hook , {} )

          if ( originalUrl.toString () == '/mm/v1/micronets/init' ) {
            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              const postBodyForODL = await populatePostObj ( hook , body )
              const odlResponse = await initializeMicronets ( hook , postBodyForODL )

              /* ODL CALLS */
              const { status , data } = odlResponse
              if ( data && status == 201 ) {
                const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
                  {
                    id : micronetFromDB.id ,
                    name : micronetFromDB.name ,
                    ssid : micronetFromDB.ssid ,
                    micronets : data.micronets
                  } ,
                  { query : {} , mongoose : { upsert : true } } );

                if ( patchResult ) {
                  const dhcpSubnets = await addDhcpSubnets ( hook , body )
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

          if ( originalUrl.toString () == `/mm/v1/micronets/${req.params.micronetId}/subnets/${req.params.subnetId}/devices` ) {
            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              const postBody = hook.data.req.body
              // Retreive all devices in micronet
              const micronetFromDB = await getMicronet ( hook , {} )
              const micronetToUpdateIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => (micronet[ "micronet-id" ] == req.params.micronetId && micronet[ "micronet-subnet-id" ] == req.params.subnetId) )
              const presentDevices = micronetFromDB.micronets.micronet[ micronetToUpdateIndex ]
              const devicesToAddFromPost = postBody.micronets.micronet[ 0 ][ 'connected-devices' ]

              // Check if device is present in subnet or not
              let devicesToAdd = devicesToAddFromPost.map ( ( deviceToAddFromPost , index ) => {
                const isDevicePresentIndex = presentDevices[ "connected-devices" ].findIndex ( ( presentDevice ) =>
                  presentDevice[ "device-mac" ] == deviceToAddFromPost[ "device-mac" ] && presentDevice[ "device-id" ] == deviceToAddFromPost[ "device-id" ] && presentDevice[ "device-name" ] == deviceToAddFromPost[ "device-name" ] )
                if ( isDevicePresentIndex == -1 ) {
                  return deviceToAddFromPost
                }
              } )
              devicesToAdd = devicesToAdd.filter ( Boolean )
              if ( devicesToAdd.length > 0 ) {
                const postBodyForODL = await addDevicesInSubnet ( hook , req.params.micronetId , req.params.subnetId , devicesToAdd )
                // const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
                const odlResponse = await mockOdlOperationsForUpserts ( hook , postBodyForODL , req.params.micronetId , req.params.subnetId )
                if ( odlResponse.status == 201 && odlResponse.data ) {
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
                  if ( patchResult ) {
                    const addedDhcpDevices = await addDhcpDevices ( hook , body , req.params.micronetId , req.params.subnetId )
                  }
                  hook.result = patchResult
                  return Promise.resolve ( hook );
                }
              }
              if ( devicesToAdd.length == 0 ) {
                hook.result = hook.app.service ( '/mm/v1/micronets' ).get ( null )
                return Promise.resolve ( hook );
              }
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
        const { data , id , params } = hook;
        const registry = await getRegistry ( hook , {} )
        const { odlUrl , mmUrl } = registry
        let postBodyForDelete = [] , micronetToDelete = {}, registeredDevicesToDelete = [] , ipSubnets = []
        // ODL and Gateway checks
        const isGtwyAlive = await isGatewayAlive ( hook )
        const isOdlAlive = await isODLAlive ( hook )
        const isGatewayConnected = await connectToGateway ( hook )
        if ( isGtwyAlive && isOdlAlive && isGatewayConnected ) {

          // Delete single micro-net
          if ( hook.id ) {
            const micronetFromDB = await getMicronet ( hook , {} )
            const { micronet } = micronetFromDB.micronets
            const micronetToDeleteIndex = micronet.findIndex ( ( micronet ) => micronet[ "micronet-id" ] == hook.id )
            // Valid index. Micronet exists
            if ( micronetToDeleteIndex > -1 ) {
              micronetToDelete = micronet[ micronetToDeleteIndex ]
              ipSubnets = [].concat(micronetToDelete['micronet-subnet'].split('.')[2])
              registeredDevicesToDelete = micronetToDelete['connected-devices']
              postBodyForDelete = micronet.filter ( ( micronet , index ) => index != micronetToDeleteIndex )
            }
          }

          // Delete all micro-nets
          const micronetFromDB = await getMicronet ( hook , {} )
          if(ipSubnets.length == 0 ) {
            ipSubnets = micronetFromDB.micronets.micronet.map((micronet)=> {return micronet['micronet-subnet'].split('.')[2]})
          }
          const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
            {
              id : micronetFromDB.id ,
              name : micronetFromDB.name ,
              ssid : micronetFromDB.ssid ,
              micronets : { micronet : postBodyForDelete }  // TODO : Add actual response odlResponse.data
            } ,
            { query : {} , mongoose : { upsert : true } } );

          if ( patchResult ) {
            if ( hook.id ) {
              const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , micronetToDelete , hook.id )
              const mockMicronetsDelete = await axios ( {
                ...apiInit ,
                method : 'DELETE' ,
                url : `${mmUrl}/mm/v1/mock/micronets/${hook.id}` ,
                data : Object.assign ( {} , { micronets : { micronet : postBodyForDelete } } )
              } )

              // Deallocate subnets
              deallocateIPSubnets(hook,ipSubnets)

              let users = await hook.app.service(`/mm/v1/micronets/users`).find({})
              users = users.data[0]
              let updatedDevices = users.devices.map((registeredDevice, index) => {
                const deviceToDeleteIndex = registeredDevicesToDelete.findIndex((deviceFromMicronet) => registeredDevice.macAddress == deviceFromMicronet['device-mac'] && registeredDevice.deviceId == deviceFromMicronet['device-id'])
                if(deviceToDeleteIndex == -1 ) {
                  return registeredDevice
                }
              })
              updatedDevices = updatedDevices.filter(Boolean)
              const userPatchResult = await hook.app.service('/mm/v1/micronets/users/').patch(null, Object.assign({ devices:updatedDevices, deleteRegisteredDevices:true }), { query : {id:users.id} , mongoose : { upsert : true } })
            }
            if ( postBodyForDelete.length == 0 && !hook.id ) {
              const dhcpSubnetsDeletePromise = await deleteDhcpSubnets ( hook , {} , undefined )
              const mockMicronetsDelete = await axios ( {
                ...apiInit ,
                method : 'DELETE' ,
                url : `${mmUrl}/mm/v1/mock/micronets` ,
                data : Object.assign ( {} , { micronets : { micronet : [] } } )
              } )

              // De-allocate subnets
               deallocateIPSubnets(hook,ipSubnets)

              let users = await hook.app.service(`/mm/v1/micronets/users`).find({})
              users = users.data[0]
              let updatedDevices = []
              const userPatchResult = await hook.app.service('/mm/v1/micronets/users').patch(null, Object.assign({ devices:updatedDevices, deleteRegisteredDevices:true }), { query : {id:users.id} , mongoose : { upsert : true } })
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
