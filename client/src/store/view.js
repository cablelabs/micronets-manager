import ajax from '../utils/ajax'

export const initialState = () => ({
  micronet: {}
})

export const getters = {
  micronet (state) {
    console.log('\n state object in micronets getters : ' + JSON.stringify(state))
    const { items } = state.micronet
    return items
  }
}

export const mutations = {
  setMicronets (state, list) {
    console.log('\n mutations setMicronets STATE : ' + JSON.stringify(state) + '\t\t\t LIST : ' + JSON.stringify(list))
    state.micronet = list
    console.log('\n state.micronet :  ' + JSON.stringify(state.micronet))
  }
}

export const actions = {
  getMicronets ({ commit }) {
    console.log('\n\n ACTIONS GET MICRO-NETS called ')
    const url = `${process.env.BASE_URL}/micronets`
    return ajax(url)
      .then(result => commit('setMicronets', JSON.parse(result)))
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
