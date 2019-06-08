var rn = require('random-number');
var gen = rn.generator({
  min:  1534270984
  , max:  2534270984
  , integer: true
})
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' ,  '__v' ] );
const logger = require ( './../../logger' );
const paths = require('./../../hooks/servicePaths')
const { MOCK_MICRONET_PATH } = paths

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
      async (hook) => {
        const { params, data , id, path, headers, url } = hook
        const subscriberId = !params.id && params.route.id ? params.route.id : params.id
        const { route  } = params
        const mockMicronetsFromDb = await hook.app.service(`${MOCK_MICRONET_PATH}`).find({})
        const mockMicronetIndex = mockMicronetsFromDb.data.length > 0 ? mockMicronetsFromDb.data.findIndex((subscriber) => subscriber.id == subscriberId) : -1

        // Create or update micronet
        if (hook.data.micronets  && !hook.params.route.micronetId) {
          let mockMicronets = []
          const micronetsPostData = Object.assign({},hook.data)
          micronetsPostData.micronets.forEach((micronet, index) => {
            mockMicronets.push(Object.assign({},{
              ...micronet ,
              "class": micronet.class ? micronet.class : micronet.name,
              "micronet-id" : micronet["micronet-id"]!= undefined ? micronet["micronet-id"] : gen ()
            }))
          })

          if(mockMicronetsFromDb.data.length > 0 && mockMicronetIndex != -1) {

            const patchResult = await hook.app.service ( `${MOCK_MICRONET_PATH}` ).patch ( subscriberId,
              { micronets :  mockMicronets  } ,
              { query : {} , mongoose : { upsert : true } }  );
            hook.result = Object.assign({},{ micronets:patchResult.micronets })
            return Promise.resolve(hook)
          }
          if(mockMicronetsFromDb.data.length == 0 &&  mockMicronetIndex == -1) {
            hook.data = Object.assign({},{
              id: subscriberId,
              micronets:mockMicronets
            })
            return Promise.resolve(hook)
          }
        }

        // Add devices to existing micro-nets
        if(hook.data.micronets && subscriberId && hook.params.route.micronetId) {
          const micronetsPostData = Object.assign({},hook.data)
          if(mockMicronetIndex != -1) {
            const patchResult = await hook.app.service ( `${MOCK_MICRONET_PATH}` ).patch ( subscriberId,
              { micronets :  micronetsPostData.micronets  } ,
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
        const {   micronetId } = params.route ;
        const subscriberId =  !params.id && params.route.id ? params.route.id : params.id

        if(subscriberId && micronetId) {
          const micronetFromDB = await hook.app.service(`${MOCK_MICRONET_PATH}`).get(subscriberId)

          const filteredMicronet = micronetFromDB.micronets.filter((foundMicronet) => foundMicronet['micronet-id']!= micronetId)
          const patchResult = await hook.app.service('/mm/v1/mock/subscriber').patch(subscriberId, { micronets:  filteredMicronet  }  )
          hook.result = Object.assign({},{ micronets:patchResult.micronets })
          return Promise.resolve(hook)
        }

        if(subscriberId && !micronetId) {
          const micronetFromDB = await hook.app.service(`${MOCK_MICRONET_PATH}`).get(subscriberId)
          const patchResult = await hook.app.service(`${MOCK_MICRONET_PATH}`).patch(subscriberId, { micronets:  []  }  )
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
    create: [ ],
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
