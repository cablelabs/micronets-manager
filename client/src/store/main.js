import axios from 'axios'
import { findIndex, propEq, find, lensPath, view, set, omit, merge } from 'ramda'

const setState = prop => (state, value) => { state[prop] = value }
const micronetsUrl = `${process.env.BASE_URL}/micronets`
const apiInit = {crossDomain: true, headers: {'Content-type': 'application/json'}}
const msoPortalApiInit = {
  crossDomain: true,
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6ImFjY2VzcyIsInR5cGUiOiJhY2Nlc3MifQ.eyJjbGllbnRJRCI6Imh0dHBzOi8vYXBwbGVoZWFsdGgub3JnLyIsImRldmljZUlEIjoiOTkwYzlhYTBhOWU1OTVjOGNhYTllOTI5OGM2ZmRiYjQ4Njk5OTA4ODU1OWQ0NTk5NWZjNGM4ODQxY2Y1NWY4ZSIsInZlbmRvciI6IkFwcGxlIGdvbGQgc2hpdCIsImR0eXBlIjoiQXBwbGUgZ29sZCBzaGl0IiwibW9kZWwiOiJBcHBsZSBnb2xkIHNoaXQiLCJzZXJpYWwiOiJGQi05OTk5OSIsIm1hY0FkZHJlc3MiOiIwOTowMDo5OTo5OTowOTpGQiIsImlhdCI6MTUyMjYzNTU1NiwiZXhwIjoxNTIyNzIxOTU2LCJhdWQiOiJtaWNyb25ldHMuY29tIiwiaXNzIjoiaHR0cHM6Ly9tc28tcG9ydGFsLm1pY3JvbmV0cy5jb20iLCJzdWIiOiJJbml0aWF0ZSByZWdpc3RyYXRpb24gdG8gb24tYm9hcmQgZGV2aWNlIiwianRpIjoiODRiMDUyOGItZWJiMC00ZWZhLWE5OWItNThjMWJhNjM4NjliIn0.iVd1a8wqax7NUW-q90cARNjjn6I1q2ab7SnjZQGmPLc',
    'Content-type': 'application/json'
  }
}
const Ajv = require('ajv')
const ajv = new Ajv()
const Schema = require('../../schemas/micronets')
const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id', '__v'])
const omitStateMeta = omit(['_id', '__v'])
export const initialState = {
  micronets: [],
  editTargetIds: {},
  toast: {
    show: false,
    value: ''
  }
}

export const getters = {
  editTarget (state) {
    if (!state.editTargetIds) return null
    const {micronetId, subnetId, deviceId} = state.editTargetIds
    const micronet = state.micronets.filter(x => x._id === micronetId)[0]
    if (!subnetId) return micronet
    const subnet = micronet.subnets.filter(x => x.subnetId === subnetId)[0]
    return !deviceId ? subnet : subnet.deviceList.filter(x => x.deviceId === deviceId)[0]
  }
}

export const mutations = {
  setMicronets: setState('micronets'),
  setEditTargetIds (state, {micronetId, subnetId, deviceId}) {
    state.editTargetIds = {micronetId, subnetId, deviceId}
  },
  replaceMicronet (state, micronet) {
    const index = findIndex(propEq('_id', micronet._id), state.micronets)
    if (index < 0) return state.micronets.push(micronet)
    return state.micronets.splice(index, 1, micronet)
  },
  setToast (state, {show, value}) {
    const formattedValue = value.charAt(0).toUpperCase() + value.slice(1)
    state.toast = {show, value: formattedValue}
  }
}

export const actions = {
  initializeMicronets ({commit}) {
    return axios({
      ...msoPortalApiInit,
      method: 'get',
      url: 'http://localhost:3210/portal/session'
    })
      .then((response) => {
        let {data} = response.data
        data.map((subscriber, index) => {
          subscriber = Object.assign({}, omitStateMeta(subscriber))
          axios({
            ...apiInit,
            method: 'post',
            url: `${process.env.BASE_URL}/create-mock-micronet`,
            data: {subnets: 1, hosts: 0, subscriber: subscriber}
          })
            .then(({data}) => {
              let mergedMicronet = merge(subscriber, data)
              commit('setMicronets', [data])
            })
        })
        commit('setMicronets', data)
        return data
      })
  },
  fetchSubscribers ({commit, dispatch}, id) {
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
      .then(({data}) => {
        if (!id && !data.length) return dispatch('initializeMicronets')
        commit(id ? 'replaceMicronet' : 'setMicronets', data)
        return data
      })
  },
  fetchMicronets ({commit, dispatch}, id) {
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
      .then(({data}) => {
        if (!id && !data.length) return dispatch('initializeMicronets')
        commit(id ? 'replaceMicronet' : 'setMicronets', data)
        return data
      })
  },
  upsertMicronet ({commit}, {id, data}) {
    let dataFormatCheck = Object.assign(omitOperationalStateMeta(data), {timestampUtc: (new Date()).toISOString()})
    const valid = ajv.validate(Schema.Definitions.Subnet, dataFormatCheck)
    return valid === true ? axios(Object.assign({}, apiInit, {
      method: id ? 'put' : 'post',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
      data
    }))
      .then(response => commit('replaceMicronet', response.data))
      .catch(error => {
        console.log('AXIOS error', error.response)
      }) : commit('setToast', {show: true, value: ajv.errors[0].message})
  },
  upsertInitMicronet ({commit}, {id, data}) {
    axios(Object.assign({}, apiInit, {
      method: 'post',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
      data
    }))
      .then(response => commit('replaceMicronet', response.data))
      .catch(error => {
        console.log('AXIOS error', error.response)
      })
  },
  saveMicronet ({state, dispatch}, data) {
    const {micronetId, subnetId, deviceId} = state.editTargetIds
    const micronet = find(propEq('_id', micronetId))(state.micronets)
    const subnetIndex = findIndex(propEq('subnetId', subnetId))(micronet.subnets)
    const subnetLens = lensPath(['subnets', subnetIndex])
    if (!deviceId) return dispatch('upsertMicronet', {id: micronetId, data: set(subnetLens, data, micronet)})
    const deviceIndex = findIndex(propEq('deviceId', deviceId), view(subnetLens, micronet).deviceList)
    const deviceLens = lensPath(['subnets', subnetIndex, 'deviceList', deviceIndex])
    return dispatch('upsertMicronet', {id: micronetId, data: set(deviceLens, data, micronet)})
  },
  addSubnet ({state, commit, dispatch}, data) {
    const {micronetId} = state.editTargetIds
    return axios({
      ...apiInit,
      method: 'post',
      url: `${process.env.BASE_URL}/add-subnet`,
      data: {...data, micronetId}
    })
      .then(() => dispatch('fetchMicronets', micronetId))
      .then(() => commit('setEditTargetIds', {}))
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
