const omit = require ( 'ramda/src/omit' );
const dw = require('../../hooks/dhcpWrapperPromise')
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt'  , '__v' ] );
const dhcpUrlPrefix = "/mm/v1/dhcp/subnets"


const getRegistryForSubscriber = async ( hook , subscriberId ) => {
  const query = Object.assign ( {} , { subscriberId : subscriberId } , hook.params.query );
  return hook.app.service ( '/mm/v1/micronets/registry' ).find ( query )
    .then ( ( { data } ) => {
      if ( data.length === 1 ) {
        return omitMeta ( data[ 0 ] );
      }
    } )
}

const getRegistry = async(hook,query) => {
    let micronetFromDb = await hook.app.service ( '/mm/v1/micronets' ).find ( query )
    micronetFromDb = micronetFromDb.data[ 0 ]
    const subscriberId = micronetFromDb.id
    const registry = await getRegistryForSubscriber ( hook , subscriberId )
    return registry
}

module.exports = {
  before: {
    all: [
       async(hook) => {
         const registry = await getRegistry(hook,{})
         const { websocketUrl } = registry
         const dhcpAddress = await dw.setAddress(websocketUrl)
         const dhcpConnection = await dw.connect().then(()=> {return true})
    }
    ],
    find: [
      async (hook) => {
        const {params, id, data} = hook;
        return Promise.resolve(hook)
      }
    ],
    get: [
      async (hook) => {
       const {params, id, data} = hook;
       const {url,subnetId, deviceId} = params
          if(params.subnetId) {
            // Get specific device in subnet
            if(params.subnetId && params.deviceId) {
              const dhcpResponse = await dw.send({}, "GET", "device",params.subnetId,params.deviceId)
              hook.result =  dhcpResponse
              return Promise.resolve(hook)
            }
            // Get all devices in subnet
            if(url == `${dhcpUrlPrefix}/${params.subnetId}/devices`)
            {
              const dhcpResponse = await dw.send({}, "GET", "device",params.subnetId)
              hook.result =  dhcpResponse
              return Promise.resolve(hook)
            }
            // Get specific subnet
            else {
              const dhcpResponse = await dw.send({}, "GET", "subnet",params.subnetId)
              hook.result =  dhcpResponse
              return Promise.resolve(hook)
            }
          }
          // Get all subnets
          else {
            const dhcpResponse = await dw.send({}, "GET","subnet")
            hook.result =  dhcpResponse
            return Promise.resolve(hook)
          }
      }
    ],
    create: [
      async (hook) => {
        const {params, id, data} = hook;
        const {query} = params
        const { path , originalUrl , method, body } = data

        if(originalUrl == `${dhcpUrlPrefix}`) {
          const dhcpResponse =  await dw.send({subnet:body}, 'POST')
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        if( query.subnetId && (query.url = `${dhcpUrlPrefix}/${query.subnetId}/devices`)) {
          const dhcpResponse =  await dw.send({device:data}, 'POST','device',query.subnetId)
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }
      }
    ],
    update: [
      async(hook) => {
        const { data,id,params } = hook;
        const {query} = params
        hook.params.mongoose = {
          runValidators: true,
          setDefaultsOnInsert: true
        }

        // Update existing device in subnet
        if( query.subnetId && query.deviceId && (query.url = `${dhcpUrlPrefix}/${query.subnetId}/devices/${query.deviceId}`)) {
          const dhcpResponse =  await dw.send({device:data}, 'PUT','device',query.subnetId, query.deviceId)
          hook.result = dhcpResponse.data
          return Promise.resolve(hook)
        }

        // Update existing subnet
        if(  query.url = `${dhcpUrlPrefix}/${query.subnetId}`) {
          const dhcpResponse =  await dw.send({subnet:data}, 'PUT','subnet',query.subnetId)
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
        const { data,id,params } = hook;
        const {url} = params

        // Remove specific device in subnet
        if(params.subnetId && params.deviceId && url == `${dhcpUrlPrefix}/${params.subnetId}/devices/${params.deviceId}`) {
          const dhcpResponse =  await dw.send({}, 'DELETE','device',params.subnetId,params.deviceId)
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        // Remove specific subnet
        if(params.subnetId && url == `${dhcpUrlPrefix}/${params.subnetId}`) {
          const dhcpResponse =  await dw.send({}, 'DELETE','subnet',params.subnetId)
          hook.result = dhcpResponse
        }

        // Remove all devices in subnet
        if(params.subnetId && url == `${dhcpUrlPrefix}/${params.subnetId}/devices`) {
          const dhcpResponse =  await dw.send({}, 'DELETE','device',params.subnetId)
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        // Remove all subnets
        if( (hook.id == "subnets" || !hook.id || hook.id == null)) {
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
          hook.app.service ( '/mm/v1/dhcp' ).emit ( 'dhcpSubnetCreated' , {
            type : 'dhcpSubnetCreated' ,
            data : Object.assign({},{subnetId:hook.result.body.subnet.subnetId})
          } );
          return hook
        }
        else {
          hook.app.service ( '/mm/v1/dhcp' ).emit ( 'dhcpDeviceCreated' , {
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
