import axios from 'axios'

export const initialState = {
  micronet: []
}

export const getters = {
  micronet: state => state.micronet
}

export const mutations = {
  setMicronets (state, list) {
    console.log('\n STATE BEFORE MUTATIONS : ' + JSON.stringify(state) + '\t\t\t LIST : ' + JSON.stringify(list))
    state.micronet = list.items
    console.log('\n STATE AFTER  MUTATIONS :  ' + JSON.stringify(state))
  }
}

export const actions = {
  fetchMicronets ({ commit }) {
    console.log('\n\n ACTIONS FETCH MICRO-NETS  ')
    const url = `${process.env.BASE_URL}/micronets`
    return axios({
      method: 'get',
      url,
      crossDomain: true,
      headers: { 'Content-type': 'application/json' }
    })
      .then(response => {
        console.log('\n AXIOS RESPONSE : ' + JSON.stringify(response.data))
        const { data } = response
        commit('setMicronets', data)
        return data
      })
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
