const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const omitMetaForSubnets = omit ( [ 'updatedAt' , 'createdAt'  , '__v' , 'devices' ] );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt'  , '__v' ] );
const createSubnetUrl = "/mm/v1/dhcp/subnets"
const getSubnetDevicesUrl = "/mm/v1/dhcp/subnets"
const dhcpConnection = async(hook) => {
  console.log('\n dhcpConnection ...')
  return Promise.resolve(hook)
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
        // const connection = await dhcpConnection(hook)
        // console.log('\n\n connection : ' + JSON.stringify(connection))
        // return Promise.resolve(hook)
    }
      ],
    find: [
      async (hook) => {
        const {params, id, data} = hook;
        console.log('\n FIND DHCP HOOK PARAMS : ' + JSON.stringify(params))
        console.log('\n FIND DHCP HOOK ID : ' + JSON.stringify(id))
        console.log('\n FIND DHCP HOOK DATA : ' + JSON.stringify(data))
        return Promise.resolve(hook)
      }
    ],
    get: [
      async (hook) => {
       const {params, id, data} = hook;
       const {url,subnetId} = params
        console.log('\n GET DHCP HOOK PARAMS : ' + JSON.stringify(params))
        console.log('\n GET DHCP HOOK ID : ' + JSON.stringify(id))
        const registry = await getRegistry(hook,{})
        const { dhcpUrl } = registry
        console.log('\n DHCP URL : ' + JSON.stringify(dhcpUrl))
        console.log('\n URL : ' + JSON.stringify(url))


        if(hook.id && params.subnetId) {
          console.log('\n hook.id : ' + JSON.stringify(hook.id))

          // Get specific device in subnet
          if(params.subnetId && params.deviceId) {
              console.log('\n URL : ' + JSON.stringify(url))
              const dhcpResponse = await axios ( {
                ...apiInit ,
                method : 'get' ,
                url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${params.subnetId}/devices/${params.deviceId}`

              })
              console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
              hook.result =  dhcpResponse.data
              return Promise.resolve(hook)
            }
            // Get all devices in subnet
            if(params.subnetId && url == `/mm/v1/dhcp/subnets/${params.subnetId}/devices`)
            {
              const dhcpResponse = await axios ( {
                ...apiInit ,
                method : 'get' ,
                url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${params.subnetId}/devices`
              })
              console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
              hook.result =  dhcpResponse.data
              return Promise.resolve(hook)
            }
           // Get specific subnet
            else {
              const dhcpResponse = await axios ( {
                ...apiInit ,
                method : 'get' ,
                url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${params.subnetId}`

              })
              console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
              hook.result =  dhcpResponse.data
              return Promise.resolve(hook)
            }
        }
       // Get all subnets
        else {
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'get' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets`

          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result =  dhcpResponse.data
          return Promise.resolve(hook)
        }
      }
    ],
    create: [
      async (hook) => {
        const {params, id, data} = hook;
        const { path , originalUrl , method, body } = data
        const registry = await getRegistry(hook,{})
        const { dhcpUrl } = registry
        console.log('\n DHCP URL : ' + JSON.stringify(dhcpUrl))
        console.log('\n CREATE DHCP HOOK ID : ' + JSON.stringify(id))
        console.log('\n CREATE DHCP HOOK PATH : ' + JSON.stringify(path))
        console.log('\n CREATE DHCP HOOK ORIGINAL-URL : ' + JSON.stringify(originalUrl))
        console.log('\n CREATE DHCP HOOK METHOD : ' + JSON.stringify(method))
        console.log('\n CREATE DHCP HOOK BODY : ' + JSON.stringify(body))

        if(originalUrl == createSubnetUrl) {
          console.log('\n ORIGINAL URL : ' + JSON.stringify(originalUrl))
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'POST' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets` ,
            data: body
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
        //  hook.data = Object.assign({},dhcpResponse.data.subnet)
          hook.result = dhcpResponse.data
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
        const registry = await getRegistry(hook,{})
        const { dhcpUrl } = registry
        console.log('\n DHCP URL : ' + JSON.stringify(dhcpUrl))
        console.log('\n UPDATE HOOK ID : ' + JSON.stringify(id) + '\t\t DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params))
        // TODO : Add Dan DHCP Wrapper here

        // Add device to existing subnet
        if( query.url = `/mm/v1/dhcp/subnets/${query.subnetId}/devices`) {
          console.log('\n Add device to existing subnet for data : ' + JSON.stringify(hook.data))
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'POST' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${query.subnetId}/devices`,
            data:hook.data
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result = dhcpResponse.data
          return Promise.resolve(hook)
        }

        // Update existing subnet
        if( query.url = `/mm/v1/dhcp/subnets/${query.subnetId}`) {
          console.log('\n Update existing subnet passed data : ' + JSON.stringify(hook.data))
          // TODO : Add Dan DHCP Wrapper here
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'PUT' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${query.subnetId}`,
            data:hook.data
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result = dhcpResponse.data
          return Promise.resolve(hook)
        }

        // Update existing device in subnet
        if( query.url = `/mm/v1/dhcp/subnets/${query.subnetId}/devices/${query.deviceId}`) {
          console.log('\n Update existing device present in a subnet passed data : ' + JSON.stringify(hook.data))
          // TODO : Add Dan DHCP Wrapper here
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'PUT' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${query.subnetId}/devices`,
            data:hook.data
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result = dhcpResponse.data
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
        const registry = await getRegistry(hook,{})
        const { dhcpUrl } = registry
        console.log('\n DHCP URL : ' + JSON.stringify(dhcpUrl))
        console.log('\n URL : ' + JSON.stringify(url))

        // Remove specific subnet
        if(params.subnetId && url == `/mm/v1/micronets/dhcp/subnets/${params.subnetId}`) {
         console.log('\n Delete specific subnet : ' + JSON.stringify(params.subnetId))
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'delete' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${params.subnetId}`
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result = dhcpResponse.data
        }

        // Remove all subnets
        if( url == `/mm/v1/dhcp/subnets`) {
          console.log('\n Remove all subnets : ')
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'delete' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets`
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result = dhcpResponse.data
        }

        // Remove all devices in subnet
        if(params.subnetId && url == `/mm/v1/micronets/dhcp/subnets/${params.subnetId}/devices`) {
          console.log('\n Remove all subnets : ')
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'delete' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${params.subnetId}/devices`
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result = dhcpResponse.data
        }

        // Remove specific device in subnet
        if(params.subnetId && params.deviceId && url == `/mm/v1/micronets/dhcp/subnets/${params.subnetId}/devices/${params.deviceId}`) {
          console.log('\n Delete specific device ' + JSON.stringify(params.deviceId) + ' in subnet : ' + JSON.stringify(params.subnetId))
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'delete' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets/${params.subnetId}/devices/${params.deviceId}`
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.result = dhcpResponse.data
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
        hook.app.service ( '/mm/v1/micronets/dhcp' ).emit ( 'dhcpSubnetCreated' , {
          type : 'dhcpSubnetCreated' ,
          data : Object.assign({},{subnetId:hook.result.subnetId})
        } );
        return hook
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
