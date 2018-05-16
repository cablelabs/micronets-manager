const Micronets = require('../models/micronet')
const axios = require('axios')
const omit = require('ramda/src/omit')
const R = require('ramda')
const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id', '__v', 'id', 'devices', 'name', 'ssid'])

class Store {
  constructor (context) {
    this.publish = context.publish
    this.subscribe = context.subscribe
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

  callToMtc ({dispatch}, message) {
    const {publish, subscribe} = this
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

  connectToMtc ({dispatch}) {
    return dispatch('callToMtc').then(message => {
      if (message.statusCode !== 1)
        throw new Error('Init message not first message received from MTC')
      return message
    })
  }

  createMockMicronet ({dispatch}, {body}) {
    const {odl} = this.config
    return axios(`${odl.host}:${odl.port}/${odl.initializeUrl}/${body.subnets}/${body.hosts}`)
      .then(message => body.subscriber ? dispatch('upsertInitMicronet', {
        body: {
          message: message.data,
          subscriber: body.subscriber
        }
      }) : dispatch('upsertMicronet', {body: message.data}))
  }

  upsertInitMicronet ({dispatch}, {body, params = {}}) {
    const message = Object.assign(omitOperationalStateMeta(body.message), {timestampUtc: this.timestamp()})
    // console.log(JSON.stringify(message, null, 2))
    return dispatch('callToMtc', message).then(response => {
      let mergedMicronet = Object.assign({}, response, body.subscriber)
      if (response.status >= 1000) {
        const error = new Error('Failed to create micronet')
        error.logEvents = response.logEvents
        error.statusCode = 400
        throw error
      }
      return params.id
        ? Micronets.findById(params.id).then((data) => {
          let prevLogEvents = data.logEvents
          let allLogEvents = R.concat(prevLogEvents, response.logEvents)
          let updatedResponse = Object.assign(response, {logEvents: allLogEvents})
          return Micronets.update({_id: params.id}, updatedResponse).then(data => ({data}))
        })
        : (new Micronets(mergedMicronet).save().then(data => ({statusCode: 201, data})))
    })
  }

  upsertMicronet ({dispatch}, {body, params = {}}) {
    console.log('\n  UpsertMicronet server body : ' + JSON.stringify(body) +'\t\t\t Params : ' + JSON.stringify(params))
    body.subnets = body.data ? body.data.subnets : body.subnets
    body.subnets = Array.isArray(body.subnets) ? R.flatten(body.subnets) : body.subnets
    console.log('\n\n\n UpsertMicronet server updated body subnets : ' + JSON.stringify(body.subnets))
    console.log('\n\n\n UpsertMicronet server updated body  : ' + JSON.stringify(body))
    const message = !body.event ? Object.assign(omitOperationalStateMeta(body), {timestampUtc: this.timestamp()}) :
    Object.assign(omitOperationalStateMeta(body.data), {timestampUtc: this.timestamp()})
    console.log('\n UpsertMicronet server MTC Message : ' + JSON.stringify(message))
    let mergedMicronet = {}
    return dispatch('callToMtc', message).then(response => {
      console.log('\n UpsertMicronet server MTC response : ' + JSON.stringify(response))
      if (body.data && body.event) {
         console.log('\n UpsertMicronet server Event ' + JSON.stringify(body.event) + ' found in upsertMicronet')
        mergedMicronet = Object.assign({}, {
          devices:body.data.devices,
          id:body.data.id,
          ssid:body.data.ssid,
          name:body.data.name,
          _id:body.data._id
        }, response);
         console.log('\n\n UpsertMicronet server UpsertMicronet mergedMicronet : ' + JSON.stringify(mergedMicronet))
      }
      if (response.statusCode >= 1000) {
        console.log('\n MTC error response : ' + JSON.stringify(response.status))
        const error = new Error('Failed to create micronet')
        error.logEvents = response.logEvents
        error.statusCode = 400
        throw error
      }
      if (response.statusCode === 0 && response.statusText === "Success!") {
        console.log('\n MTC response statusCode : ' + JSON.stringify(response.statusCode) + '\t\t Updating database')
        return params.id
          ? Micronets.findById(params.id).then((data) => {
            console.log('\n UpsertMicronet server Micronet found data : ' + JSON.stringify(data) +'\t\t\t Params.id : ' + JSON.stringify(params.id))
            let prevLogEvents = data.logEvents
            let allLogEvents = R.concat(prevLogEvents, response.logEvents)
            let updatedResponse =  body.data && body.event ? Object.assign(mergedMicronet, {logEvents: allLogEvents}) : Object.assign(response, {logEvents: allLogEvents})
            console.log('\n\n UpsertMicronet server updatedResponse : ' + JSON.stringify(updatedResponse))
            return Micronets.update({_id: params.id}, updatedResponse).then(data => ({data}))
          })
          : (new Micronets(response)).save().then(data => ({statusCode: 201, data}))
      }
      // return params.id
      //   ? Micronets.findById(params.id).then((data) => {
      //     console.log('\n UpsertMicronet server Micronet found data : ' + JSON.stringify(data) +'\t\t\t Params.id : ' + JSON.stringify(params.id))
      //     let prevLogEvents = data.logEvents
      //     let allLogEvents = R.concat(prevLogEvents, response.logEvents)
      //     let updatedResponse =  body.data && body.event ? Object.assign(mergedMicronet, {logEvents: allLogEvents}) : Object.assign(response, {logEvents: allLogEvents})
      //     console.log('\n\n UpsertMicronet server updatedResponse : ' + JSON.stringify(updatedResponse))
      //     return Micronets.update({_id: params.id}, updatedResponse).then(data => ({data}))
      //   })
      //   : (new Micronets(response)).save().then(data => ({statusCode: 201, data}))
    })
  }

  queryMicronets () {
    return Micronets.find().exec().then(data => ({data}))
  }

  getMicronetById (_, {params}) {
    return Micronets.findById(params.id).then(data => ({data}))
  }

  addSubnets({dispatch}, {body}) {
    const {data, micronetId} = body
    console.log('\n Add-Subnets server passed data : ' + JSON.stringify(data) + '\t\t\t Micronet ID : ' + JSON.stringify(micronetId))
    return Micronets.findById(micronetId).then(micronet => {
        micronet = JSON.parse(JSON.stringify(micronet))
        console.log('\n\n Add-Subnets Micro-net found : ' + JSON.stringify(micronet))
        console.log('\n\n Add-Subnets Micronet subnets : ' + JSON.stringify(micronet.subnets))
        const isSubnet = x => x.subnetId === subnetId
        console.log('\n\n Add-Subnets isSubnet : ' + JSON.stringify(isSubnet))
        let subnetIdx = R.findIndex(isSubnet)(micronet.subnets)
        console.log('\n\n Add-Subnets subnetIdx : ' + JSON.stringify(subnetIdx))
        if (subnetIdx < 0) return R.set(
          R.lensPath(['subnets', micronet.subnets.length]),
          data,
          micronet
        )
        const subnet = micronet.subnets[subnetIdx]
        console.log('\n\n Add-Subnets subnet : ' + JSON.stringify(subnet))
        const isDevice = x => x.deviceId === deviceId
        console.log('\n\n Add-Subnets isDevice : ' + JSON.stringify(isDevice))
        const deviceIdx = R.findIndex(isDevice)(subnet.deviceList)
        console.log('\n\n Add-Subnets deviceIdx : ' + JSON.stringify(deviceIdx))
        data.deviceList = deviceIdx < 0
          ? R.concat(subnet.deviceList, data.deviceList)
          : R.adjust(R.merge(R.__, data.deviceList[0]), deviceIdx, subnet.deviceList)
        console.log('\n\n Add-Subnets data.deviceList : ' + JSON.stringify(data.deviceList))
        return R.set(
          R.lensPath(['subnets', subnetIdx]),
          R.merge( Array.isArray(subnet) ? R.flatten(subnet) : subnet, Array.isArray(data) ? R.flatten(data) : data),
          micronet
        )
      })
      .then(updated => {
        console.log('\n Add-Subnets before  upsertMicronet: ' + JSON.stringify(updated))
        return dispatch('upsertMicronet', {body: updated, params: {id: micronetId}})
      })
  }
  addSubnetToMicronet ({dispatch}, {body}) {
    console.log('\n Server addSubnetToMicronet called with body : ' + JSON.stringify(body))
    const {micronetId, subnetId, deviceId, macAddress, subnetName, deviceName, deviceDescription} = body
    console.log('\n Server addSubnetToMicronet  server MicronetId : ' + JSON.stringify(micronetId))
    const data = {
      subnetId,
      deviceList: [{
        deviceId,
        timestampUtc: this.timestamp(),
        mac: {eui48: macAddress}
      }]
    }
    console.log('\n\n Server addSubnetToMicronet  server data : ' + JSON.stringify(data))
    if (subnetName) data.subnetName = subnetName
    if (body.hasOwnProperty('class')) data.class = body.class
    if (deviceName) data.deviceList[0].deviceName = deviceName
    if (deviceDescription) data.deviceList[0].deviceDescription = deviceDescription
    console.log('\n addSubnetToMicronet server tweaked data : ' + JSON.stringify(data))
    return Micronets.findById(micronetId).then(micronet => {
        micronet = JSON.parse(JSON.stringify(micronet))
        console.log('\n\n addSubnetToMicronet  server Micro-net found : ' + JSON.stringify(micronet))
        console.log('\n\n addSubnetToMicronet  server Micronet subnets : ' + JSON.stringify(micronet.subnets))
        const isSubnet = x => x.subnetId === subnetId
        console.log('\n\n addSubnetToMicronet  isSubnet : ' + JSON.stringify(isSubnet))
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
        console.log('\n addSubnetToMicronet  server Micronet before  upsertMicronet: ' + JSON.stringify(updated))
        return dispatch('upsertMicronet', {body: updated, params: {id: micronetId}})
      })
  }

  addSubnet ({dispatch}, {body}) {
    console.log('\n AddSubnet server body : ' + JSON.stringify(body))
    const {micronetId, subnetId, deviceId, macAddress, subnetName, deviceName, deviceDescription} = body
    console.log('\n\n AddSubnet server body.macAddress : ' + JSON.stringify(body.macAddress))
    //console.log('\n\n AddSubnet server body.mac.eui48 : ' + JSON.stringify(body.mac.eui48))
    console.log('\n AddSubnet server MicronetId : ' + JSON.stringify(micronetId))
    const data = {
      subnetId,
      deviceList: [{
        deviceId,
        timestampUtc: this.timestamp(),
        mac: {eui48: body.macAddress ? macAddress : body.mac.eui48}
      }]
    }
    console.log('\n\n AddSubnet server data : ' + JSON.stringify(data))
    if (subnetName) data.subnetName = subnetName
    if (body.hasOwnProperty('class')) data.class = body.class
    if (deviceName) data.deviceList[0].deviceName = deviceName
    if (deviceDescription) data.deviceList[0].deviceDescription = deviceDescription
    console.log('\n AddSubnet server tweaked data : ' + JSON.stringify(data))
    return Micronets.findById(micronetId).then(micronet => {
        micronet = JSON.parse(JSON.stringify(micronet))
        console.log('\n\n AddSubnet server Micro-net found : ' + JSON.stringify(micronet))
        console.log('\n\n AddSubnet server Micronet subnets : ' + JSON.stringify(micronet.subnets))
        const isSubnet = x => x.subnetId === subnetId
        console.log('\n\n isSubnet : ' + JSON.stringify(isSubnet))
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
        console.log('\n AddSubnet server Micronet before  upsertMicronet: ' + JSON.stringify(updated))
        return dispatch('upsertMicronet', {body: updated, params: {id: micronetId}})
      })
  }
}

module.exports = context => new Store(context)