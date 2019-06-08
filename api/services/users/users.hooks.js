const { authenticate } = require ( '@feathersjs/authentication' ).hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const logger = require ( './../../logger' );
const paths = require('./../../hooks/servicePaths')
const { USERS_PATH  } = paths

module.exports = {
  before : {
    all : [  ] ,
    find : [] ,
    get : [ authenticate ( 'jwt' ),
      hook => {
        const {params, id} = hook
        const query = Object.assign({ id: id ? id : params.id }, hook.params.query);
        return hook.app.service(`${USERS_PATH}`).find({ query })
          .then(({data}) => {
            if(data.length === 1) {
              hook.result = omitMeta(data[0]);
            }
          })
      }
    ] ,
    create : [
      ( hook ) => {
        const {data } = hook;
        hook.data = Object.assign({}, {
          id: data.id,
          name: data.name,
          ssid: data.ssid,
          devices : Array.isArray(data.devices) ? data.devices: [data.devices]
        })
      }
    ] ,
    update : [] ,
    patch : [ authenticate ( 'jwt' ),
      (hook) => {
        const { params, data, id } = hook;
        const postData = hook.data
        const queryId = params.hasOwnProperty('query') && params.query.hasOwnProperty('id') ? params.query.id : hook.id
        return hook.app.service ( `${USERS_PATH}` ).find ( { query : { id : queryId } } )
          .then ( ( { data } ) => {
              if(data[0].id)
              {
                if(hook.data.devices && hook.data.deleteRegisteredDevices == true) {
                  const originalUser = data[ 0 ];
                  let updatedUser = Object.assign ( {} , {...originalUser}, { devices: hook.data.devices });
                  hook.data =  Object.assign ( {} , updatedUser );
                  // return Promise.resolve(hook)
                }
                else {
                  const originalUser = data[ 0 ];
                  const foundDeviceIndex = originalUser.devices.findIndex( device =>  device.deviceId == hook.data.deviceId && device.macAddress == hook.data.macAddress && device.class == hook.data.class);
                  if(foundDeviceIndex >= 0 ) {
                    if(hook.data.isRegistered == true && originalUser.devices[foundDeviceIndex].isRegistered == true) {
                        return Promise.resolve(hook)
                    }

                    if(hook.data.isRegistered == true && originalUser.devices[foundDeviceIndex].isRegistered == false) {
                      let updatedDevice = Object.assign(originalUser.devices[foundDeviceIndex], {isRegistered: true, deviceLeaseStatus:"intermediary"})
                      let updatedUser = Object.assign ( {} , originalUser , updatedDevice);
                      hook.data =  Object.assign ( {} , updatedUser );
                      logger.debug('\n Device Registered. Updated user : ' + JSON.stringify(hook.data))
                      hook.app.service ( `${USERS_PATH}` ).emit ( 'userDeviceRegistered' , {
                        type : 'userDeviceRegistered' ,
                        data : { subscriberId : hook.data.id , device : updatedDevice }
                      } );
                       return Promise.resolve(hook)
                    }

                  }
                  if(foundDeviceIndex == -1 ) {
                    let updatedUser = Object.assign ( {} , originalUser , originalUser.devices.push ( hook.data ) );
                    logger.debug('\n Added device to user' + JSON.stringify(updatedUser))
                    hook.data =  Object.assign ( {} , updatedUser );
                    hook.app.service ( `${USERS_PATH}` ).emit ( 'userDeviceAdd' , {
                      type : 'userDeviceAdd' ,
                      data : { subscriberId : hook.data.id , device : hook.data }
                    } );
                     return Promise.resolve(hook)
                  }
                }
              }
            }
          )
      }
    ] ,
    remove : []
  } ,

  after : {
    all : [] ,
    find : [] ,
    get : [] ,
    create : [] ,
    update : [
      async(hook) => {
        hook.app.service (`${USERS_PATH}`).emit ( 'userDeviceUpdate' , {
          type : 'userDeviceUpdate' ,
          data : { subscriberId : hook.result.id, devices:hook.result.devices  }
        } );
      }
    ] ,
    patch : [
      hook => {
        const { params , data , payload } = hook;
        hook.result = omitMeta ( hook.data );
        return Promise.resolve(hook)
      }
    ] ,
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
