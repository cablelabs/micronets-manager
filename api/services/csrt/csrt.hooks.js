const { authenticate } = require('@feathersjs/authentication').hooks;
const axios = require ( 'axios' );
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ,'registry'] );

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [
      async (hook) => {
        const { params  , payload } = hook;
        const { headers: { authorization }} = params
        let allHeaders = { headers : { 'Authorization' : authorization , crossDomain: true } };
        let registry = await hook.app.service ( '/micronets/v1/mm/registry' ).get(null, {id:hook.data.subscriberId});
       // let registry = await axios.get(`${hook.data.registryUrl}/micronets/v1/mm/registry/${hook.data.subscriberId}`,allHeaders)
        // Call configure url
        const data = { subcriberId : hook.data.subscriberId }
        const jwtToken = params.headers.authorization.split ( ' ' )[ 1 ]
        const configureIdentityService =  await axios.post (`${registry.identityUrl}/configure` , data)
        if(configureIdentityService.data.result) {
          const csrTemplate = await axios.post (`${registry.identityUrl}/csrt`)
          const subscriber = await axios.get(`${registry.msoPortalUrl}/internal/subscriber/${hook.data.subscriberId}`,allHeaders)

          if(subscriber.data) {
            // Creating updating user information
            const sessionData = Object.assign ( {} , {
              id : subscriber.data.id ,
              name : subscriber.data.name ,
              ssid : subscriber.data.ssid,
              devices :  Object.assign ( {} , {
                clientId : params.payload.clientID ,
                deviceId : params.payload.deviceID ,
                macAddress : params.payload.macAddress,
                class: params.payload.class,
                isRegistered : false
              } )
            } )
            const user = await hook.app.service ( 'micronets/v1/mm/users' ).find ( { query : { id : subscriber.data.id } } )
             user.data.length == 0 ?  await hook.app.service ( 'micronets/v1/mm/users').create(sessionData , allHeaders ) :
               await hook.app.service ( 'micronets/v1/mm/users' ).patch ( null ,{
                 clientId : params.payload.clientID ,
                 deviceId : params.payload.deviceID ,
                 macAddress : params.payload.macAddress ,
                 class : params.payload.class
               }, { query : { id : subscriber.data.id }, mongoose: { upsert: true}});

          }
          hook.data = Object.assign ( {} ,
            {
              csrTemplate : csrTemplate.data.csrTemplate ,
              debug : {
                context : {
                  token : jwtToken ,
                  clientID : params.payload.clientID ,
                  deviceID : params.payload.deviceID ,
                  class : params.payload.class,
                  timestamp : params.payload.iat ,
                  subscriber : Object.assign ( {} , subscriber.data ? omitMeta ( subscriber.data ) : { info : 'No subscriber found' } )
                }
              }
            } );
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
    create: [
      async function ( hook ) {
        const { params , data , payload } = hook
        hook.result = omitMeta ( hook.data )
        console.log ( '\n CSRT hook result :' + JSON.stringify ( hook.result ) )
        return hook;
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
