const { authenticate } = require('@feathersjs/authentication').hooks;
const axios = require ( 'axios' );
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ,'registry'] );
const errors = require('@feathersjs/errors');
const logger = require ( './../../logger' );
module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [
      async (hook) => {
        const { params  , data, payload } = hook;
        const { headers: { authorization }} = params
        const apiInit = {crossDomain: true, headers: {'Content-type': 'application/json'}}
        let allHeaders = { headers : { 'Authorization' : authorization , crossDomain: true } };
        console.log('\n ')
        let registry = await hook.app.service ( `/mm/v1/micronets/registry`).get(hook.data.subscriberId);
        logger.debug( '\n Registry from MM :' + JSON.stringify ( registry ) )
       // let registry = await axios.get(`${hook.data.registryUrl}/micronets/v1/mm/registry/${hook.data.subscriberId}`,allHeaders)
        // Call configure url
        // console.log('\n registry : ' + JSON.stringify(registry))
        const jwtToken = params.headers.authorization.split ( ' ' )[ 1 ]
        // const configureIdentityService =  await axios({
        //   // ...apiInit,
        //   method: 'post',
        //   url: `${registry.identityUrl}/configure`,
        //   data: data
        // })
        //console.log('\n configureIdentityService : ' + JSON.stringify(configureIdentityService.data))
        // if(configureIdentityService.data.result) {
        logger.debug( '\n Identity URL  :' + JSON.stringify ( registry.identityUrl ) )
          const csrTemplate = await axios({
            ...apiInit,
            method: 'post',
            url: `${registry.identityUrl}/csrt`
          })
          logger.debug( '\n Identity URL  :' + JSON.stringify ( registry.identityUrl )  + '\n\n CSR Template : ' + JSON.stringify(csrTemplate.data))
          // const csrTemplate = await axios.post (`${registry.identityUrl}/csrt`, ...apiInit)
          const subscriber = await axios.get(`${registry.msoPortalUrl}/portal/v1/subscriber/${hook.data.subscriberId}`,allHeaders)
          logger.debug( '\n MSO URL  :' + JSON.stringify ( registry.msoPortalUrl )  + '\n\n Subscriber : ' + JSON.stringify(subscriber.data))
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
                isRegistered : false,
                deviceName: params.payload.deviceName,
                deviceConnection:params.payload.deviceConnection,
                deviceLeaseStatus: "intermediary",
                mudUrl: params.payload.mudURL
              } )
            } )
            const user = await hook.app.service ( '/mm/v1/micronets/users' ).find ( { query : { id : subscriber.data.id } } )
             user.data.length == 0 ?  await hook.app.service ( '/mm/v1/micronets/users').create(sessionData , allHeaders ) :
               await hook.app.service ( '/mm/v1/micronets/users' ).patch ( null ,{
                 clientId : params.payload.clientID ,
                 deviceId : params.payload.deviceID ,
                 macAddress : params.payload.macAddress ,
                 class : params.payload.class,
                 deviceName: params.payload.deviceName,
                 deviceConnection:params.payload.deviceConnection,
                 mudUrl: params.payload.mudURL
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
       // }
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
