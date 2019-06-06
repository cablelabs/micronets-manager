const logger = require ( './../../logger' );
const RANDOM_SUBNET_URL = '/mm/v1/allocator/subnets'
const subnetAllocation = require ( '../../hooks/subnetAllocaiton' )
const errors = require('@feathersjs/errors');
const postTestDevices =  [
  {
    deviceMac: "b8:27:eb:df:ae:a7",
    deviceName: "pib",
    deviceId: "Raspberry-Pi3-Model-B-v1.2"
  },
  {
    deviceMac: "b8:27:eb:df:ae:a8",
    deviceName: "pib2",
    deviceId: "Raspberry-Pi3-Model-B-v1.2"
  }
]
module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
      async(hook)=> {
        const {data, params, id } = hook
        const {requestUrl, requestHeaders} = params

        // logger.debug('\n Request Url : ' + JSON.stringify(requestUrl) + '\t ID : ' + JSON.stringify(id) + '\t\t PARAMS : ' + JSON.stringify(params))

        // Generate random subnet
        if( requestUrl == RANDOM_SUBNET_URL) {
              const randomSubnet = await subnetAllocation.getNewSubnet(0)
              logger.debug('\n Random subnet : ' + JSON.stringify(randomSubnet))
              hook.result = Object.assign({},randomSubnet)
        }

        // Generate specific subnet
        if( requestUrl == `${RANDOM_SUBNET_URL}/${params.route.id}`) {
          const specificSubnet = await subnetAllocation.getNewSubnet(0,params.route.id)
          logger.debug('\n Specific subnet : ' + JSON.stringify(specificSubnet))
          hook.result = Object.assign({},specificSubnet)
        }

        // Generate specific subnet and add devices to subnet
        if( requestUrl == `${RANDOM_SUBNET_URL}/${params.route.id}/devices`) {
          const specificSubnet = await subnetAllocation.getNewSubnet(0,params.route.id)
          logger.debug('\n Specific subnet : ' + JSON.stringify(specificSubnet))
          if(specificSubnet){
            const deviceIps = await subnetAllocation.getNewIps(params.route.id,postTestDevices)
            hook.result = Object.assign({}, deviceIps)
          }
        }

      }
    ],
    update: [],
    patch: [],
    remove: [
      async(hook)=> {
        const {data, params, id } = hook
        const {requestUrl, requestHeaders} = params
        let subnetId = params.hasOwnProperty('route').hasOwnProperty('id') ? params.route.id : id
        if(!subnetId){
          return Promise.reject(new errors.GeneralError(new Error('Subnet cannot be de-allocated.Missing subnet ID')))
        }
        // Delete specific subnet
        if( requestUrl == `${RANDOM_SUBNET_URL}/${subnetId}`) {
          subnetId = parseInt(subnetId)
          const deallocatedSubnet = await subnetAllocation.deallocateSubnet(0,subnetId)
          logger.debug('\n Deallocated Subnet : ' + JSON.stringify(deallocatedSubnet))
          hook.result = Object.assign({}, deallocatedSubnet)
        }

      }
    ]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
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
