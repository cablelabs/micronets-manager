const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
let apiHeaders = { headers : { crossDomain : true } };
const errors = require ( '@feathersjs/errors' );
const logger = require ( './../../logger' );
const app = require ( './../../app' );

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
          let subscriber = await axios.get ( `${data.msoPortalUrl}/internal/subscriber/${data.subscriberId}` )
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
        if(!hook.result.hasOwnProperty('identityUrl') && !hook.result.hasOwnProperty('webSocketUrl')) {
        const mano = hook.app.get('mano')
        logger.debug ( '\n Registry created : ' + JSON.stringify ( hook.result ) )
        const updatedRegistry = await hook.app.service ( '/mm/v1/micronets/registry' ).patch ( hook.result.subscriberId ,{
          webSocketUrl: mano.webSocketUrl,
          identityUrl:  mano.identityUrl
        })
        logger.debug('\n Updated registry : ' + JSON.stringify(updatedRegistry.data))
        }
        const registry = hook.result
        let subscriber = await axios.get ( `${registry.msoPortalUrl}/internal/subscriber/${registry.subscriberId}`)
        subscriber = subscriber.data
        logger.debug ( '\n Associated subscriber with registry : ' + JSON.stringify ( subscriber ) )
        const micronet = await hook.app.service ( '/mm/v1/micronets' ).create ( Object.assign ( {} , {
          type : 'userCreate' ,
          id : subscriber.id ,
          name : subscriber.name ,
          ssid : subscriber.ssid ,
          micronets : Object.assign ( {} , {
            micronet : []
          } )
        } ) )
        const getmicronet = await hook.app.service ( '/mm/v1/micronets' ).find ()
        logger.debug ( '\n Empty micronet for subscriber  : ' + JSON.stringify ( getmicronet ) )
        return hook

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
