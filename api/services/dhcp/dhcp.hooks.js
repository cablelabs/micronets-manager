const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt'  , '__v' , 'devices'] );
const createSubnetUrl = "/mm/v1/dhcp/subnets"
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
        console.log('\n GET DHCP HOOK PARAMS : ' + JSON.stringify(params))
        console.log('\n GET DHCP HOOK ID : ' + JSON.stringify(id))
        if(hook.id && hook.id!='subnets') {
          console.log('\n hook.id : ' + JSON.stringify(hook.id))
          return hook.app.service('/mm/v1/micronets/dhcp').find({subnetId:hook.id}).then((data)=> {
            console.log('\n DATA FROM FIND with hook.id : ' + JSON.stringify(data.data))
            const subnetIndex =  data.data.findIndex((data)=> data.subnetId == hook.id)
            console.log('\n subnetIndex : ' + JSON.stringify(subnetIndex))
            hook.result =  omitMeta(data.data[subnetIndex])
          })
        }
        else {
          return hook.app.service('/mm/v1/micronets/dhcp').find({}).then((data)=> {
            console.log('\n DATA FROM FIND : ' + JSON.stringify(data.data))
            hook.result = data.data.map((data,index) => {
              return  omitMeta(data)
            })
          })
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
       // console.log('\n CREATE DHCP HOOK PARAMS QUERY: ' + JSON.stringify(params.query) + '\t\t PROVIDER : ' + JSON.stringify(params.provider)
       //  + '\t\t\t ROUTE : ' + JSON.stringify(params.route))
        console.log('\n CREATE DHCP HOOK ID : ' + JSON.stringify(id))
        console.log('\n CREATE DHCP HOOK PATH : ' + JSON.stringify(path))
        console.log('\n CREATE DHCP HOOK ORIGINAL-URL : ' + JSON.stringify(originalUrl))
        console.log('\n CREATE DHCP HOOK METHOD : ' + JSON.stringify(method))
        console.log('\n CREATE DHCP HOOK BODY : ' + JSON.stringify(body))

        if(originalUrl == createSubnetUrl) {
          console.log('\n ORIGINAL URL : ' + JSON.stringify(originalUrl))
          const dhcpResponse = await axios ( {
            ...apiInit ,
            method : 'post' ,
            url : `${dhcpUrl}/micronets/v1/dhcp/subnets` ,
            data: body
          })
          console.log('\n DHCP RESPONSE : ' + JSON.stringify(dhcpResponse.data))
          hook.data = Object.assign({},dhcpResponse.data.subnet)
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
        console.log('\n UPDATE HOOK ID : ' + JSON.stringify(id) + '\t\t DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params))
        // TODO : Add Dan DHCP Wrapper here
        // return hook.app.service('/mm/v1/micronets/dhcp').get(id).then((data) => {
        //     console.log('\n Found data from get patch request : ' + JSON.stringify(data))
        //   hook.data = Object.assign({},hook.data)
        //   hook.app.service ( '/mm/v1/micronets/dhcp' ).emit ( 'dhcpSubnetUpdated' , {
        //     type : 'dhcpSubnetUpdated' ,
        //     data : { subnet : hook.data }
        //   } );
        // })
         if( query.url = `/mm/v1/dhcp/subnets/${query.subnetId}/devices`) {
          console.log('\n Add device to existing subnet for data : ' + JSON.stringify(hook.data))
           return hook.app.service('/mm/v1/micronets/dhcp').patch(id, {devices:hook.data }).then((data) => {
             console.log('\n Found data from get patch request : ' + JSON.stringify(data))
             hook.data = Object.assign({},data)
           })
         }
      }
    ],
    patch: [
      async(hook) => {
        const { data,id,params } = hook;
        console.log('\n PATCH HOOK ID : ' + JSON.stringify(id) + '\t\t DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params))

      }
    ],
    remove: []
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
