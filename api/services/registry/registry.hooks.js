const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
const errors = require ( '@feathersjs/errors' );
const logger = require ( './../../logger' );
const odlPost = require('./../../../scripts/data/odlPost')

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
          logger.debug ( '\n Subscriber found : ' + JSON.stringify ( subscriber ) + '\t\t data.subscriberId : ' + JSON.stringify ( data.subscriberId ) )
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
    remove : []
  } ,

  after : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [
      async ( hook ) => {
        hook.result = omitMeta ( hook.data )

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
         await hook.app.service ( '/mm/v1/micronets' ).create ( Object.assign ( {} , {
          type : 'userCreate' ,
          id : subscriber.id ,
          name : subscriber.name ,
          ssid : subscriber.ssid ,
          micronets : Object.assign ( {} , {
            micronet : []
          } )
        } ) )
        const micronet = await hook.app.service ( '/mm/v1/micronets' ).find ()
        logger.debug ( '\n Empty micronet for subscriber  : ' + JSON.stringify ( micronet ) )

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
