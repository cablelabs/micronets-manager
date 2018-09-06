const { authenticate } = require('@feathersjs/authentication').hooks;
const subnetAllocation = require('../../hooks/subnetAllocaiton')
const micronetWithDevices = require('../../mock-data/micronetWithDevices');
const micronetWithoutDevices = require('../../mock-data/micronetWithoutDevices');
var rn = require('random-number');
var async = require("async");

var options = {
  integer: true
}

const isGatewayUp = async hook => {
  console.log('\n isGatewayUp hook')
  return true
}

const getOdlConfig = async (hook,id) => {
  console.log('\n getOdlConfig hook with passed id : ' + JSON.stringify(id))
  return hook.app.service ( 'odl/v1/micronets/config' ).get (id)
    .then ( (  data  ) => {
      console.log('\n Data from odl config : ' + JSON.stringify(data))
      return data
    })
}

const isOdlStaticConfigPresent = async(hook,reqBody) => {
  console.log('\n isOdlStaticConfigPresent Hook with Request Body : ' + JSON.stringify(reqBody))
  const { micronet } = reqBody.micronets
  const noOfMicronets = micronet.length
  micronet.forEach((micronet, index) => {
    if(hasProp(micronet, 'trunk-gateway-port') && hasProp(micronet, 'trunk-gateway-ip') && hasProp(micronet, 'dhcp-server-port') && hasProp(micronet, 'ovs-bridge-name') && hasProp(micronet, 'ovs-manager-ip') ) {
      console.log('\n Properties found for ODL STATIC CONFIG  ')
      return true
    }
  })
  return false
}

const populateOdlConfig = async (hook,requestBody,gatewayId) => {
  console.log('\n populateOdlConfig requestBody : ' + JSON.stringify(requestBody))
  console.log('\n populateOdlConfig gatewayId : ' + JSON.stringify(gatewayId))
  const { micronet } = requestBody.micronets;
  const odlStaticConfig =  await getOdlConfig(hook,gatewayId)
  const { switchConfig } = odlStaticConfig
  console.log('\n  ODL STATIC CONFIG FROM API  : ' + JSON.stringify(switchConfig))
  const reqBodyWithOdlConfig = micronet.map((micronet, index) => {
    return {
      ...micronet,
      "trunk-gateway-port":switchConfig.bridges[index].portTrunk,
      "trunk-gateway-ip":switchConfig.bridges[index].ovsHost,
      "dhcp-server-port":switchConfig.bridges[index].portBridge,
      "ovs-bridge-name":switchConfig.bridges[index].bridge,
      "ovs-manager-ip":switchConfig.bridges[index].ovsHost
    }
  })
  return reqBodyWithOdlConfig
}


const getSubnets = async (hook,reqBody) => {
  console.log('\n getSubnets hook reqBody : ' + JSON.stringify(reqBody))
  const subnetDetails = reqBody.micronets.micronet.map((micronet, index) => {
    const connectedDevices = micronet['connected-devices' ]
    console.log('\n Micronet connectedDevices : ' + JSON.stringify(connectedDevices) + '\t\t Length : ' + JSON.stringify(connectedDevices.length))
    console.log('\n Micronet connectedDevices device-mac: ' + JSON.stringify(connectedDevices[0]['device-mac']))
    return connectedDevices.map((device, index) => {
      return Object.assign ( {} , {
        name : micronet.name ,
        devices : [ Object.assign ( {} , {
          noOfDevices : micronet[ 'connected-devices' ].length ,
          deviceMac : device ['device-mac' ] ,
          deviceName : device[ 'device-name' ] ,
          deviceId : device[ 'device-id' ]
        } )
        ]
      })
    })
  })

  console.log('\n Subnet Details : ' + JSON.stringify(subnetDetails))

  const promises =  await Promise.all(subnetDetails.map(async(subnet,index) => {
    console.log('\n Calling IPAllocator for subnet : ' + JSON.stringify(subnet) + '\t\t At Index : ' + JSON.stringify(index))
    const subnets = await subnetAllocation.getNewSubnet(rn(options))
    console.log('\n Subnet Obtained from IPAllocator : ' + JSON.stringify(subnets))
    return Object.assign({},subnets)
  }))
  console.log('\n getSubnets Obtained promises : ' + JSON.stringify(promises))
  return { subnetsDetails:subnetDetails, subnets:promises }

}

const getSubnet = async (hook) => {
  const subnet = await subnetAllocation.getNewSubnet(rn(options))
  return subnet
}

