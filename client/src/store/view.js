import axios from 'axios'

export const initialState = () => ({
  micronet: []
})

export const getters = {
  // micronet (state) {
  //   console.log('\n  micronet getters : ' + JSON.stringify(state))
  //   const { micronet } = state
  //   console.log('\n  micronet  : ' + JSON.stringify(state.micronet))
  //   return micronet
  // }
  micronet: state => state.micronet
}

export const mutations = {
  setMicronets (state, list) {
    console.log('\n mutations setMicronets STATE : ' + JSON.stringify(state) + '\t\t\t LIST : ' + JSON.stringify(list))
    state.micronet = list.items
    console.log('\n setMicronets state :  ' + JSON.stringify(state))
  }
}

export const actions = {
  getMicronets ({ commit }) {
    console.log('\n\n ACTIONS GET MICRO-NETS called ')
    const url = `${process.env.BASE_URL}/micronets`
    // return ajax(url)
    //   .then(result => commit('setMicronets', JSON.parse(result)))
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
      })
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
