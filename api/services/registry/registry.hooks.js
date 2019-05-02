const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const errors = require ( '@feathersjs/errors' );
const logger = require ( './../../logger' );
const odlPost = require('./../../../scripts/data/odlPost')
let allHeaders = { crossDomain: true, headers : {  'Content-type': 'application/json' } };
const paths = require('./../../hooks/servicePaths')
const REGISTRY_PATH = paths.REGISTRY_PATH
const ODL_PATH = paths.ODL_PATH
const USERS_PATH = paths.USERS_PATH
const MICRONET_PATH = paths.MICRONET_PATH
module.exports = {
  before : {
    all : [ //authenticate('jwt')
    ] ,
    find : [] ,
    get : [] ,
    create : [] ,
    update : [] ,
    patch : [] ,
    remove : [
      async(hook) => {
        const {data, params, id } = hook
        const registry = await hook.app.service(`${REGISTRY_PATH}`).get(id)
        if(id){
          await hook.app.service(`${ODL_PATH}`).remove(registry.gatewayId,allHeaders)
          await axios({
            ...allHeaders,
            method: 'DELETE',
            url: `${registry.mmUrl}/mm/v1/subscriber/${id}/micronets`
          })
          await axios({
            ...allHeaders,
            method: 'DELETE',
            url: `${registry.mmUrl}/mm/v1/subscriber/${id}`
          })
          await hook.app.service(`${USERS_PATH}`).remove(id,allHeaders)
        }
        else {
          await hook.app.service(`${ODL_PATH}`).remove(null,allHeaders)
          await hook.app.service(`${MICRONET_PATH}`).remove(null,allHeaders)
          await hook.app.service(`${USERS_PATH}`).remove(null,allHeaders)
        }
      }
    ]
  } ,

  after : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [
      async ( hook ) => {
        logger.debug('\n Created registry after hook : ' + JSON.stringify(hook.result))

        // Update registry to include mano configuration parameters
        if(!hook.result.hasOwnProperty('identityUrl')) {
        const mano = hook.app.get('mano')
        logger.debug ( '\n Registry created : ' + JSON.stringify ( hook.result ) )
        logger.debug('\n\n Identity server from mano config  : ' + JSON.stringify(mano.identityUrl))
        const updatedRegistry = await hook.app.service ( `${REGISTRY_PATH}` ).patch ( hook.result.subscriberId ,{
          identityUrl:  mano.identityUrl
        })
        logger.debug('\n Updated registry : ' + JSON.stringify(updatedRegistry))
        }

        // Create Subscriber on MSO-PORTAL
        if(hook.result.hasOwnProperty('subscriberId') && hook.result.hasOwnProperty('msoPortalUrl')) {

          // Create/Register registry url for subscriber on MSO PORTAL
           let register = await axios.get ( `${hook.result.msoPortalUrl}/portal/v1/register` )
          const registerIndex = register.data.data.length > 0 ? register.data.data.findIndex((register) => register.subscriberId == hook.result.subscriberId) : -1
          logger.debug ( '\n Register : ' + JSON.stringify ( register.data.data ) + '\t\t RegisterIndex : ' + JSON.stringify(registerIndex) )

            const upsertResult =  registerIndex == -1 ? await axios.post ( `${hook.result.msoPortalUrl}/portal/v1/register` , Object.assign ( {} , {
              subscriberId : hook.result.subscriberId ,
              registry : `http://${hook.app.get ( 'host' )}:${hook.app.get ( 'port' )}`
            } ) ) : await axios.put ( `${hook.result.msoPortalUrl}/portal/v1/register/${hook.result.subscriberId}` , Object.assign ( {} , {
              subscriberId : hook.result.subscriberId ,
              registry : `http://${hook.app.get ( 'host' )}:${hook.app.get ( 'port' )}`
            } ) )

          logger.debug ( '\n Registered registry url  : ' + JSON.stringify ( upsertResult.data ) )

          if ( upsertResult.data.hasOwnProperty ( 'registry' ) && upsertResult.data.hasOwnProperty ( 'subscriberId' ) && upsertResult.data.subscriberId  == hook.result.subscriberId ) {
            logger.debug ( '\n Creating associated subscriber for registry ' )
            const postSubscriberBody = Object.assign ( {} , {
              id : hook.result.subscriberId ,
              ssid : `micronets-${hook.result.subscriberId}` ,
              name : hook.result.subscriberId ,
              registry : hook.result.mmUrl ,
              gatewayId : hook.result.gatewayId
            } )

            const result = await axios.post ( `${hook.result.msoPortalUrl}/portal/v1/subscriber` , postSubscriberBody )
            logger.debug ( '\n Subscriber created on MSO Portal : ' + JSON.stringify ( result.data ) )

            // Create default Micronet
            await hook.app.service ( `${MICRONET_PATH}` ).create ( Object.assign ( {} , {
              type : 'userCreate' ,
              id : result.data.id ,
              name : result.data.name ,
              ssid : result.data.ssid ,
              gatewayId : result.data.gatewayId ,
              micronets : []
            } ) )

            const micronet = await hook.app.service ( `${MICRONET_PATH}` ).find ()
            logger.debug ( '\n Default micronet for subscriber  : ' + JSON.stringify ( micronet ) )

            // Create default ODL Config
            const switchConfigPost = Object.assign ( {} , odlPost , { gatewayId : hook.result.gatewayId } )
            logger.debug ( 'Default ODL Post body : ' + JSON.stringify ( switchConfigPost ) )
            const switchConfig = await hook.app.service ( `${ODL_PATH}` ).find ( {} )
            const odlIndex = switchConfig.data.length > 0 ? switchConfig.data.findIndex ( ( swConfig ) => swConfig.gatewayId == hook.result.gatewayId ) : -1
            if ( switchConfig.data.length == 0 || odlIndex == -1 ) {
              await hook.app.service ( `${ODL_PATH}` ).create ( { ...switchConfigPost } , apiInit )
              return hook
            }
            hook.result = omitMeta ( hook.result )
            return Promise.resolve ( hook )
          }
          else {
            return Promise.reject(new errors.GeneralError(new Error(' Subscriber cannot be created. Associated registry for subscriber not found !')))
          }
        }
      }
    ] ,
    update : [
      async(hook) => {
       const {data, params, id} = hook
        if(hook.data.gatewayReconnection){
          hook.app.service ( `${REGISTRY_PATH}` ).emit ( 'gatewayReconnect' , {
            type : 'gatewayReconnect' ,
            data : { ...hook.result }
          } );
        }

      }
    ] ,
    patch : [] ,
    remove : []
  } ,

  error : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [] ,
    update : [] ,
    patch : [] ,
    remove : []
  }
};