const getSubnetIps = async (hook,subnetDetails,requestBody) => {
  console.log('\n GET SUBNET IPs  requestBody : ' + JSON.stringify(requestBody))
  console.log('\n GET SUBNET IPs  subnetDetails : ' + JSON.stringify(subnetDetails))
  const promises =  await Promise.all(subnetDetails.map(async(subnet,index) => {
    console.log('\n Calling IPAllocator for subnet : ' + JSON.stringify(subnet) + '\t\t At Index : ' + JSON.stringify(index))
    const subnets = await subnetAllocation.getNewSubnet(index)
    console.log('\n GET SUBNET IPs Subnet Obtained from IPAllocator : ' + JSON.stringify(subnets))
    return Object.assign({},subnets)
  }))
  console.log('\n GET SUBNET IPs Obtained promises : ' + JSON.stringify(promises))
  return promises

  // return async.map(subnetDetails, async(subnet,index) => {
  //   console.log('\n Calling IPAllocator for subnet : ' + JSON.stringify(subnet))
  //   const subnets = await subnetAllocation.getNewSubnet()
  //   console.log('\n GET SUBNET IPs subnets : ' + JSON.stringify(subnets))
  //   return subnets
  // }, (err, results) => {
  //   if (err) throw err
  //   // results is now an array of the response bodies
  //   console.log('Async Library All Subnets : ' + JSON.stringify(results))
  // })

}

const getDeviceForSubnet = async (hook,subnetDetails, subnets) => {
  subnetDetails = [].concat(...subnetDetails);
  console.log('\n GET DEVICE FOR SUBNET Passed subnetDetails : ' + JSON.stringify(subnetDetails))
  console.log('\n GET DEVICE FOR SUBNET Passed subnets : ' + JSON.stringify(subnets))

  let devicesWithIp = await Promise.all(subnets.map(async(subnet, subnetIndex) => {
    console.log('\n Current Subnet : ' + JSON.stringify(subnet))
   return await Promise.all(subnetDetails.map(async(subnetDetail, subnetDetailIndex) => {
      console.log('\n Current Subnet Details : ' + JSON.stringify(subnetDetail))
      if(subnetDetail.devices.length >= 1) {
        console.log('\n\n subnetDetail.devices.length > 1 loop ')
        const devices = subnetDetail.devices
        console.log('\n All Devices array from Subnet Details : ' + JSON.stringify(devices))
        const subnetAndDeviceIpData = await subnetAllocation.getNewIps(subnet.subnet, devices)
        console.log('\n GET DEVICE FOR SUBNET subnetAndDeviceIpData : ' + JSON.stringify(subnetAndDeviceIpData))
        return {
          ...subnetAndDeviceIpData
        }
      }
    }))
  }))
  devicesWithIp = [].concat(...devicesWithIp)
  console.log('\n GET DEVICE FOR SUBNET devicesWithIp : ' + JSON.stringify(devicesWithIp))
  return devicesWithIp
}

const getSubnetAndDeviceIps = async (hook, requestBody) => {
  console.log('\n GET SUBNET AND DEVICE IPs requestBody : ' + JSON.stringify(requestBody))
  const noOfSubnets = requestBody.length
  console.log('\n No of Subnets : ' + JSON.stringify(noOfSubnets))
  const subnetDetails = requestBody.map((micronet, index) => {
    return Object.assign ( {} , {
      name : micronet.name ,
      devices : micronet['connected-devices']
    })
  })
  console.log('\n GET SUBNET AND DEVICE IPs Subnet Details : ' + JSON.stringify(subnetDetails))
  const subnets = await getSubnetIps(hook,subnetDetails,requestBody)
  console.log('\n GET SUBNET AND DEVICE IPs Obtained subnets : ' + JSON.stringify(subnets))
  /* Add check for devices length in subnetDetails array */
  if(subnets.length > 0) {
     const devicesForSubnets = await getDeviceForSubnet(hook,subnetDetails,subnets)
    return devicesForSubnets
  }
  return subnets
}

