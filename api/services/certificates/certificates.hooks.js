const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
var axios = require ( 'axios' );
const errors = require('@feathersjs/errors');
const logger = require ( './../../logger' );

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [ hook => {} ],
    get: [ hook => {} ],
    create: [
     async ( hook ) => {
       const { params  , payload, data } = hook;
       let axiosConfig = { headers : { 'Authorization' : params.headers.authorization } };
       const user = await hook.app.service ( 'mm/v1/micronets/users' ).find()
       let registry = await hook.app.service ( '/mm/v1/micronets/registry' ).get ( null, { id : data.subscriberId }  );
       const subscriber = await axios.get(`${registry.msoPortalUrl}/internal/subscriber/${data.subscriberId}`,axiosConfig)
       logger.debug( '\n MSO URL  :' + JSON.stringify ( registry.msoPortalUrl )  + '\n\n Subscriber : ' + JSON.stringify(subscriber.data))
       const certificates =  await axios.post (`${registry.identityUrl}/certificates` ,  data , axiosConfig)
       logger.debug( '\n Identity URL  :' + JSON.stringify ( registry.identityUrl )  + '\n\n Certificates : ' + JSON.stringify(certificates.data))
       hook.data = Object.assign ( {} ,
         {
           wifiCert : certificates.data.wifiCert ,
           caCert : certificates.data.caCert ,
           passphrase: certificates.data.passphrase,
           macAddress : params.payload.macAddress ,
           subscriber : Object.assign ( {} , subscriber.data  ? omitMeta ( subscriber.data ) : { info : 'No subscriber found' } )
         } )
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
       hook  => {
        const { params  , payload, data } = hook;
         if(hook.result) {
           hook.app.service ( 'mm/v1/micronets/users' ).find ( { query : { id : data.subscriber.id } } )
             .then ( ( { data } ) => {
               hook.app.service ( 'mm/v1/micronets/users' ).patch ( null ,{
                 clientId : params.payload.clientID ,
                 deviceId : params.payload.deviceID ,
                 macAddress : params.payload.macAddress ,
                 class : params.payload.class,
                 isRegistered : true,
                 deviceLeaseStatus: 'intermediary',
                 mudUrl: params.payload.mudURL
               }, { query : { id : data[0].id }, mongoose: { upsert: true}});
             })
         }
        hook.result = omitMeta ( hook.data )
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
