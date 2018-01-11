const Micronets = require('../models/micronet')
const axios = require('axios')
const omit = require('ramda/src/omit')
// const findIndex = require('ramda/src/findIndex')
const R = require('ramda')
// const { omit } = require('ramda')

const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id', '__v'])

class Store {
  constructor(context) {
    this.publish = context.publish
    this.subscribe = context.subscribe
    this.config = context.config
    this.dispatch = this.dispatch.bind(this)
    this.timestamp = () => (new Date()).toISOString()
  }
  dispatch (methodName, data) {
    console.log('***dispatch***', methodName);
    if (typeof this[methodName] !== 'function') {
      throw new Error(`Dispatched unknown method: ${methodName}`)
    }
    return this[methodName]({ dispatch: this.dispatch }, data)
  }
  initialize ({ dispatch }) {
    return dispatch('connectToMtc')
  }
  callToMtc ({ dispatch }, message) {
    const { publish, subscribe } = this
    return new Promise(resolve => {
      function handler (response) {
        if (!response) return void 0
        unsubscribe(handler)
        resolve(response)
      }
      const unsubscribe = subscribe(handler)
      if (message) publish(message)
    })
  }
  connectToMtc ({ dispatch }) {
    return dispatch('callToMtc').then(message => {
      if (message.statusCode !== 1)
        throw new Error('Init message not first message received from MTC')
      return message
    })
  }
  createMockMicronet ({ dispatch }, { body }) {
    const { odl } = this.config
    return axios(`${odl.host}:${odl.port}/${odl.initializeUrl}/${body.subnets}/${body.hosts}`)
      .then(message => dispatch('upsertMicronet', { body: message.data } ))
  }
  upsertMicronet ({ dispatch }, { body, params = {} }) {
    const message = Object.assign(omitOperationalStateMeta(body), { timestampUtc: this.timestamp() })
    // console.log(JSON.stringify(message, null, 2))
    return dispatch('callToMtc', message).then(response => {
      if (response.status >= 1000) {
        const error = new Error('Failed to create micronet')
        error.logEvents = response.logEvents
        error.statusCode = 400
        throw error
      }
      return params.id
        ? Micronets.update({ _id: params.id }, response).then(data => ({ data }))
        : (new Micronets(response)).save().then(data => ({ statusCode: 201, data }))
    })
  }
  queryMicronets () {
    return Micronets.find().exec().then(data => ({ data }))
  }
  getMicronetById (_, { params }) {
    return Micronets.findById(params.id).then(data => ({ data }))
  }
  addSubnet ({ dispatch }, { body }) {
    const { micronetId, subnetId, deviceId, macAddress, subnetName, deviceName, deviceDescription } = body
    const data = {
      subnetId,
      deviceList: [{
        deviceId,
        timestampUtc: this.timestamp(),
        mac: { eui48: macAddress }
      }]
    }
    if (subnetName) data.subnetName = subnetName
    if (deviceName) data.deviceList[0].deviceName = deviceName
    if (deviceDescription) data.deviceList[0].deviceDescription = deviceDescription
    return Micronets.findById(micronetId).then(micronet => {
      micronet = JSON.parse(JSON.stringify(micronet))
      const isSubnet = x => x.subnetId === subnetId
      let subnetIdx = R.findIndex(isSubnet)(micronet.subnets)
      if (subnetIdx < 0) return R.set(
        R.lensPath(['subnets', micronet.subnets.length]),
        data,
        micronet
      )
      const subnet = micronet.subnets[subnetIdx]
      const isDevice = x => x.deviceId === deviceId
      const deviceIdx = R.findIndex(isDevice)(subnet.deviceList)
      data.deviceList = deviceIdx < 0
        ? R.concat(subnet.deviceList, data.deviceList)
        : R.adjust(R.merge(R.__, data.deviceList[0]), deviceIdx, subnet.deviceList)
      return R.set(
        R.lensPath(['subnets', subnetIdx]),
        R.merge(subnet, data),
        micronet
      )
    })
    .then(updated => {
      return dispatch('upsertMicronet', { body: updated, params: { id: micronetId } })
    })
  }
}

module.exports = context => new Store(context)
