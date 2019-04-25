const omit = require ( 'ramda/src/omit' );
const dw = require('../../hooks/dhcpWrapperPromise')
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt'  , '__v' ] );
const dhcpUrlPrefix = "/mm/v1/dhcp/subnets"
const logger = require ( './../../logger' );

const getRegistry = async(hook,subscriberId) => {
    const registry = await hook.app.service ( '/mm/v1/micronets/registry' ).get ( subscriberId )
    return registry
}

module.exports = {
  before: {
    all: [
       async(hook) => {
         const mano = hook.app.get('mano')
         const registry = await getRegistry(hook,mano.subscriberId)
         const { webSocketUrl } = registry
         const dhcpAddress = await dw.setAddress(webSocketUrl)
         const dhcpConnection = await dw.connect().then(()=> {return true})
    }
    ],
    find: [
      async (hook) => {
        const {params, id, data, path} = hook;
        const {route} = params
        const subnetId = route.hasOwnProperty('id') ? route.id : id
        logger.debug('\n FIND DHCP HOOK ROUTE : ' + JSON.stringify(route) + '\t\t PARAMS : ' + JSON.stringify(params) + '\t\t PATH : ' + JSON.stringify(path) + '\t\t\t ID : ' + JSON.stringify(id) + '\t\t\t DATA : ' + JSON.stringify(data) )
          // Get specific device in subnet
          if((subnetId) && route.deviceId) {
            logger.debug('\n Find specific device in subnet ')
            const dhcpResponse = await dw.send({}, "GET", "device",subnetId,route.deviceId)
            hook.result =  dhcpResponse
            return Promise.resolve(hook)
          }
          // Get all devices in subnet
          if((subnetId) )
          {
            logger.debug('\n Find all devices in subnet ')
            const dhcpResponse = await dw.send({}, "GET", "device",subnetId)
            hook.result =  dhcpResponse
            return Promise.resolve(hook)
          }
          // Get specific subnet
          if ((subnetId) ) {
            logger.debug('\n Find specific subnet ')
            const dhcpResponse = await dw.send({}, "GET", "subnet",subnetId)
            hook.result =  dhcpResponse
            return Promise.resolve(hook)
          }
        // Get all subnets
        if ((!subnetId && !route.deviceId) && path == `mm/v1/dhcp/subnets`) {
          logger.debug('\n Find all subnets ')
          const dhcpResponse = await dw.send({}, "GET","subnet")
          hook.result =  dhcpResponse
          return Promise.resolve(hook)
        }
      }
    ],
    get: [
      async (hook) => {
       const {params, id, data, path} = hook;
       const {route} = params
        const subnetId = route.hasOwnProperty('id') ? route.id : id
        logger.debug('\n GET HOOK Subnet ID : ' + JSON.stringify(subnetId))
        logger.debug('\n GET DHCP HOOK ROUTE : ' + JSON.stringify(route) + '\t\t PARAMS : ' + JSON.stringify(params) + '\t\t PATH : ' + JSON.stringify(path) + '\t\t\t ID : ' + JSON.stringify(id) + '\t\t\t DATA : ' + JSON.stringify(data) )
        // Get specific device in subnet
        if(subnetId && route.deviceId) {
          logger.debug('\n Get specific device in subnet ')
          const dhcpResponse = await dw.send({}, "GET", "device",subnetId,route.deviceId)
          hook.result =  dhcpResponse
          return Promise.resolve(hook)
        }
        // Get all devices in subnet
        // if(subnetId)
        // {
        //   logger.debug('\n Get all devices in subnet ')
        //   const dhcpResponse = await dw.send({}, "GET", "device",subnetId)
        //   hook.result =  dhcpResponse
        //   return Promise.resolve(hook)
        // }
        // Get specific subnet
        if ((subnetId) && path == `mm/v1/dhcp/subnets`) {
          logger.debug('\n Get specific subnet ')
          const dhcpResponse = await dw.send({}, "GET", "subnet",subnetId)
          hook.result =  dhcpResponse
          return Promise.resolve(hook)
        }
        // Get all subnets
        if ((!subnetId && !route.deviceId) && path == `mm/v1/dhcp/subnets`) {
          logger.debug('\n Get all subnets')
          const dhcpResponse = await dw.send({}, "GET","subnet")
          hook.result =  dhcpResponse
          return Promise.resolve(hook)
        }
      }
    ],
    create: [
      async (hook) => {
        const {params, id, data, method} = hook;
        const {route} = params
        const subnetId = route.hasOwnProperty('id') ? route.id : id
        logger.debug('\n CREATE DHCP HOOK ROUTE : ' + JSON.stringify(route) + '\t\t PARAMS : ' + JSON.stringify(params) + '\t\t\t ID : ' + JSON.stringify(id) + '\t\t\t DATA : ' + JSON.stringify(data))
        if(!subnetId && !route.deviceId) {
          const dhcpResponse =  await dw.send({micronet:data}, 'POST')
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        if( subnetId ) {
          const dhcpResponse =  await dw.send({device:data}, 'POST','device',subnetId)
          logger.debug('\n Adding a device dhcpResponse : ' + JSON.stringify(dhcpResponse))
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }
      }
    ],
    update: [
      async(hook) => {
        const { data,id,params } = hook;
        const {route} = params
        const subnetId = route.hasOwnProperty('id') ? route.id : id
        logger.debug('\n UPDATE DHCP HOOK ROUTE : ' + JSON.stringify(route) + '\t\t PARAMS : ' + JSON.stringify(params) + '\t\t\t ID : ' + JSON.stringify(id) + '\t\t\t DATA : ' + JSON.stringify(data))
        // Update existing device in subnet
        if( subnetId && route.deviceId ) {
          const dhcpResponse =  await dw.send({device:data}, 'PUT','device',subnetId, route.deviceId)
          hook.result = dhcpResponse.data
          return Promise.resolve(hook)
        }

        // Update existing subnet
        if(subnetId) {
          const dhcpResponse =  await dw.send({subnet:data}, 'PUT','subnet',subnetId)
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }
      }
    ],
    patch: [
      async(hook) => {
        const { data,id,params } = hook;
      }
    ],
    remove: [
      async(hook) => {
        const { data,id,params, path } = hook;
        const {route} = params
        const subnetId = route.hasOwnProperty('id') ? route.id : id
        logger.debug('\n REMOVE DHCP HOOK ROUTE : ' + JSON.stringify(route) + '\t\t PARAMS : ' + JSON.stringify(params) + '\t\t\t ID : ' + JSON.stringify(id) + '\t\t\t DATA : ' + JSON.stringify(data))
        // Remove specific device in subnet
        if(subnetId && route.deviceId ) {
          const dhcpResponse =  await dw.send({}, 'DELETE','device',subnetId,route.deviceId)
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        // Remove specific subnet
        if(subnetId) {
          const dhcpResponse =  await dw.send({}, 'DELETE','subnet',subnetId)
          hook.result = dhcpResponse
        }

        // Remove all devices in subnet
        if(subnetId) {
          const dhcpResponse =  await dw.send({}, 'DELETE','device',subnetId)
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        // Remove all subnets
        if((( !subnetId && hook.id == null ) && path == 'mm/v1/dhcp/subnets')) {
          const dhcpResponse =  await dw.send({}, 'DELETE','subnet')
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }
    }
    ]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      async (hook) => {
      const { data, id, params } = hook;
        const {subnet} = hook.result.body
        if(subnet) {
          hook.app.service ( '/mm/v1/dhcp/subnets' ).emit ( 'dhcpSubnetCreated' , {
            type : 'dhcpSubnetCreated' ,
            data : Object.assign({},{subnetId:hook.result.body.subnet.subnetId})
          } );
          return hook
        }
        else {
          hook.app.service ( '/mm/v1/dhcp/subnets' ).emit ( 'dhcpDeviceCreated' , {
            type : 'dhcpDeviceCreated' ,
            data : Object.assign({},{device:hook.result.body.device})
          } );
          return hook
        }
      }
    ],
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
