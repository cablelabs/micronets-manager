const Micronets = require('../models/micronet')
const omit = require('ramda/src/omit')
const axios = require('axios')

const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id'])

class Store {
  constructor(context) {
    this.publish = context.publish
    this.subscribe = context.subscribe
    this.config = context.config
    this.dispatch = this.dispatch.bind(this)
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
    const message = Object.assign(omitOperationalStateMeta(body), { timestampUtc: (new Date()).toISOString() })
    return dispatch('callToMtc', message).then(response => {
      if (response.status === 1000) {
        const error = new Error('Failed to create micronet')
        error.logEvents = response.logEvents
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
}

module.exports = context => new Store(context)
