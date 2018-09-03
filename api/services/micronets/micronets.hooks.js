const { authenticate } = require('@feathersjs/authentication').hooks;
const subnetAllocation = require('../../hooks/subnetAllocaiton')
var rn = require('random-number');
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

const getDeviceForSubnet = async (hook,subnetDetails, subnets) => {
  console.log('\n getDeviceForSubnet Passed subnetDetails : ' + JSON.stringify(subnetDetails))
  console.log('\n getDeviceForSubnet Passed subnets : ' + JSON.stringify(subnets))
  const devices =  [
    {
      deviceMac: "b8:27:eb:df:ae:a9",
      deviceName: "pib3",
      deviceId: "Raspberry-Pi3-Model-B-v1.2"
    }]
  const subnetAndDeviceIpData = await subnetAllocation.getNewIps(subnets[0].subnet, devices)
  console.log('\n subnetAndDeviceIpData : ' + JSON.stringify(subnetAndDeviceIpData))
  return subnetAndDeviceIpData
}

const getSubnetAndDeviceIps = async (hook,reqBody) => {
  console.log('\n getSubnetAndDeviceIps hook reqBody : ' + JSON.stringify(reqBody))
  const noOfSubnets = reqBody.micronets.micronet.length
  console.log('\n No of Subnets : ' + JSON.stringify(noOfSubnets))
  const subnetDetails = reqBody.micronets.micronet.map((micronet, index) => {
    return Object.assign ( {} , {
      name : micronet.name ,
      devices : [ Object.assign ( {} , {
        noOfDevices : micronet[ 'connected-devices' ].length ,
        connectDevices: micronet['connected-devices'],
        deviceMac : micronet[ 'connected-devices' ][ 'device-mac' ] ,
        deviceName : micronet[ 'connected-devices' ][ 'device-name' ] ,
        deviceId : micronet[ 'connected-devices' ][ 'device-id' ]
      } )
      ]
    } )
  })
  console.log('\n Subnet Details : ' + JSON.stringify(subnetDetails))
  let subnetsFromIpAllocator = []
  const subnetData1 =  await subnetAllocation.getNewSubnet(rn(options))
  const devices =  [
    {
      deviceMac: "b8:27:eb:df:ae:a9",
      deviceName: "pib3",
      deviceId: "Raspberry-Pi3-Model-B-v1.2"
    }]
 // const subnetAndDeviceIpData = await subnetAllocation.getNewIps(subnetData1, devices)
  // console.log('\n subnetAndDeviceIpData for subnetData1: ' + JSON.stringify(subnetAndDeviceIpData))
  const subnetData2 =  await subnetAllocation.getNewSubnet(rn(options))
  console.log('\n SUBNET DATA 1 : ' + JSON.stringify(subnetData1) + '\t\t\t SUBNET DATA 2 : ' + JSON.stringify(subnetData2))
  const promises =  await Promise.all(subnetDetails.map(async(subnet,index) => {
    console.log('\n Calling IPAllocator for subnet : ' + JSON.stringify(subnet) + '\t\t At Index : ' + JSON.stringify(index))
    const subnets = await subnetAllocation.getNewSubnet(rn(options))
    console.log('\n Subnet Obtained from IPAllocator : ' + JSON.stringify(subnets))
    return Object.assign({},subnets)
  }))
  console.log('\n Obtained promises : ' + JSON.stringify(promises))
  return true
}

function hasProp (obj, prop) {
  console.log('\n hasProp called for prop ' + JSON.stringify(prop) + '\t VALUE : ' + JSON.stringify(Object.prototype.hasOwnProperty.call(obj, prop)))
  return Object.prototype.hasOwnProperty.call(obj, prop);
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


const populatePostObj = async (hook,reqBody) => {
  console.log('\n PopulatePostObj Hook with Request Body : ' + JSON.stringify(reqBody))
  const { micronet } = reqBody.micronets
  const noOfMicronets = micronet.length
  console.log('\n populatePostObj noOfMicro-nets : ' + JSON.stringify(noOfMicronets))
  const odlStaticConfig =  await getOdlConfig(hook,'1234')
  const { switchConfig } = odlStaticConfig
  console.log('\n populatePostObj ODL STATIC CONFIG FROM API  : ' + JSON.stringify(switchConfig))
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
  console.log('\n\n reqBodyWithOdlConfig : ' + JSON.stringify(reqBodyWithOdlConfig))
  const subnetAndDeviceIps = await getSubnetAndDeviceIps(hook,reqBody)
  return true
}

const sanityCheckForMM = async hook => {
  console.log('\n sanityCheckForMM hook')
  return true
}

const populateMMWithOdlResponse = async hook => {
  console.log('\n populateMMWithOdlResponse hook')
  return true
}

const initializeMicronets = async hook => {
  hook.data = Object.assign({},  { message:'Initialize Micronets from another hook ... '})
  console.log('\n Initialize Micro-nets function hook.data : ' + JSON.stringify(hook.data))
  return hook
}

function addMicronetsWithoutDevices(hook) {
  return { message: 'Add micronets without devices called' }
}

function addMicronetsWithDevices(hook) {
  return { message: 'Add micronets with devices called' }
}

module.exports = {
  before: {
    all: [ // authenticate('jwt')
       ],
    find: [],
    get: [],
    create: [
       async hook => {
         const devices =  [
           {
             deviceMac: "b8:27:eb:df:ae:a9",
             deviceName: "pib3",
             deviceId: "Raspberry-Pi3-Model-B-v1.2"
           }]
         const { data, params, id } = hook;
         const { body, originalUrl } = hook.data.data.req
         console.log('\n Printing request body data : ' + JSON.stringify(body))
         if(originalUrl.toString() == '/mm/v1/micronets/init') {
           console.log('\n\n /mm/v1/micronets/init detected')
           const isGatewayUpResult = await isGatewayUp(hook)
           if(isGatewayUp) {
             console.log('\n isGatewayUpResult : ' + JSON.stringify(isGatewayUpResult) + ' Get ODL Static config')
             const odlStaticConfig = await getOdlConfig(hook,"123")
             console.log('\n odlStaticConfig : ' + JSON.stringify(odlStaticConfig) + '\t Now doing subnet allocation')
             const subnetsObj = await getSubnets(hook, body)
             console.log('\n CREATE HOOK SUBNETS : ' + JSON.stringify(subnetsObj))
             const subnetWithDevices = await getDeviceForSubnet(hook, subnetsObj.subnetsDetails, subnetsObj.subnets)
             console.log('\n CREATE HOOK SUBNET-WITH DEVICES : ' + JSON.stringify(subnetWithDevices))
             const odlConfig = await getOdlConfig(hook,'1234')
             console.log('\n\n CREATE HOOK ODL CONFIG : ' + JSON.stringify(odlConfig))
             const postBody = await populatePostObj(hook,body)
             console.log('\n CREATE HOOK OBTAINED POST BODY : ' + JSON.stringify(postBody))
             const result = await initializeMicronets(hook)
             console.log('\n Result : ' + JSON.stringify(result))
             return Promise.resolve(hook);
           }

         }
         if(data.data.req.originalUrl.toString() == '/mm/v1/micronets/123/subnets') {
           console.log('\n\n /mm/v1/micronets/123/subnets ')
         }
         if(data.data.req.originalUrl.toString() == '/mm/v1/micronets/123/subnets/3434/devices') {
           console.log('\n\n /mm/v1/micronets/123/subnets/3434/devices ')
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
