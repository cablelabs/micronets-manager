const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [
      hook => {
      const {params, data, id} = hook
        console.log('\n Registry get service : ' + JSON.stringify(params.headers))
        const query = Object.assign({ subscriberId: id ? id : params.id }, hook.params.query);
        console.log('\n Registry get service query : ' + JSON.stringify(query))
        hook.params.mongoose = {
          runValidators: true,
          setDefaultsOnInsert: true
        }
        return hook.app.service('/mm/v1/micronets/registry').find({ query })
          .then(({data}) => {
            console.log('\n Registry get service data : ' + JSON.stringify(data))
            if(data.length === 1) {
              hook.result = omitMeta(data[0]);
            }
        })
      }
    ],
    create: [
      hook => {
        const { data , params } = hook
        hook.data = Object.assign ( {} ,
          {
            subscriberId : hook.data.subscriberId ,
            identityUrl : hook.data.identityUrl ,
            dhcpUrl : hook.data.dhcpUrl ,
            mmUrl : hook.data.mmUrl ,
            mmClientUrl : hook.data.mmClientUrl ,
            websocketUrl : hook.data.websocketUrl,
            msoPortalUrl : hook.data.msoPortalUrl
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
      hook => {
        hook.result = omitMeta ( hook.data )
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
