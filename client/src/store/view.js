import axios from 'axios'

export const initialState = {
  micronet: []
}

export const getters = {
  micronet: state => state.micronet
}

export const mutations = {
  setMicronets (state, list) {
    state.micronet = list.items
  }
}

export const actions = {
  fetchMicronets ({ commit }) {
    const url = `${process.env.BASE_URL}/micronets`
    return axios({
      method: 'get',
      url,
      crossDomain: true,
      headers: { 'Content-type': 'application/json' }
    })
      .then(response => {
        const { data } = response
        if (data.items.length > 0) {
          commit('setMicronets', data)
          return data
        } else {
          axios({
            method: 'get',
            url: `${process.env.BASE_URL}/initialize/1/3`,
            crossDomain: true,
            headers: { 'Content-type': 'application/json' }
          })
            .then(response => {
              const { data } = response
              if (data.items && data.statusCode === 200) {
                commit('setMicronets', data.items)
                return data
              } else {}
            })
        }
      })
  },
  updateMicronets ({ commit }, {id, data}) {
    const url = `${process.env.BASE_URL}/micronets/${id}`
   // const mdlUrl = 'http://127.0.0.1:18080/odl/mdl/test/publish?subnets=1&hosts=2'
    axios({
      method: 'put',
      url: url,
      data: data,
      crossDomain: true,
      headers: {'Content-type': 'application/json'}
    }).then((err, response) => {
      if (err) {
        console.log('\n Error : ' + JSON.stringify(err))
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
