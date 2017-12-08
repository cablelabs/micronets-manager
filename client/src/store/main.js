import axios from 'axios'

const micronetsUrl = `${process.env.BASE_URL}/micronets`

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
  fetchMicronets ({ commit, dispatch }) {
    const init = {
      method: 'get',
      url: micronetsUrl,
      crossDomain: true,
      headers: { 'Content-type': 'application/json' }
    }
    return axios(init).then(({ data }) => {
      if (!data.items.length) return dispatch('initializeMicronets', init)
      commit('setMicronets', data.items)
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
