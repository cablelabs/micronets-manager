import axios from 'axios'
import { findIndex, propEq, find, lensPath, view, set, omit, merge } from 'ramda'

const setState = prop => (state, value) => { state[prop] = value }
const micronetsUrl = `${process.env.BASE_URL}/micronets`
const apiInit = {crossDomain: true, headers: {'Content-type': 'application/json'}}
const msoPortalAuthPostConfig = {
  'clientID': 'https://coloradohealthcare.org/',
  'deviceID': '440c4aa0a4e595c4caa1e4294c6fdcc446444044441d44445fc4c4441cf44f1d',
  'vendor': 'Colorado healthcare',
  'dtype': 'Colorado Bot',
  'model': 'Colorado Bot',
  'serial': 'GG-555555',
  'macAddress': '03:30:93:39:03:3B'
}
const authTokenUri = 'http://localhost:3210/portal/registration/token'
const sessionUri = 'http://localhost:3210/portal/session'
const Ajv = require('ajv')
const ajv = new Ajv()
const Schema = require('../../schemas/micronets')
const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id', '__v'])
const omitStateMeta = omit(['_id', '__v'])
export const initialState = {
  authToken: '',
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
  initializeMicronets ({commit}, {token}) {
    return axios({
      ...{
        crossDomain: true,
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      },
      method: 'get',
      url: sessionUri
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
              commit('setMicronets', mergedMicronet)
            })
        })
        commit('setMicronets', data)
        return data
      })
  },
  fetchAuthToken ({commit, dispatch}) {
    return axios({
      ...apiInit,
      method: 'post',
      url: authTokenUri,
      data: msoPortalAuthPostConfig
    }).then(({data}) => {
      return dispatch('initializeMicronets', {token: data.accessToken})
    })
  },
  fetchSubscribers ({commit, dispatch}, id) {
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
      .then(({data}) => {
        if (!id && !data.length) return dispatch('fetchAuthToken')
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
        // if (!id && !data.length) return dispatch('fetchAuthToken')
        commit(id ? 'replaceMicronet' : 'setMicronets', data)
        return data
      })
  },
  upsertMicronet ({commit}, {id, data}) {
    let dataFormatCheck = Object.assign(omitOperationalStateMeta(data), {timestampUtc: (new Date()).toISOString()})
    const valid = ajv.validate(Schema.Definitions.Subnet, dataFormatCheck)
    console.log('\n AJV ERRORS : ' + JSON.stringify(ajv.errors))
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
    console.log('\n DeviceLens : ' + JSON.stringify(deviceLens))
  // return dispatch('upsertMicronet', {id: micronetId, data: set(deviceLens, data, micronet)})
    return dispatch('upsertMicronet', {id: micronetId, data: set(subnetLens, data, micronet)})
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
