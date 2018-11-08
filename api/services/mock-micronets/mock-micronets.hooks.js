var rn = require('random-number');
var gen = rn.generator({
  min:  1534270984
  , max:  2534270984
  , integer: true
})
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' ,  '__v' ] );

module.exports = {
  before: {
    all: [],
    find: [],
    get: [
      hook => {
        const { data , params , id } = hook;
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }
        return hook.app.service ( '/mm/v1/mock/micronets' ).find ( {} )
          .then ( ( { data } ) => {
            hook.result = omitMeta ( data[ 0 ] );
            Promise.resolve ( hook )
          } )
      }
    ],
    create: [
      async (hook) => {
        const { params, data , id, path, headers, url } = hook
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }

        const mockMicronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
        // Create or update micronet
        if (hook.data.micronets && !hook.id && !hook.params.route.micronetId && !hook.params.route.subnetId) {
          let mockMicronets = []
          const micronetsPostData = Object.assign({},hook.data)
          micronetsPostData.micronets.micronet.forEach((micronet, index) => {
            mockMicronets.push(Object.assign({},{
              ...micronet ,
              "class": micronet.class ? micronet.class : micronet.name,
              "micronet-id" : micronet["micronet-id"]!= undefined ? micronet["micronet-id"] : gen ()
            }))
          })

          if(mockMicronetFromDB && mockMicronetFromDB.hasOwnProperty('_id')) {
            hook.id = mockMicronetFromDB._id
            const patchResult = await hook.app.service ( '/mm/v1/mock/micronets' ).patch ( hook.id,
              { micronets : { micronet : mockMicronets } } ,
              { query : {} , mongoose : { upsert : true } }  );
            hook.result = Object.assign({},{ micronets:patchResult.micronets })
            return Promise.resolve(hook)
          }
          if(Object.keys(mockMicronetFromDB).length == 0) {
            hook.data = Object.assign({},{ micronets:{micronet:mockMicronets}})
            return Promise.resolve(hook)
          }
        }

        // Add devices to existing micro-nets
        if(hook.data.micronets && hook.params.route.subnetId && hook.params.route.micronetId) {
          const micronetsPostData = Object.assign({},hook.data)
          if(mockMicronetFromDB && mockMicronetFromDB.hasOwnProperty('_id')) {
            hook.id = mockMicronetFromDB._id
            const patchResult = await hook.app.service ( '/mm/v1/mock/micronets' ).patch ( hook.id,
              { micronets : { micronet : micronetsPostData.micronets.micronet } } ,
              { query : {} , mongoose : { upsert : true } }  );
            hook.result = Object.assign({},{ micronets:patchResult.micronets })
            return Promise.resolve(hook)
          }

        }
      }
    ],
    update: [],
    patch: [],
    remove: [
     async (hook) => {
        const { params, data , id, path, headers } = hook
        const {  subnetId, micronetId } = params.route ;
        if(hook.id && !subnetId) {
          const micronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
          const filteredMicronet = micronetFromDB.micronets.micronet.filter((foundMicronet) => foundMicronet['micronet-id']!= hook.id)
          const patchResult = await hook.app.service('/mm/v1/mock/micronets').patch(micronetFromDB._id, {micronets: {micronet: filteredMicronet } }, { query : {} , mongoose : { upsert : true } }  )
          hook.result = Object.assign({},{ micronets:patchResult.micronets })
          return Promise.resolve(hook)
        }
        if(micronetId && subnetId) {
          const micronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
        }
        if(!hook.id && path == "mm/v1/mock/micronets") {
          const micronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
          const patchResult = await hook.app.service('/mm/v1/mock/micronets').patch(micronetFromDB._id, {micronets: {micronet: [] } }, { query : {} , mongoose : { upsert : true } }  )
          hook.result = Object.assign({},{ micronets:patchResult.micronets })
          return Promise.resolve(hook)
        }
      }
    ]
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [ hook => {} ],
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
