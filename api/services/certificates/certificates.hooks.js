const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
var axios = require ( 'axios' );
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
       const certificates =  await axios.post (`${registry.identityUrl}/certificates` ,  data , axiosConfig)
       if(certificates.data) {
         hook.app.service ( 'mm/v1/micronets/users' ).find ( { query : { id : data.subscriberId } } )
           .then ( ( { data } ) => {
              hook.app.service ( 'mm/v1/micronets/users' ).patch ( null ,{
               clientId : params.payload.clientID ,
               deviceId : params.payload.deviceID ,
               macAddress : params.payload.macAddress ,
               class : params.payload.class,
               isRegistered : true,
               deviceLeaseStatus: 'intermediary'
             }, { query : { id : data[0].id }, mongoose: { upsert: true}});
           })

       }
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
        hook.result = omitMeta ( hook.data )
       console.log('\n\n Certificates hook result : ' + JSON.stringify(hook.result))
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
