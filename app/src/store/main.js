import axios from 'axios'
import {findIndex, propEq} from 'ramda'
const setState = prop => (state, value) => { state[prop] = value }
const micronetsUrl = `${process.env.MM_SERVER_BASE_URL}/mm/v1/subscriber`
const apiInit = {crossDomain: true, headers: {'Content-type': 'application/json'}}
const msoPortalAuthPostConfig = {
  'clientID': 'https://coloradohealthcare.org/',
  'deviceID': '440c4aa0a4e595c4caa1e4294c6fdcc446444044441d44445fc4c4441cf44f1d',
  'vendor': 'Colorado healthcare',
  'dtype': 'Colorado Bot',
  'model': 'Colorado Bot',
  'serial': 'GG-555555',
  'macAddress': '03:30:93:39:03:3B'
}
const authTokenUri = `${process.env.MM_MSO_PORTAL_BASE_URL}/portal/v1/registration/token`
const usersUri = `${process.env.MM_APP_PUBLIC_BASE_URL}/mm/v1/micronets/users`
// const micronetsUri = `${process.env.MM_SERVER_BASE_URL}/mm/v1/micronets`
// const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id', '__v'])
// const omitStateMeta = omit(['_id', '__v'])

export const initialState = {
  subscriber: {},
  users: {},
  accessToken: '',
  dhcpSubnets: [],
  dhcpSubnetDevices: [],
  editTargetIds: {},
  toast: {
    show: false,
    value: ''
  },
  deviceLeases: []
}

export const getters = {}

export const mutations = {
  setSubscriber: setState('subscriber'),
  setUsers: setState('users'),
  setAccessToken: setState('accessToken'),
  setDhcpSubnets: setState('dhcpSubnets'),
  setDhcpSubnetDevices: setState('dhcpSubnetDevices'),
  setLeases: setState('leases'),
  setDeviceLeases: setState('deviceLeases'),
  replaceMicronet (state, micronet) {
    const index = findIndex(propEq('_id', micronet._id), state.micronets)
    if (index < 0) return state.micronets.push(micronet)
    return state.micronets.splice(index, 1, micronet)
  },
  setToast (state, {show, value}) {
    const formattedValue = value.charAt(0).toUpperCase() + value.slice(1)
    state.toast = {show, value: formattedValue}
  }
}

export const actions = {

  fetchAuthToken ({commit, dispatch}) {
    return axios({
      ...apiInit,
      method: 'post',
      url: authTokenUri,
      data: msoPortalAuthPostConfig
    }).then(({data}) => {
      commit('setAccessToken', data.accessToken)
      return data.accessToken
    })
  },

  fetchDevicesLeases ({state, commit, dispatch}, data) {
    console.log('\n fetchDevicesLeases data : ' + JSON.stringify(data))
    let deviceLeasesForState = {}
    let deviceLeases = data.devices.map((device, index) => {
      console.log('\n Current device : ' + JSON.stringify(device) + '\t\t Index : ' + JSON.stringify(index))
      deviceLeasesForState[device.deviceId] = Object.assign({}, {status: device.deviceLeaseStatus})
      return deviceLeasesForState
    })
    console.log('\n This.deviceLeases : ' + JSON.stringify(state.deviceLeases))
    console.log('\n deviceLeases : ' + JSON.stringify(deviceLeases))
    console.log('\n deviceLeasesForState : ' + JSON.stringify(deviceLeasesForState))
    deviceLeases = [].concat(...deviceLeases)
    console.log('\n Constructed Device Lease status : ' + JSON.stringify(deviceLeasesForState))
    commit('setDeviceLeases', deviceLeasesForState)
  },

  fetchUsers ({state, commit, dispatch}) {
    dispatch('fetchAuthToken').then((accessToken) => {
      console.log('\n Inside then of dispatch accessToken : ' + JSON.stringify(accessToken))
      return axios({
        ...{
          crossDomain: true,
          headers: {
            'Content-type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        },
        method: 'get',
        url: usersUri
      })
        .then(({data}) => {
          console.log('\n Users from MM APIs : ' + JSON.stringify(data.data[0]))
          commit('setUsers', data.data[0])
          dispatch('fetchDevicesLeases', data.data[0])
          return data.data[0]
        })
    })
  },

  fetchMicronets ({commit, dispatch}, id) {
    console.log('\n fetchMicronets called with id : ' + JSON.stringify(id))
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
      .then(({data}) => {
        if (id) {
          console.log('\n Fetch micronets called with id : ' + JSON.stringify(id))
          console.log('\n Fetch Micronets response : ' + JSON.stringify(data))
          commit('setSubscriber', data)
          return data
        }
        if (!id) {
          console.log('\n Fetch Micronets response without id : ' + JSON.stringify(data.data))
          commit('setSubscriber', data.data)
          return data.data
        }
      })
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
