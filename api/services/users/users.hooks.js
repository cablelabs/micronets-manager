const { authenticate } = require ( '@feathersjs/authentication' ).hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const errors = require('@feathersjs/errors')
const mongoose = require('mongoose');
const axios = require ( 'axios' );

module.exports = {
  before : {
    all : [  ] ,
    find : [] ,
    get : [ authenticate ( 'jwt' ),
      hook => {
        const {params, id} = hook
        const query = Object.assign({ id: id ? id : params.id }, hook.params.query);
        return hook.app.service('/mm/v1/micronets/users').find({ query })
          .then(({data}) => {
            if(data.length === 1) {
              hook.result = omitMeta(data[0]);
            }
          })
      }
    ] ,
    create : [ authenticate ( 'jwt' ),
      ( hook ) => {
        const {data } = hook;
        hook.data = Object.assign({}, {
          id: data.id,
          name: data.name,
          ssid: data.ssid,
          devices : [data.devices]
        })
        // hook.app.service ( '/mm/v1/micronets/users' ).emit ( 'userCreate' , {
        //   type : 'userCreate' ,
        //   data : { subscriberId : hook.data.id  }
        // } );
      }
    ] ,
    update : [] ,
    patch : [ authenticate ( 'jwt' ),
      (hook) => {
        const { params, data, id } = hook;
        hook.params.mongoose = {
          runValidators: true,
          setDefaultsOnInsert: true
        }
        return hook.app.service ( 'mm/v1/micronets/users' ).find ( { query : { id : params.query.id || hook.id } } )
          .then ( ( { data } ) => {
              if(data[0].id && !mongoose.Types.ObjectId.isValid(data[0].id))
              {
                if(hook.data.devices && hook.data.deleteRegisteredDevices == true) {
                  const originalUser = data[ 0 ];
                  let updatedUser = Object.assign ( {} , {...originalUser}, { devices: hook.data.devices });
                  hook.data =  Object.assign ( {} , updatedUser );
                  // return Promise.resolve(hook)
                }
                else {
                  const originalUser = data[ 0 ];
                  const foundDeviceIndex = originalUser.devices.findIndex( device => device.clientId ==  hook.data.clientId && device.deviceId == hook.data.deviceId && device.macAddress == hook.data.macAddress && device.class == hook.data.class);

                  if(foundDeviceIndex >= 0 ) {
                    if(hook.data.isRegistered == true && originalUser.devices[foundDeviceIndex].isRegistered == true) {
                       // return Promise.resolve(hook)
                    }

                    if(hook.data.isRegistered == true && originalUser.devices[foundDeviceIndex].isRegistered == false) {
                      let updatedDevice = Object.assign(originalUser.devices[foundDeviceIndex], {isRegistered: true, deviceLeaseStatus:"intermediary"})
                      let updatedUser = Object.assign ( {} , originalUser , updatedDevice);
                      hook.data =  Object.assign ( {} , updatedUser );
                      hook.app.service ( 'mm/v1/micronets/users' ).emit ( 'userDeviceRegistered' , {
                        type : 'userDeviceRegistered' ,
                        data : { subscriberId : hook.data.id , device : updatedDevice }
                      } );
                      // return Promise.resolve(hook)
                    }

                  }
                  if(foundDeviceIndex == -1 ) {
                    let updatedUser = Object.assign ( {} , originalUser , originalUser.devices.push ( hook.data ) );
                    hook.data =  Object.assign ( {} , updatedUser );
                    hook.app.service ( 'mm/v1/micronets/users' ).emit ( 'userDeviceAdd' , {
                      type : 'userDeviceAdd' ,
                      data : { subscriberId : hook.data.id , device : hook.data }
                    } );
                   //  return Promise.resolve(hook)
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
    create : [
      async(hook) => {
        const { params  , payload } = hook;
        const { headers: { Authorization }} = params
        let axiosConfig = { headers : { 'Authorization' : Authorization , crossDomain: true } };
        const user = hook.result
        const postMicronet = await hook.app.service('/mm/v1/micronets').create(Object.assign({},{
          type: 'userCreate',
          id : user.id ,
          name : user.name ,
          ssid : user.ssid ,
          micronets : Object.assign ( {} , {
            micronet : []
          } )
        }))
        const registry = await hook.app.service('/mm/v1/micronets/registry').get(user.id)
        const userPostData = Object.assign({
          id : user.id ,
          name : user.name ,
          ssid : user.ssid ,
          mmUrl:registry.mmClientUrl
        })
        const msoPortalUser = await axios ( {
          ...axiosConfig ,
          method : 'POST' ,
          url : `${registry.msoPortalUrl}/portal/users` ,
          data : userPostData
        } )
      }
    ] ,
    update : [
      async(hook) => {
        hook.app.service ( '/mm/v1/micronets/users' ).emit ( 'userDeviceUpdate' , {
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
