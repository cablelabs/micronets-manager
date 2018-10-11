const { authenticate } = require ( '@feathersjs/authentication' ).hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const errors = require('@feathersjs/errors')
const mongoose = require('mongoose');


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
        return hook.app.service ( 'mm/v1/micronets/users' ).find ( { query : { id : params.query.id } } )
          .then ( ( { data } ) => {
              if(data[0].id && !mongoose.Types.ObjectId.isValid(data[0].id))
              {
                const originalUser = data[ 0 ];
                const foundDeviceIndex = originalUser.devices.findIndex( device => device.clientId ==  hook.data.clientId && device.deviceId == hook.data.deviceId && device.macAddress == hook.data.macAddress && device.class == hook.data.class);

                if(foundDeviceIndex >= 0 ) {
                  console.log('\n Device already present.')
                  if(data.isRegistered == originalUser.devices[foundDeviceIndex].isRegistered) {
                    return Promise.resolve(hook)
                  }

                  if((data.isRegistered != originalUser.devices[foundDeviceIndex].isRegistered) || (data.isRegistered == !originalUser.devices[foundDeviceIndex].isRegistered)) {
                    let updatedDevice = Object.assign(originalUser.devices[foundDeviceIndex], {isRegistered: true, deviceLeaseStatus:"intermediary"})
                    let updatedUser = Object.assign ( {} , originalUser , updatedDevice);
                    hook.data =  Object.assign ( {} , updatedUser );
                    hook.app.service ( 'mm/v1/micronets/users' ).emit ( 'userDeviceRegistered' , {
                      type : 'userDeviceRegistered' ,
                      data : { subscriberId : hook.data.id , device : updatedDevice }
                    } );
                  }

                }
                if(foundDeviceIndex == -1 ) {
                  let updatedUser = Object.assign ( {} , originalUser , originalUser.devices.push ( hook.data ) );
                  console.log ( '\n Updated user : ' + JSON.stringify ( updatedUser ) )
                  hook.data =  Object.assign ( {} , updatedUser );
                  hook.app.service ( 'mm/v1/micronets/users' ).emit ( 'userDeviceAdd' , {
                    type : 'userDeviceAdd' ,
                    data : { subscriberId : hook.data.id , device : hook.data }
                  } );
                  // return Promise.resolve(hook)
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
       console.log('\n AFTER USER CREATE HOOK RESULT : .. ' + JSON.stringify(hook.result))
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
      }
    ] ,
    update : [
      async(hook) => {
        console.log('\n AFTER UPDATE HOOK : ' + JSON.stringify(hook.result))
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
        console.log ( '\n  Users patch result : ' + JSON.stringify ( hook.result ) )
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
