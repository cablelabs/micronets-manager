import axios from 'axios'

const micronetsUrl = `${process.env.BASE_URL}/micronets`
const apiInit = { crossDomain: true, headers: { 'Content-type': 'application/json' } }

export const initialState = {
  micronets: []
}

export const getters = {
}

export const mutations = {
  setMicronets (state, list) {
    state.micronets = list
  },
  replaceMicronet (state, micronet) {
    const index = state.micronets.findIndex(x => x._id === micronet._id)
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
    .catch(console.error)
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
