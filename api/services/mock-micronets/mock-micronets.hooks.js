var rn = require('random-number');
var gen = rn.generator({
  min:  1534270984
  , max:  2534270984
  , integer: true
})
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' ,  '__v' ] );
const logger = require ( './../../logger' );

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
        logger.debug('\n hook.data.micronets : ' + JSON.stringify(hook.data.micronets))
        logger.debug('\n hook.id : ' + JSON.stringify(hook.id))
        logger.debug('\n hook.params : ' + JSON.stringify(hook.params))
        // Create or update micronet
        if (hook.data.micronets && !hook.id && !hook.params.route.micronetId && !hook.params.route.subnetId) {
          let mockMicronets = []
          const micronetsPostData = Object.assign({},hook.data)
          micronetsPostData.micronets.forEach((micronet, index) => {
            mockMicronets.push(Object.assign({},{
              ...micronet ,
              "class": micronet.class ? micronet.class : micronet.name,
              "micronet-id" : micronet["micronet-id"]!= undefined ? micronet["micronet-id"] : gen ()
            }))
          })

          if(mockMicronetFromDB && mockMicronetFromDB.hasOwnProperty('_id')) {
            hook.id = mockMicronetFromDB._id
            const patchResult = await hook.app.service ( '/mm/v1/mock/micronets' ).patch ( hook.id,
              { micronets :  mockMicronets  } ,
              { query : {} , mongoose : { upsert : true } }  );
            hook.result = Object.assign({},{ micronets:patchResult.micronets })
            logger.debug('\n\n Mock micronets hook.result : ' + JSON.stringify(hook.result))
            return Promise.resolve(hook)
          }
          if(Object.keys(mockMicronetFromDB).length == 0) {
            hook.data = Object.assign({},{ micronets:mockMicronets})
            logger.debug('\n\n Mock micronets hook.data : ' + JSON.stringify(hook.data))
            return Promise.resolve(hook)
          }
        }

        // Add devices to existing micro-nets
        if(hook.data.micronets && hook.params.route.subnetId && hook.params.route.micronetId) {
          const micronetsPostData = Object.assign({},hook.data)
          if(mockMicronetFromDB && mockMicronetFromDB.hasOwnProperty('_id')) {
            hook.id = mockMicronetFromDB._id
            const patchResult = await hook.app.service ( '/mm/v1/mock/micronets' ).patch ( hook.id,
              { micronets :  micronetsPostData.micronets  } ,
              { query : {} , mongoose : { upsert : true } }  );
            hook.result = Object.assign({},{ micronets:patchResult.micronets })
            logger.debug('\n\n Mock micronets hook.result : ' + JSON.stringify(hook.result))
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
          const filteredMicronet = micronetFromDB.micronets.filter((foundMicronet) => foundMicronet['micronet-id']!= hook.id)
          const patchResult = await hook.app.service('/mm/v1/mock/micronets').patch(micronetFromDB._id, {micronets:  filteredMicronet  }, { query : {} , mongoose : { upsert : true } }  )
          hook.result = Object.assign({},{ micronets:patchResult.micronets })
          return Promise.resolve(hook)
        }
        if(micronetId && subnetId) {
          const micronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
        }
        if(!hook.id && path == "mm/v1/mock/micronets") {
          const micronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
          const patchResult = await hook.app.service('/mm/v1/mock/micronets').patch(micronetFromDB._id, {micronets:  []  }, { query : {} , mongoose : { upsert : true } }  )
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
