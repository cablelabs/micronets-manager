const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const errors = require ( '@feathersjs/errors' );
const logger = require ( './../../logger' );
const odlPost = require('./../../../scripts/data/odlPost')
let allHeaders = { crossDomain: true, headers : {  'Content-type': 'application/json' } };

module.exports = {
  before : {
    all : [ //authenticate('jwt')
    ] ,
    find : [] ,
    get : [] ,
    create : [
      async ( hook ) => {
        const { data , params } = hook
        if ( data.msoPortalUrl ) {
          let subscriber = await axios.get ( `${data.msoPortalUrl}/portal/v1/subscriber/${data.subscriberId}` )
          subscriber = subscriber.data
          logger.debug ( '\n Subscriber found : ' + JSON.stringify ( subscriber ) + '\t\t Data.subscriberId : ' + JSON.stringify ( data.subscriberId ) )
          if ( !subscriber.id && subscriber.id != data.subscriberId ) {
            return Promise.reject ( new errors.GeneralError ( new Error ( 'Registry cannot be created.No associated subscriber found' ) ) )
          }
          else {
            hook.data.gatewayId = subscriber.gatewayId
            return Promise.resolve ( hook )
          }
        }
      }
    ] ,
    update : [] ,
    patch : [] ,
    remove : [
      async(hook) => {
        const {data, params, id } = hook
        const registry = await hook.app.service('/mm/v1/micronets/registry').get(id)
        if(id){
          await hook.app.service('/mm/v1/micronets/odl').remove(registry.gatewayId,allHeaders)
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
          await hook.app.service('/mm/v1/micronets/users').remove(id,allHeaders)
        }
        else {
          await hook.app.service('/mm/v1/micronets/odl').remove(null,allHeaders)
          await hook.app.service('/mm/v1/subscriber').remove(null,allHeaders)
          await hook.app.service('/mm/v1/micronets/users').remove(null,allHeaders)
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
        // Update registry to include mano configuration parameters
        if(!hook.result.hasOwnProperty('identityUrl')) {
        const mano = hook.app.get('mano')
        logger.debug ( '\n Registry created : ' + JSON.stringify ( hook.result ) )
        logger.debug('\n\n MANO CONFIG FOR IDENTITY SERVER : ' + JSON.stringify(mano.identityUrl))
        const updatedRegistry = await hook.app.service ( '/mm/v1/micronets/registry' ).patch ( hook.result.subscriberId ,{
          identityUrl:  mano.identityUrl
        })
        logger.debug('\n Updated registry : ' + JSON.stringify(updatedRegistry))
        }

        // Create Empty micronet
        const registry = hook.result
        let subscriber = await axios.get ( `${registry.msoPortalUrl}/portal/v1/subscriber/${registry.subscriberId}`)
        subscriber = subscriber.data
        logger.debug ( '\n Associated subscriber with registry : ' + JSON.stringify ( subscriber ) )
         await hook.app.service ( '/mm/v1/subscriber' ).create ( Object.assign ( {} , {
          type : 'userCreate' ,
          id : subscriber.id ,
          name : subscriber.name ,
          ssid : subscriber.ssid ,
          gatewayId: subscriber.gatewayId ,
          micronets : []
        } ) )
        const micronet = await hook.app.service ( '/mm/v1/subscriber' ).find ()
        logger.debug ( '\n Default micronet for subscriber  : ' + JSON.stringify ( micronet ) )

        // Create default ODL Config
        const switchConfigPost = Object.assign({}, odlPost, {gatewayId:  hook.result.gatewayId})
        logger.debug('Default ODL Post body : ' + JSON.stringify(switchConfigPost))
        const switchConfig = await hook.app.service ( '/mm/v1/micronets/odl' ).find({})
        const odlIndex = switchConfig.data.length > 0  ? switchConfig.data.findIndex((swConfig) => swConfig.gatewayId == hook.result.gatewayId) : -1
        if(switchConfig.data.length == 0 || odlIndex == -1)  {
          await hook.app.service ( '/mm/v1/micronets/odl').create({...switchConfigPost}, apiInit)
          return hook
        }
       hook.result = omitMeta(hook.result)
       return Promise.resolve(hook)
      }
    ] ,
    update : [] ,
    patch : [] ,
    remove : [
      async(hook) => {
      const {data, params, id } = hook
        logger.debug('\n REMOVE HOOK REGISTRY result : ' + JSON.stringify(hook.result))
      }
    ]
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
