const { authenticate } = require ( '@feathersjs/authentication' ).hooks;
const subnetAllocation = require ( '../../hooks/subnetAllocaiton' )
const micronetWithDevices = require ( '../../mock-data/micronetWithDevices' );
const micronetWithoutDevices = require ( '../../mock-data/micronetWithoutDevices' );
const micronetOperationalConfig = require ( '../../mock-data/micronetsOperationalConfig' );
var rn = require ( 'random-number' );
var async = require ( "async" );
const axios = require ( 'axios' );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
var options = { integer : true }
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );

/* BootStrap Sequence */
const isGatewayAlive = async ( hook ) => {
  console.log ( '\n isGatewayAlive hook ...' )
  return true
}

const connectToGateway = async ( hook ) => {
  console.log ( '\n connectToGateway hook ...' )
  return true
}

const isODLAlive = async ( hook ) => {
  // Poll ODL mn notifications for OVS Manager connection
  console.log ( '\n isODLAlive hook' )
  const odlNotifications = await axios ( {
    ...apiInit ,
    method : 'get' ,
    url : `http://127.0.0.1:3030/mm/v1/mock/restconf/config/micronets-notifications:micronets-notifications` ,
  } )
  console.log ( '\n isODLAlive ODL Notifications : ' + JSON.stringify ( odlNotifications.data ) )
  return true
}
/* BootStrap Sequence */

