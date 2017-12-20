import axios from 'axios'
import { findIndex, propEq, find, lensPath, view, set } from 'ramda'

const setState = prop => (state, value) => { state[prop] = value }
const micronetsUrl = `${process.env.BASE_URL}/micronets`
const apiInit = { crossDomain: true, headers: { 'Content-type': 'application/json' } }

export const initialState = {
  micronets: [],
  editTargetIds: {}
}

export const getters = {
  editTarget (state) {
    if (!state.editTargetIds) return null
    const { micronetId, subnetId, deviceId } = state.editTargetIds
    const micronet = state.micronets.filter(x => x._id === micronetId)[0]
    if (!subnetId) return micronet
    const subnet = micronet.subnets.filter(x => x.subnetId === subnetId)[0]
    return !deviceId ? subnet : subnet.deviceList.filter(x => x.deviceId === deviceId)[0]
  }
}

export const mutations = {
  setMicronets: setState('micronets'),
  setEditTargetIds (state, { micronetId, subnetId, deviceId }) {
    state.editTargetIds = { micronetId, subnetId, deviceId }
  },
  replaceMicronet (state, micronet) {
    const index = findIndex(propEq('_id', micronet._id), state.micronets)
    if (index < 0) return state.micronets.push(micronet)
    return state.micronets.splice(index, 1, micronet)
  }
}

export const actions = {
  initializeMicronets ({ commit }) {
    return axios({
      ...apiInit,
      method: 'post',
      url: `${process.env.BASE_URL}/create-mock-micronet`,
      data: { subnets: 1, hosts: 3 }
    })
    .then(({ data }) => {
      commit('setMicronets', [data])
    })
  },
  fetchMicronets ({ commit, dispatch }, id) {
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
    .then(({ data }) => {
      if (!id && !data.length) return dispatch('initializeMicronets')
      commit(id ? 'replaceMicronet' : 'setMicronets', data)
      return data
    })
  },
  upsertMicronet ({ commit }, { id, data }) {
    return axios(Object.assign({}, apiInit, {
      method: id ? 'put' : 'post',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
      data
    }))
    .then(response => commit('replaceMicronet', response.data))
    .catch(error => {
      console.log('AXIOS error', error.response)
    })
  },
  saveMicronet ({ state, dispatch }, data) {
    const { micronetId, subnetId, deviceId } = state.editTargetIds
    const micronet = find(propEq('_id', micronetId))(state.micronets)
    const subnetIndex = findIndex(propEq('subnetId', subnetId))(micronet.subnets)
    const subnetLens = lensPath(['subnets', subnetIndex])
    if (!deviceId) return dispatch('upsertMicronet', { id: micronetId, data: set(subnetLens, data, micronet) })
    const deviceIndex = findIndex(propEq('deviceId', deviceId), view(subnetLens, micronet).deviceList)
    const deviceLens = lensPath(['subnets', subnetIndex, 'deviceList', deviceIndex])
    return dispatch('upsertMicronet', { id: micronetId, data: set(deviceLens, data, micronet) })
  },
  addSubnet ({ state, commit, dispatch }, data) {
    const { micronetId } = state.editTargetIds
    return axios({
      ...apiInit,
      method: 'post',
      url: `${process.env.BASE_URL}/add-subnet`,
      data: { ...data, micronetId }
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
