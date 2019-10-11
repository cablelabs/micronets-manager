const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const logger = require ( './../../logger' );
const paths = require('./../../hooks/servicePaths')
const { REGISTRY_PATH, ODL_PATH, USERS_PATH, MICRONETS_PATH } = paths
const axios = require ( 'axios' );
module.exports = {
  before: {
    // all: [  authenticate('jwt') ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      async(hook) => {
       logger.debug('\n ODL AFTER CREATE HOOK ' + JSON.stringify(hook.result))
        const mano = hook.app.get('mano')

        let registry = await hook.app.service(`${REGISTRY_PATH}`).get(mano.subscriberId)
        logger.debug('\n Registry obtained : ' + JSON.stringify(registry))

        // MM updates. Update Registry
        if(registry.gatewayId != hook.result.gatewayId ) {
         let upsertRegistryResult = await hook.app.service(`${REGISTRY_PATH}`).patch(mano.subscriberId, Object.assign({},{
           gatewayId : hook.result.gatewayId
          }))
         logger.debug('\n UpsertRegistryResult : ' + JSON.stringify(upsertRegistryResult))
        }

        let micronets =  await hook.app.service(`${MICRONETS_PATH}`).get(mano.subscriberId)
        logger.debug('\n Micronets obtained : ' + JSON.stringify(micronets))

        // MM updates. Update Micronets
        if(micronets.gatewayId != hook.result.gatewayId) {
          let upsertMicronetsResult = await hook.app.service(`${MICRONETS_PATH}`).patch(mano.subscriberId, Object.assign({},{
            gatewayId : hook.result.gatewayId
          }))
          logger.debug('\n upsertMicronetsResult : ' + JSON.stringify(upsertMicronetsResult))
        }

        // MSO-Portal updates. Update Subscriber
        let portalSubscriber = await axios.get(`${registry.msoPortalUrl}/portal/v1/subscriber/${mano.subscriberId}`)
        logger.debug('\n Portal Subscriber : ' + JSON.stringify(portalSubscriber.data))
        if(portalSubscriber.data.gatewayId != hook.result.gatewayId) {
         let upsertPortalSubscriber =  await axios.patch(`${registry.msoPortalUrl}/portal/v1/subscriber/${mano.subscriberId}`, Object.assign({
            gatewayId: hook.result.gatewayId
          }))
        }

        // MSO-Portal updates. Update register
        let portalSocket = await axios.get(`${registry.msoPortalUrl}/portal/v1/socket/${mano.subscriberId}`)
        logger.debug('\n Portal Socket : ' + JSON.stringify(portalSocket.data))
        if(portalSocket.data.gatewayId != hook.result.gatewayId) {
          let upsertSocket =  await axios.patch(`${registry.msoPortalUrl}/portal/v1/socket/${mano.subscriberId}`, Object.assign({
            gatewayId: hook.result.gatewayId
          }))
        }

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
