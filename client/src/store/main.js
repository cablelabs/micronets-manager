import axios from 'axios'
import { findIndex, propEq, find, lensPath, view, set } from 'ramda'

const setState = prop => (state, value) => { state[prop] = value }
const micronetsUrl = `${process.env.BASE_URL}/micronets`
const apiInit = { crossDomain: true, headers: { 'Content-type': 'application/json' } }

export const initialState = {
  micronets: [],
  editTargetIds: null
}

export const getters = {

  editTarget (state) {
    if (!state.editTargetIds) return null
    const { micronetId, subnetId, deviceId } = state.editTargetIds
    const micronet = state.micronets.filter(x => x._id === micronetId)[0]
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
    const init = { ...apiInit, method: 'post', url: `${process.env.BASE_URL}/create-mock-micronet`, data: { subnets: 1, hosts: 3 } }
    return axios(init).then(({ data }) => {
      commit('setMicronets', [data])
    })
  },
  fetchMicronets ({ commit, dispatch }) {
    const init = { ...apiInit, method: 'get', url: micronetsUrl }
    return axios(init).then(({ data }) => {
      if (!data.length) return dispatch('initializeMicronets', init)
      commit('setMicronets', data)
      return data
    })
  },
  upsertMicronet ({ commit }, { id, data }) {
    return axios({
      method: id ? 'put' : 'post',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
      data,
      crossDomain: true,
      headers: { 'Content-type': 'application/json' }
    })
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
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
