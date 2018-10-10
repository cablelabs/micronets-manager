const omit = require ( 'ramda/src/omit' );
const dw = require('../../hooks/dhcpWrapperPromise')
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt'  , '__v' ] );
const dhcpUrlPrefix = "/mm/v1/dhcp/subnets"
// const dhcpConnectionUrl = "wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-0001"
// const dhcpConnectionUrl = "wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-7B2A-BE88-08817Z"

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
         console.log('\n dhcpAddress : ' + JSON.stringify(dhcpAddress))
         const dhcpConnection = await dw.connect().then(()=> {return true})
         console.log('\n ALL HOOK DHCP CONNECTION : ' + JSON.stringify(dhcpConnection) + '\t\t FOR URL : ' + JSON.stringify(websocketUrl))
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
              console.log('\n URL : ' + JSON.stringify(url))
              console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
              hook.result =  dhcpResponse
              return Promise.resolve(hook)
            }
            // Get all devices in subnet
            if(url == `${dhcpUrlPrefix}/${params.subnetId}/devices`)
            {
              const dhcpResponse = await dw.send({}, "GET", "device",params.subnetId)
              console.log('\n GET ALL devices ')
              console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
              hook.result =  dhcpResponse
              return Promise.resolve(hook)
            }
            // Get specific subnet
            else {
              const dhcpResponse = await dw.send({}, "GET", "subnet",params.subnetId)
              console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
              hook.result =  dhcpResponse
              return Promise.resolve(hook)
            }
          }
          // Get all subnets
          else {
            const dhcpResponse = await dw.send({}, "GET","subnet")
            console.log('\n GET ALL SUBNETS DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
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
          console.log('\n  CREATE HOOK ADD SUBNET URL : ' + JSON.stringify(originalUrl) + '\t\t BODY : ' + JSON.stringify(body))
          const dhcpResponse =  await dw.send({subnet:body}, 'POST')
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        if( query.subnetId && (query.url = `${dhcpUrlPrefix}/${query.subnetId}/devices`)) {
          console.log('\n  CREATE HOOK ADD DEVICE TO SUBNET URL  : ' + JSON.stringify(originalUrl) + '\t\t QUERY URL : ' + JSON.stringify(query.url) + '\t\t DATA : ' + JSON.stringify(data))
          const dhcpResponse =  await dw.send({device:data}, 'POST','device',query.subnetId)
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
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
          console.log('\n Update existing device present in a subnet passed data : ' + JSON.stringify(hook.data))
          const dhcpResponse =  await dw.send({device:data}, 'PUT','device',query.subnetId, query.deviceId)
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
          hook.result = dhcpResponse.data
          return Promise.resolve(hook)
        }

        // Update existing subnet
        if(  query.url = `${dhcpUrlPrefix}/${query.subnetId}`) {
          console.log('\n UPDATE HOOK UPDATE EXISTING SUBNET ID : ' + JSON.stringify(id)
            + '\t\t DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params) + '\t\t QUERY.URL : ' + JSON.stringify(query.url))
          const dhcpResponse =  await dw.send({subnet:data}, 'PUT','subnet',query.subnetId)
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }
      }
    ],
    patch: [
      async(hook) => {
        const { data,id,params } = hook;
        console.log('\n PATCH HOOK ID : ' + JSON.stringify(id) + '\t\t DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params))
      }
    ],
    remove: [
      async(hook) => {
        const { data,id,params } = hook;
        const {url} = params
        console.log('\n DELETE HOOK ID : ' + JSON.stringify(id) + '\t\t DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params))
        console.log('\n URL : ' + JSON.stringify(url))

        // Remove specific device in subnet
        if(params.subnetId && params.deviceId && url == `${dhcpUrlPrefix}/${params.subnetId}/devices/${params.deviceId}`) {
          console.log('\n Delete specific device ' + JSON.stringify(params.deviceId) + ' in subnet : ' + JSON.stringify(params.subnetId))
          const dhcpResponse =  await dw.send({}, 'DELETE','device',params.subnetId,params.deviceId)
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        // Remove specific subnet
        if(params.subnetId && url == `${dhcpUrlPrefix}/${params.subnetId}`) {
         console.log('\n Delete specific subnet : ' + JSON.stringify(params.subnetId))
          const dhcpResponse =  await dw.send({}, 'DELETE','subnet',params.subnetId)
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
          hook.result = dhcpResponse
        }

        // Remove all devices in subnet
        if(params.subnetId && url == `${dhcpUrlPrefix}/${params.subnetId}/devices`) {
          console.log('\n Remove all devices in subnet : ')
          const dhcpResponse =  await dw.send({}, 'DELETE','device',params.subnetId)
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
          hook.result = dhcpResponse
          return Promise.resolve(hook)
        }

        // Remove all subnets
        if( (hook.id == "subnets" || !hook.id || hook.id == null)) {
          console.log('\n Remove all subnets : ')
          const dhcpResponse =  await dw.send({}, 'DELETE','subnet')
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse))
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
        console.log('\n CREATE AFTER DHCP HOOK RESULT : ' + JSON.stringify(hook.result))
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