function hasProp (obj, prop) {
  console.log('\n hasProp called for prop ' + JSON.stringify(prop) + '\t VALUE : ' + JSON.stringify(Object.prototype.hasOwnProperty.call(obj, prop)))
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

const populatePostObj = async (hook,reqBody) => {
  console.log('\n PopulatePostObj Hook with Request Body : ' + JSON.stringify(reqBody))
  const { micronet } = reqBody.micronets
  const noOfMicronets = micronet.length
  console.log('\n POPULATE POST OBJ noOfMicro-nets : ' + JSON.stringify(noOfMicronets))

  /* Populate ODL Static Config */
  const reqBodyWithOdlConfig  = await populateOdlConfig(hook,reqBody,'1234')
  console.log('\n\n POPULATE POST OBJ reqBodyWithOdlConfig : ' + JSON.stringify(reqBodyWithOdlConfig))

  /* Populate Sub-nets and Devices Config */
  const subnetAndDeviceIps = await getSubnetAndDeviceIps(hook,reqBodyWithOdlConfig)
  console.log('\n POPULATE POST OBJ SUBNET AND DEVICE IPs  : ' + JSON.stringify(subnetAndDeviceIps))
  console.log('\n POPULATE POST OBJ REQUEST BODY WITH ODL CONFIG : ' + JSON.stringify(reqBodyWithOdlConfig))
  let updatedReqPostBody = reqBodyWithOdlConfig.map((reqPostBody, index) => {
    console.log('\n\n reqPostBody : ' + JSON.stringify(reqPostBody))
    return subnetAndDeviceIps.map((subnetWithDevice, subnetIndex) => {
      console.log('\n\n subnetWithDevice : ' + JSON.stringify(subnetWithDevice))
       return {
         ...reqPostBody,
         "micronet-subnet":subnetWithDevice.micronetSubnet,
         "micronet-gateway-ip": subnetWithDevice.micronetGatewayIp,
         "dhcp-zone":subnetWithDevice.micronetSubnet,
         "connected-devices":subnetWithDevice.connectedDevices
       }
    })
  })

  updatedReqPostBody = [].concat(...updatedReqPostBody)
  console.log('\n updatedReqPostBody : ' + JSON.stringify(updatedReqPostBody))
  return updatedReqPostBody
}

const sanityCheckForMM = async hook => {
  console.log('\n sanityCheckForMM hook')
  return true
}

const populateMMWithOdlResponse = async hook => {
  console.log('\n populateMMWithOdlResponse hook')
  return true
}

const initializeMicronets = async (hook, postBody) => {
  console.log('\n Initialize Micro-nets function postBody: ' + JSON.stringify(postBody))
  hook.data = Object.assign({}, {micronets:micronetWithoutDevices.micronets})
  console.log('\n Initialize Micro-nets function hook.data : ' + JSON.stringify(hook.data))
  return hook
}

const addSubnetsToMicronet = async (hook, postBody) => {
  console.log('\n ADD SUBNET TO MICRONET function postBody: ' + JSON.stringify(postBody))
  hook.data = Object.assign({}, {micronets:micronetWithoutDevices.micronets})
  console.log('\n ADD SUBNET TO MICRONET function hook.data : ' + JSON.stringify(hook.data))
  return hook
}

const addDevicesToMicronet = async (hook, postBody) => {
  console.log('\n ADD DEVICES TO MICRONET function postBody: ' + JSON.stringify(postBody))
  hook.data = Object.assign({}, {micronets:micronetWithDevices.micronets})
  console.log('\n ADD DEVICES TO MICRONET function hook.data : ' + JSON.stringify(hook.data))
  return hook
}


module.exports = {
  before: {
    all: [ // authenticate('jwt')
    ],
    find: [],
    get: [],
    create: [
       async hook => {
         const { data, params, id } = hook;
         const { req } = hook.data.data
         const { body, originalUrl, method, path } = req
         console.log('\n Printing request body data : ' + JSON.stringify(body))
         if(originalUrl.toString() == '/mm/v1/micronets/init') {
           console.log('\n\n /mm/v1/micronets/init detected')
           const isGatewayUpResult = await isGatewayUp(hook)
           if(isGatewayUp) {
             console.log('\n isGatewayUpResult : ' + JSON.stringify(isGatewayUpResult) + ' Get ODL Static config')
             const postBody = await populatePostObj(hook,body)
             console.log('\n CREATE HOOK OBTAINED POST BODY : ' + JSON.stringify(postBody))
             const result = await initializeMicronets(hook, postBody)
             console.log('\n CREATE MICRO-NET INIT HOOK RESULT : ' + JSON.stringify(result))
             return Promise.resolve(hook);
           }

         }
         if(originalUrl.toString() == `/mm/v1/micronets/${req.params.micronetId}/subnets`) {
           console.log('\n\n URL : ' + JSON.stringify(`/mm/v1/micronets/${req.params.micronetId}/subnets`) )
           const isGatewayUpResult = await isGatewayUp(hook)
           if(isGatewayUp) {
             console.log('\n isGatewayUpResult : ' + JSON.stringify(isGatewayUpResult) + ' Get ODL Static config')
             const postBody = await populatePostObj(hook,body)
             console.log('\n CREATE HOOK ADD SUBNET TO MICRO-NET OBTAINED POST BODY : ' + JSON.stringify(postBody))
             const result = await addSubnetsToMicronet(hook, postBody)
             console.log('\n CREATE MICRO-NET ADD SUBNET TO MICRO-NET HOOK RESULT : ' + JSON.stringify(result))
             return Promise.resolve(hook);
           }
         }
         if(originalUrl.toString() == `/mm/v1/micronets/${req.params.micronetId}/subnets/${req.params.subnetId}/devices`) {
           console.log('\n\n URL : ' + JSON.stringify(`/mm/v1/micronets/${req.params.micronetId}/subnets/${req.params.subnetId}/devices`) )
           const isGatewayUpResult = await isGatewayUp(hook)
           if(isGatewayUp) {
             console.log('\n isGatewayUpResult : ' + JSON.stringify(isGatewayUpResult) + ' Get ODL Static config')
             const postBody = await populatePostObj(hook,body)
             console.log('\n CREATE HOOK ADD DEVICE TO SUBNET OBTAINED POST BODY : ' + JSON.stringify(postBody))
             const result = await addDevicesToMicronet(hook, postBody)
             console.log('\n CREATE MICRO-NET ADD DEVICE TO SUBNET HOOK RESULT : ' + JSON.stringify(result))
             return Promise.resolve(hook);
           }
         }
       }
    ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