const getOdlConfig = async ( hook , id ) => {
  console.log ( '\n getOdlConfig hook with passed id : ' + JSON.stringify ( id ) )
  return hook.app.service ( 'odl/v1/micronets/config' ).get ( id )
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

const populateOdlConfig = async ( hook , requestBody , gatewayId ) => {
  console.log ( '\n populateOdlConfig requestBody : ' + JSON.stringify ( requestBody ) )
  console.log ( '\n populateOdlConfig gatewayId : ' + JSON.stringify ( gatewayId ) )
  const { micronet } = requestBody.micronets;
  const odlStaticConfig = await getOdlConfig ( hook , gatewayId )
  const { switchConfig } = odlStaticConfig
  const trunkIndex = switchConfig.bridges.findIndex ( ( bridge ) => bridge.portTrunk == 'trunk' )
  const trunkGatewayPort = switchConfig.bridges[ trunkIndex ]
  const ovsHost = switchConfig.bridges[ trunkIndex ].ovsHost
  const wirelessPortIndex = switchConfig.bridges.findIndex ( ( bridge ) => bridge.portWireless == 'wireless' )
  const wiredPortIndex = switchConfig.bridges.findIndex ( ( bridge ) => bridge.portWired == 'wired' )
  const portWired = wiredPortIndex > -1 ? switchConfig.bridges[ wiredPortIndex ].portBridge : -1
  const portWireless = wirelessPortIndex > -1 ? switchConfig.bridges[ wirelessPortIndex ].portBridge : -1
  console.log ( '\n TrunkGatewayPort : ' + JSON.stringify ( trunkGatewayPort ) + '\t\t OVS Host : ' + JSON.stringify ( ovsHost ) )
  console.log ( '\n Port Wired : ' + JSON.stringify ( portWired ) + '\t\t Port Wireless : ' + JSON.stringify ( portWireless ) )

  console.log ( '\n  ODL STATIC CONFIG FROM API  : ' + JSON.stringify ( switchConfig ) )
  const reqBodyWithOdlConfig = micronet.map ( ( micronet , index ) => {

    return {
      ...micronet ,
      "trunk-gateway-port" : trunkGatewayPort.portTrunk ,
      "trunk-gateway-ip" : ovsHost ,
      "dhcp-server-port" : "" ,
      "dhcp-zone" : switchConfig.bridges[ trunkIndex ].subnet ,  // Maybe this shd be trunkIndex or index
      "ovs-bridge-name" : switchConfig.bridges[ trunkIndex ].bridge ,  //Maybe this shd be trunkIndex or index
      "ovs-manager-ip" : ovsHost
    }
  } )
  return { reqBodyWithOdlConfig , portWireless , portWired }
}

const getSubnet = ( hook , index ) => {
  subnetAllocation.getNewSubnet ( index ).then ( ( subnet ) => {
    return subnet
  } )
}

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
  const subnets = await getSubnetIps ( hook , subnetDetails , requestBody )
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
  const { reqBodyWithOdlConfig , portWired , portWireless } = config
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
        return {
          "device-mac" : device[ "device-mac" ] ,
          "device-ip" : device.deviceIp ,
          "device-openflow-port" : portWired ,
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

const sanityCheckForMM = async hook => {
  return true
}

const populateMMWithOdlResponse = async hook => {
  return true
}

const initializeMicronets = async ( hook , postBody ) => {
  console.log ( '\n InitializeMicronets postBody: ' + JSON.stringify ( postBody ) )
  const micronetFromDB = await getMicronet ( hook , {} )
  hook.data = Object.assign ( {} , {
    id : micronetFromDB.id ,
    name : micronetFromDB.name ,
    ssid : micronetFromDB.ssid , micronets : { micronet : micronetWithoutDevices.micronets }
  } )
  return hook
}

const getMicronet = async ( hook , query ) => {
  // console.log('\n getMicronet query : ' + JSON.stringify(query))
  const micronetFromDb = await hook.app.service ( '/mm/v1/micronets' ).find ( query )
  // console.log('\n Micronet From DB  : ' + JSON.stringify(micronetFromDb.data[0]))
  return micronetFromDb.data[ 0 ]
}

/* ODL Config PUT / GET Calls */

const upsertOdLConfigState = async ( hook , postBody ) => {

  console.log ( '\n upsertOdLConfigState hook postBody : ' + JSON.stringify ( postBody ) )

  /* AXIOS ODL call.Check for Response Code 201 or 200
  const odlConfigResponse = await axios ( {
    ...apiInit ,
    method : 'put' ,
    url : `http://{{odlhost}}:{{odlsocket}}/restconf/config/micronets:micronets` ,
    data: postBody
  })
  */

  const odlConfigResponse = Object.assign ( { response : { statusCode : 201 } } )
  console.log ( '\n upsertOdLConfigState odLConfigResponse : ' + JSON.stringify ( odlConfigResponse ) )
  return odlConfigResponse
}

const fetchOdlOperationalState = async ( hook ) => {
  /* Axios Call
  // URL : http://{{odlhost}}:{{odlsocket}}/restconf/operational/micronets:micronets
  const odlOperationalState = await axios ( {
    ...apiInit ,
    method : 'get' ,
    url : `http://{{odlhost}}:{{odlsocket}}/restconf/operational/micronets:micronets` ,
  } )
  */
  const odlOperationalState = Object.assign ( {} , micronetOperationalConfig )
  console.log ( '\n fetchOdlOperationalState : ' + JSON.stringify ( odlOperationalState ) )
  return odlOperationalState
}

const odlOperationsForUpserts = async ( hook , putBody ) => {
  console.log ( '\n odlOperationsForUpserts hook putBody : ' + JSON.stringify ( putBody ) )
  const odlConfigStateResponse = await upsertOdLConfigState ( hook , putBody )
  console.log ( '\n Obtained odlConfigStateResponse : ' + JSON.stringify ( odlConfigStateResponse ) )
  // Check if status code is 200 / 201 OK
  if ( odlConfigStateResponse ) {
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

  }
  if ( subnetsStatus.notFound.length == 0 ) {
    console.log ( '\n Subnet already present . Do nothing ' )
    postBodyForODL = Object.assign ( {} , { micronets : { micronet : micronetFromDb.micronets.micronet } } )
    console.log ( '\n PostBodyForODL from DB : ' + JSON.stringify ( postBodyForODL ) )
  }
  return postBodyForODL
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

  const micronetFromDB = await getMicronet ( hook , {} )
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
    const postBodyForODL = await upsertSubnetsToMicronet ( hook , postBodyForSubnet )
    console.log ( '\n UpsertRegisteredDeviceToMicronet postBodyForODL : ' + JSON.stringify ( postBodyForODL ) )

    /* ODL API's */
    const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
    if ( odlResponse ) {
      console.log ( '\n UpsertRegisteredDeviceToMicronet odlResponse : ' + JSON.stringify ( odlResponse ) )
      const dbUpdateResult = await updateMicronetModel ( hook , odlResponse )
      console.log ( '\n UpsertRegisteredDeviceToMicronet dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
      const addSubnetPatchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( hook.id ,
        { micronets : { micronet : dbUpdateResult } } ,
        { query : {} , mongoose : { upsert : true } } );
      console.log ( '\n UpsertRegisteredDeviceToMicronet addSubnetPatchResult : ' + JSON.stringify ( addSubnetPatchResult ) )

      // Add device to subnet
      if ( addSubnetPatchResult ) {
        console.log ( '\n Subnet was added ' )
        const micronet = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => (micronet.class == device.class) )
        const postODLBody = await addDevicesInSubnet ( hook , micronet[ 'micronet-id' ] , micronet[ 'micronet-subnet-id' ] , device )
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
  return true
}

const addDevicesInSubnet = async ( hook , micronetId , subnetId , devices ) => {
  console.log ( '\n addDevicesInSubnet micronetId : ' + JSON.stringify ( micronetId ) + '\t\t subnetId : ' + JSON.stringify ( subnetId ) )

  devices = [].concat ( devices )
  console.log ( '\n addDevicesInSubnet devices : ' + JSON.stringify ( devices ) )
  let formattedDevices = devices.map ( ( device , index ) => {
    return {
      deviceMac : device.macAddress ,
      deviceName : device.deviceName || `Test Device ${index}` ,  // deviceName not present in Token
      deviceId : device.deviceId
    }
  } )
  console.log ( '\n FormattedDevices : ' + JSON.stringify ( formattedDevices ) )
  const micronetFromDB = await getMicronet ( hook , {} )
  //console.log ( '\n addDevicesInSubnet micronetFromDB : ' + JSON.stringify ( micronetFromDB ) )
  const micronetToUpdateIndex = micronetFromDB.micronets.micronet.findIndex ( ( micronet ) => {
    return (micronetId == micronet[ 'micronet-id' ] && subnetId == micronet[ 'micronet-subnet-id' ])
  } )
  console.log ( '\n Micronet to Update Index: ' + JSON.stringify ( micronetToUpdateIndex ) )
  const micronetToUpdate = micronetFromDB.micronets.micronet[ micronetToUpdateIndex ]
  const micronetSubnet = micronetToUpdate[ 'micronet-subnet' ]
  console.log ( '\n Micronet-Subnet : ' + JSON.stringify ( micronetSubnet ) )
  const subnetNo = parseInt ( micronetSubnet.split ( '.' )[ 2 ] , 10 );
  console.log ( '\n SubnetNo : ' + JSON.stringify ( subnetNo ) )
  // Remove hard-coded subnetNo later
  const subnetWithDevices = await subnetAllocation.getNewIps ( subnetNo , formattedDevices )
  console.log ( '\n SubnetWithDevices : ' + JSON.stringify ( subnetWithDevices ) )
  const updatedMicronetwithDevices = Object.assign ( {} , micronetToUpdate , { 'connected-devices' : micronetToUpdate[ 'connected-devices' ].concat ( subnetWithDevices.connectedDevices ) } )
  console.log ( '\n UpdatedMicronetwithDevices : ' + JSON.stringify ( updatedMicronetwithDevices ) )

  const postBodyForODL = micronetFromDB
  postBodyForODL.micronets.micronet[ micronetToUpdateIndex ] = updatedMicronetwithDevices
  console.log ( '\n postBodyForODL : ' + JSON.stringify ( postBodyForODL ) )
  return postBodyForODL

}
/* Add Registered devices to existing or new subnet */

module.exports = {
  before : {
    all : [ // authenticate('jwt')
    ] ,
    find : [
      hook => {
        const { data , params , id } = hook;
        console.log ( '\n Before Find Hook ID : ' + JSON.stringify ( id ) + '\t\t DATA : ' + JSON.stringify ( data ) + '\t\t PARAMS : ' + JSON.stringify ( params ) )
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
        console.log ( '\n Get Hook ID : ' + JSON.stringify ( id ) + '\t\t DATA : ' + JSON.stringify ( data ) + '\t\t PARAMS : ' + JSON.stringify ( params ) )
        console.log ( '\n  Get Hook QUERY : ' + JSON.stringify ( query ) )
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
        const { params , id } = hook;
        const micronetFromDB = await getMicronet ( hook , {} )

        if ( micronetFromDB ) {
          hook.id = micronetFromDB._id
          console.log ( '\n Hook.id for patch : ' + JSON.stringify ( micronetFromDB._id ) )
        }

        /* User created.Initialize micrnotes object */
        if ( hook.data && hook.data.type == 'userCreate' ) {
          const { type , data } = hook.data
          console.log ( '\n User Create event detected. TYPE .... : ' + JSON.stringify ( type ) + '\t\t DATA : ' + JSON.stringify ( data ) )
          const query = Object.assign ( { id : data.subscriberId } );
          let user = await hook.app.service ( '/mm/v1/micronets/users' ).find ( { query } )
          user = user.data[ 0 ]
          console.log ( '\n User from db : ' + JSON.stringify ( user ) )
          hook.data = Object.assign ( {} , {
            id : user.id ,
            name : user.name ,
            ssid : user.ssid ,
            micronets : Object.assign ( {} , {
              micronet : []
            } )
          } )
          return Promise.resolve ( hook )
        }

        else if ( hook.data && hook.data.type == 'userDeviceRegistered' ) {
          console.log ( '\n User Device Registered event detected.Adding device to new or existing subnet for data .. : ' + JSON.stringify ( hook.data ) )
          const { type , data } = hook.data
          const { subscriberId , device } = data
          const micronetFromDB = await getMicronet ( hook , {} )
          console.log ( '\n micronetFromDB._id for patch : ' + JSON.stringify ( micronetFromDB._id ) )
          const odlPostBody = await upsertRegisteredDeviceToMicronet ( hook , hook.data )
          const odlResponse = await odlOperationsForUpserts ( hook , odlPostBody )
          if ( odlResponse ) {
            console.log ( '\n PATCH D/b FOR ODL RESPONSE ' )
            console.log ( '\n ODL Response : ' + JSON.stringify ( odlResponse ) )
            const dbUpdateResult = await updateMicronetModel ( hook , odlResponse )
            console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
            const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
              {
                id : micronetFromDB.id ,
                name : micronetFromDB.name ,
                ssid : micronetFromDB.ssid ,
                micronets : { micronet : dbUpdateResult }
              } ,
              { query : {} , mongoose : { upsert : true } } )
            console.log ( '\n CREATE HOOK ADD SUBNET PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )
            hook.result = patchResult
            return Promise.resolve ( hook )
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
              const result = await initializeMicronets ( hook , postBodyForODL )
              console.log ( '\n CREATE MICRO-NET INIT HOOK RESULT : ' + JSON.stringify ( result ) )

              /* ODL CALLS */
              const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
              // if ( odlResponse ) {
              //   // console.log ( '\n odlResponse : ' + JSON.stringify ( odlResponse ) )
              //   const dbUpdateResult = await updateMicronetModel ( hook , odlResponse )
              //   // console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
              //   const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
              //     { id : micronetFromDB.id ,
              //       name : micronetFromDB.name ,
              //       ssid : micronetFromDB.ssid ,
              //       micronets : { micronet : dbUpdateResult } } ,
              //     { query : {} , mongoose : { upsert : true } } );
              //   console.log ( '\n CREATE HOOK INIT PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )
              //   hook.result = patchResult
              //   return Promise.resolve ( hook )
              // }
              /* ODL CALLS */

              return Promise.resolve ( hook )
            }

          }

          if ( originalUrl.toString () == `/mm/v1/micronets/subnets` ) {
            const { data , id } = hook;
            const { req } = hook.data.data
            const micronetFromDB = await getMicronet ( hook , {} )
            // console.log ( '\n CREATE micronetFromDB : ' + JSON.stringify ( micronetFromDB ) )
            hook.id = micronetFromDB._id
            console.log ( '\n HOOK.ID  : ' + JSON.stringify ( hook.id ) )
            const { body , originalUrl , method , path , params } = req

            console.log ( '\n CREATE HOOK BODY : ' + JSON.stringify ( body ) + '\t\t ORIGINAL-URL : ' + JSON.stringify ( originalUrl ) + '\t  METHOD : ' + JSON.stringify ( method ) + '\t PATH : ' + JSON.stringify ( path ) + '\t PARAMS : ' + JSON.stringify ( params ) )

            hook.params.mongoose = {
              runValidators : true ,
              setDefaultsOnInsert : true
            }

            const isGtwyAlive = await isGatewayAlive ( hook )
            const isOdlAlive = await isODLAlive ( hook )
            const isGatewayConnected = await connectToGateway ( hook )
            if ( isGtwyAlive && isGatewayConnected && isOdlAlive ) {
              console.log ( '\n isGatewayAlive : ' + JSON.stringify ( isGtwyAlive ) + '\t\t isGatewayConnected : ' + JSON.stringify ( isGatewayConnected ) + '\t\t isODLAlive : ' + JSON.stringify ( isOdlAlive ) )
              const postBodyForODL = await upsertSubnetsToMicronet ( hook , body )

              console.log ( '\n ADD SUBNET TO MICRO-NET PostBodyForODL : ' + JSON.stringify ( postBodyForODL ) )
              const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
              /* Update DB with ODL Response */
              if ( odlResponse ) {
                console.log ( '\n ODL Response : ' + JSON.stringify ( odlResponse ) )
                const dbUpdateResult = await updateMicronetModel ( hook , odlResponse )
                console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
                const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( hook.id ,
                  {
                    id : micronetFromDB.id ,
                    name : micronetFromDB.name ,
                    ssid : micronetFromDB.ssid ,
                    micronets : { micronet : dbUpdateResult }
                  } ,
                  { query : {} , mongoose : { upsert : true } } );
                console.log ( '\n CREATE HOOK ADD SUBNET PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )
                hook.result = patchResult
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
              console.log ( '\n POST BODY : ' + JSON.stringify ( postBody ) )
              const devices = postBody.micronets.micronet[ 0 ][ 'connected-devices' ]
              console.log ( '\n Devices to add in Subnet : ' + JSON.stringify ( devices ) )
              const postBodyForODL = await addDevicesInSubnet ( hook , req.params.micronetId , req.params.subnetId , devices )
              console.log ( '\n addDevicesInSubnet postBodyForODL  : ' + JSON.stringify ( postBodyForODL ) )
              const odlResponse = await odlOperationsForUpserts ( hook , postBodyForODL )
              if ( odlResponse ) {
                console.log ( '\n ODL Response : ' + JSON.stringify ( odlResponse ) )
                const dbUpdateResult = await updateMicronetModel ( hook , odlResponse )
                console.log ( '\n dbUpdateResult : ' + JSON.stringify ( dbUpdateResult ) )
                const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
                  {
                    id : micronetFromDB.id ,
                    name : micronetFromDB.name ,
                    ssid : micronetFromDB.ssid ,
                    micronets : { micronet : dbUpdateResult }
                  } ,
                  { query : {} , mongoose : { upsert : true } } );
                console.log ( '\n CREATE HOOK ADD DEVICES TO SUBNET PATCH REQUEST RESULT : ' + JSON.stringify ( patchResult ) )
                hook.result = patchResult
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
        console.log ( '\n PATCH HOOK DATA : ' + JSON.stringify ( data ) + '\t ID : ' + JSON.stringify ( id ) )
        hook.data = data
        return Promise.resolve ( hook )
      }
    ] ,
    remove : [
      async ( hook ) => {
        const { data , id , params } = hook;
        console.log ( '\n DELETE HOOK DATA : ' + JSON.stringify ( data ) )
        const odlResponse = await odlOperationsForUpserts ( hook , data )
        console.log ( '\n DELETE HOOK ODL Response : ' + JSON.stringify ( odlResponse ) )
        const micronetFromDB = await getMicronet ( hook , {} )
        if ( odlResponse ) {
          const patchResult = await hook.app.service ( '/mm/v1/micronets' ).patch ( micronetFromDB._id ,
            {
              id : micronetFromDB.id ,
              name : micronetFromDB.name ,
              ssid : micronetFromDB.ssid ,
              micronets : { micronet : [] }
            } , // TODO : Add actual response
            { query : {} , mongoose : { upsert : true } } );
          console.log ( '\n DELETE HOOK PATCH RESULT : ' + JSON.stringify ( patchResult ) )
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
    patch : [] ,
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
