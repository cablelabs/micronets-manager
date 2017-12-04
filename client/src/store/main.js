import axios from 'axios'

export const initialState = {
  micronets: []
}

export const getters = {
}

export const mutations = {
  setMicronets (state, list) {
    state.micronets = list
  }
}

export const actions = {
  initializeMicronets ({ commit }, init) {
    init = Object.assign({}, init, { url: `${process.env.BASE_URL}/initialize/1/3` })
    return axios(init).then(({ data }) => {
      if (!data.items || data.statusCode !== 200) {
        throw new Error('Initialzation failed')
      }
      commit('setMicronets', data.items)
      return data
    })
  },
  fetchMicronets ({ commit, dispatch }) {
    const init = {
      method: 'get',
      url: `${process.env.BASE_URL}/micronets`,
      crossDomain: true,
      headers: { 'Content-type': 'application/json' }
    }
    return axios(init).then(({ data }) => {
      if (!data.items.length) return dispatch('initializeMicronets', init)
      commit('setMicronets', data.items)
      return data
    })
  },
  updateMicronets ({ commit }, {id, data}) {
    const url = `${process.env.BASE_URL}/micronets/${id}`
   // const mdlUrl = 'http://127.0.0.1:18080/odl/mdl/test/publish?subnets=1&hosts=2'
    axios({
      method: 'put',
      url: url,
      data,
      crossDomain: true,
      headers: {'Content-type': 'application/json'}
    })
      .then(
        response => { console.log('\n old response : ' + JSON.stringify(response)) },
        error => { console.log('\n Error : ' + JSON.stringify(error)) }
      )

    // CORS ISSUE
    // return axios({
    //   method: 'post',
    //   url: mdlUrl,
    //   crossDomain: true,
    //   headers: {'Content-type': 'application/json'}
    // })
    //   .then(response => {
    //     const { data } = response
    //     // commit('setMicronets', data)
    //     return data
    //   })
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
