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
  },
  updateMicronets ({ commit }, {dbId, data}) {
    console.log('\n\n ACTIONS UPDATE MICRO-NETS ID : ' + JSON.stringify(id) + '\t\t DATA : ' + JSON.stringify(data))
    const id = '5a1ceba4b2b1903f62048235'
    const url = `${process.env.BASE_URL}/micronets/${id}`
   // const mdlUrl = 'http://127.0.0.1:18080/odl/mdl/test/publish?subnets=1&hosts=2'
    console.log('\n ACTION UPDATE MICRONETS URL : ' + JSON.stringify(url))

    axios({
      method: 'post',
      url: url,
      data: data,
      crossDomain: true,
      headers: {'Content-type': 'application/json'}
    }).then((err, response) => {
      if (err) {
        console.log('\n error : ' + JSON.stringify(err))
      }
      console.log('\n old response : ' + JSON.stringify(response))
    })

    // CORS ISSUE
    // return axios({
    //   method: 'post',
    //   url: mdlUrl,
    //   crossDomain: true,
    //   headers: {'Content-type': 'application/json'}
    // })
    //   .then(response => {
    //     console.log('\n UPDATE MICRONETS AXIOS RESPONSE : ' + JSON.stringify(response))
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
