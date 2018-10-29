const Micronets = require('../models/micronet')
const axios = require('axios')
const omit = require('ramda/src/omit')
const R = require('ramda')
const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id', '__v', 'id', 'devices', 'name', 'ssid'])
const apiInit = {crossDomain: true}
const apiInitPost = {crossDomain: true, headers: {'Content-type': 'application/json'}}

class Store {
  constructor (context) {
    this.config = context.config
    this.dispatch = this.dispatch.bind(this)
    this.timestamp = () => (new Date()).toISOString()
  }

  dispatch (methodName, data) {
    console.log('***dispatch***', methodName)
    if (typeof this[methodName] !== 'function') {
      throw new Error(`Dispatched unknown method: ${methodName}`)
    }
    return this[methodName]({dispatch: this.dispatch}, data)
  }

  initialize ({dispatch}) {
    return dispatch('connectToMtc')
  }

  queryMicronets () {
    return Micronets.find().exec().then(data => ({data}))
  }

  getMicronetById (_, {params}) {
    return Micronets.findById(params.id).then(data => ({data}))
  }

}

module.exports = context => new Store(context)
