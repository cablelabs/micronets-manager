import axios from 'axios'
import { findIndex, propEq, find, lensPath, set, omit, merge, lensProp } from 'ramda'
import uuidv4 from 'uuid/v4'

const setState = prop => (state, value) => { state[prop] = value }
const micronetsUrl = `${process.env.BASE_URL}/micronets`
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
const authTokenUri = `${process.env.MSO_PORTAL_BASE_URL}/portal/registration/token`
const sessionUri = `${process.env.MSO_PORTAL_BASE_URL}/portal/session`
const dhcpUri = `${process.env.DHCP_BASE_URL}/micronets/v1/dhcp/subnets`
const Ajv = require('ajv')
const ajv = new Ajv()
const Schema = require('../../schemas/micronets')
const omitOperationalStateMeta = omit(['logEvents', 'statusCode', 'statusText', '_id', '__v'])
const omitStateMeta = omit(['_id', '__v'])
export const initialState = {
  authToken: '',
  micronets: [],
  dhcpSubnets: [],
  dhcpSubnetDevices: [],
  editTargetIds: {},
  toast: {
    show: false,
    value: ''
  }
}

export const getters = {
  editTarget (state) {
    if (!state.editTargetIds) return null
    const {micronetId, subnetId, deviceId} = state.editTargetIds
    const micronet = state.micronets.filter(x => x._id === micronetId)[0]
    if (!subnetId) return micronet
    const subnet = micronet.subnets.filter(x => x.subnetId === subnetId)[0]
    return !deviceId ? subnet : subnet.deviceList.filter(x => x.deviceId === deviceId)[0]
  }
}

export const mutations = {
  setMicronets: setState('micronets'),
  setDhcpSubnets: setState('dhcpSubnets'),
  setDhcpSubnetDevices: setState('dhcpSubnetDevices'),
  setEditTargetIds (state, {micronetId, subnetId, deviceId}) {
   // console.log('\n Client store setEditTargetIds called with micronetId : ' + JSON.stringify(micronetId))
    state.editTargetIds = {micronetId, subnetId, deviceId}
  },
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
  upsertSubscribers ({state, commit, dispatch}, {type, data}) {
    // let micronetIndex = findIndex(propEq('id', data.subscriberId))(state.micronets)
   // console.log('\n Client upsert Subscribers type : ' + JSON.stringify(type) + '\t\t Data : ' + JSON.stringify(data))
    const subscriberID = data.subscriberId
    if (type === 'sessionUpdate') {
      axios({
        ...apiInit,
        method: 'post',
        url: authTokenUri,
        data: msoPortalAuthPostConfig
      }).then(({data}) => {
        const token = data.accessToken
        // console.log('\n Token : ' + JSON.stringify(token) + '\t\t\t subscriberID : ' + JSON.stringify(subscriberID))
        axios({
          ...{
            crossDomain: true,
            headers: {
              'Content-type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          },
          method: 'get',
          url: subscriberID ? `${sessionUri}/${subscriberID}` : `${sessionUri}`
        })
          .then(({data}) => {
            const updatedDevices = data.devices
            const micronet = find(propEq('id', subscriberID))(state.micronets)
            const devicesLens = lensProp('devices', micronet)
            return dispatch('upsertMicronet', {
              id: micronet._id,
              data: set(devicesLens, updatedDevices, micronet),
              event: 'sessionUpdate'
            })
          })
      })
    }

    if (type === 'sessionCreate') {
      return axios({
        ...apiInit,
        method: 'post',
        url: authTokenUri,
        data: msoPortalAuthPostConfig
      }).then(({data}) => {
        const subscriberSessionUri = `${sessionUri}/${subscriberID}`
        axios({
          ...{
            crossDomain: true,
            headers: {
              'Content-type': 'application/json',
              Authorization: `Bearer ${data.accessToken}`
            }
          },
          method: 'get',
          url: subscriberSessionUri
        }).then((response) => {
          let data = response.data
          const subscriber = Object.assign({}, {
            id: data.id,
            ssid: data.ssid,
            name: data.name,
            devices: data.devices,
            timestampUtc: (new Date()).toISOString()
          })
          axios({
            ...apiInit,
            method: 'post',
            url: `${process.env.BASE_URL}/create-mock-micronet`,
            data: {subnets: 1, hosts: 0, subscriber: subscriber}
          })
            .then(({data}) => {
             // console.log('\n Data : ' + JSON.stringify(data))
              dispatch('upsertSubnetsForDevicesWithTags', data._id)
            })
        })
      })
    }
  },
  upsertSubnetsForDevicesWithTags ({commit, dispatch}, id) {
    console.log('\n upsertSubnetsForDevicesWithTags called with micronetId : ' + JSON.stringify(id))
    return dispatch('fetchMicronets', id).then((micronet) => {
     // console.log('\n Fetching created Micro-nets : ' + JSON.stringify(micronet))
      // console.log('\n data instanceOf Array : ' + JSON.stringify(Array.isArray(data)))
      // data = Array.isArray(data) === false ? [].push(data) : data
     // console.log('\n Current micro-net : ' + JSON.stringify(micronet))
      if (micronet.devices) {
        micronet.devices.forEach((device, deviceIndex) => {
          // console.log('\n Current device : ' + JSON.stringify(device) + '\t\t Device Index : ' + JSON.stringify(deviceIndex))
          if (device.hasOwnProperty('class')) {
           //  console.log('\n Current device class : ' + JSON.stringify(device.class) + '\t\t for deviceId : ' + JSON.stringify(device.deviceId))
            let populateSubnetCreation = Object.assign({}, {
              subnetId: uuidv4(),
              subnetName: `${device.class} Subnet`,
              deviceId: device.deviceId,
              deviceName: `${device.class} Device`,
              deviceDescription: `${device.class} Device`,
              macAddress: device.macAddress
            })
           // console.log('\n PopulateSubnetCreation JSON : ' + JSON.stringify(populateSubnetCreation))
            commit('setEditTargetIds', {micronetId: micronet._id})
            dispatch('addSubnet', populateSubnetCreation).then(() => {})
          }
        })
      }
      // dispatch('fetchMicronets').then(() => {})
    })
  },
  initializeMicronets ({state, commit, dispatch}, {token}) {
    return axios({
      ...{
        crossDomain: true,
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      },
      method: 'get',
      url: sessionUri
    })
      .then((response) => {
        let {data} = response.data
        let newData = []
        data.forEach((subscriber, index) => {
          subscriber = Object.assign({}, omitStateMeta(subscriber))
          axios({
            ...apiInit,
            method: 'post',
            url: `${process.env.BASE_URL}/create-mock-micronet`,
            data: {subnets: 1, hosts: 0, subscriber: subscriber}
          })
            .then(({data}) => {
             // console.log('\b Initialize Micronets Data from /create-mock-micronet : ' + JSON.stringify(data))
              let mergedMicronet = merge(subscriber, data)
            //  console.log('\n data._id : ' + JSON.stringify(data._id))
            //  console.log('\n Initialize Micronets mergedMicronet : ' + JSON.stringify(mergedMicronet))
              newData.push(mergedMicronet)
              dispatch('upsertSubnetsForDevicesWithTags', data._id)
            })
        })
        // commit('setMicronets', newData).then(() => {
        //   console.log('\n Inside then of setMicronets')
        // })
        return data
      })
  },
  fetchAuthToken ({commit, dispatch}) {
    return axios({
      ...apiInit,
      method: 'post',
      url: authTokenUri,
      data: msoPortalAuthPostConfig
    }).then(({data}) => {
      console.log('\n FetchAuthToken Access Token : ' + JSON.stringify(data.accessToken))
      return dispatch('initializeMicronets', {token: data.accessToken})
    })
  },
  fetchSubscribers ({state, commit, dispatch}, id) {
    console.log('\n\n Fetch Subscribers id : ' + JSON.stringify(id))
    console.log('\n\n Fetch Subscribers state : ' + JSON.stringify(state.micronets))
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
      .then(({data}) => {
        console.log('\n\n Fetch Subscribers Data : ' + JSON.stringify(data))
        if (!id && !data.length) return dispatch('fetchAuthToken')
        commit(id ? 'replaceMicronet' : 'setMicronets', data)
        return data
      })
  },
  fetchMicronets ({commit, dispatch}, id) {
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
      .then(({data}) => {
        // if (!id && !data.length) return dispatch('fetchAuthToken')
        commit(id ? 'replaceMicronet' : 'setMicronets', data)
        return data
      })
  },
  upsertMicronet ({commit}, {id, data, event}) {
    //  console.log('\n  upsertMicronet  Id : ' + JSON.stringify(id) + '\t\t\t Data : ' + JSON.stringify(data))
    //  console.log('\n  upsertMicronet  event : ' + JSON.stringify(event))
    let dataFormatCheck = Object.assign(omitOperationalStateMeta(data), {timestampUtc: (new Date()).toISOString()})
    const valid = ajv.validate(Schema.Definitions.Subnet, dataFormatCheck)
    console.log('\n Ajv Errors : ' + JSON.stringify(ajv.errors))
    // return valid === true && event!='sessionUpdate' ? axios(Object.assign({}, apiInit, {
    //   method: id ? 'put' : 'post',
    //   url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
    //   data
    // }))
    //   .then(response => commit('replaceMicronet', response.data))
    //   .catch(error => {
    //     console.log('Axios Error : ', error.response)
    //   }) : commit('setToast', {show: true, value: ajv.errors[0].message})

    if (valid === true && event !== 'sessionUpdate') {
      return axios(Object.assign({}, apiInit, {
        method: id ? 'put' : 'post',
        url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
        data
      }))
        .then(response => commit('replaceMicronet', response.data))
        .catch(error => {
          console.log('Axios Error : ', error.response)
        })
    }

    if (valid === true && event === 'sessionUpdate') {
      return axios(Object.assign({}, apiInit, {
        method: id ? 'put' : 'post',
        url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
        data: {data: data, event: event}
      }))
        .then(response => commit('replaceMicronet', response.data))
        .catch(error => {
          console.log('Axios Error : ', error.response)
        })
    }

    if (valid === false) {
      commit('setToast', {show: true, value: ajv.errors[0].message})
    }
  },
  upsertInitMicronet ({commit}, {id, data}) {
    axios(Object.assign({}, apiInit, {
      method: 'post',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl,
      data
    }))
      .then(response => commit('replaceMicronet', response.data))
      .catch(error => {
        console.log('Axios Error : ', error.response)
      })
  },
  saveMicronet ({state, dispatch}, data) {
    const {micronetId, subnetId, deviceId} = state.editTargetIds
    const micronet = find(propEq('_id', micronetId))(state.micronets)
    const subnetIndex = findIndex(propEq('subnetId', subnetId))(micronet.subnets)
    const subnetLens = lensPath(['subnets', subnetIndex])
    if (!deviceId) return dispatch('upsertMicronet', {id: micronetId, data: set(subnetLens, data, micronet)})
    // const deviceIndex = findIndex(propEq('deviceId', deviceId), view(subnetLens, micronet).deviceList)
    // const deviceLens = lensPath(['subnets', subnetIndex, 'deviceList', deviceIndex])
    // return dispatch('upsertMicronet', {id: micronetId, data: set(deviceLens, data, micronet)})
    return dispatch('upsertMicronet', {id: micronetId, data: set(subnetLens, data, micronet)})
  },
  addSubnet ({state, commit, dispatch}, data) {
   // console.log('\n Client Add subnet called with Post data :  ' + JSON.stringify(data))
    const {micronetId} = state.editTargetIds
    return axios({
      ...apiInit,
      method: 'post',
      url: `${process.env.BASE_URL}/add-subnet`,
      data: {...data, micronetId}
    })
      .then(() => {
        return dispatch('fetchMicronets', micronetId).then(() => {
          const micronet = find(propEq('_id', micronetId))(state.micronets)
          const subnet = find(propEq('subnetId', data.subnetId))(micronet.subnets)
          const deviceInSubnet = find(propEq('deviceId', data.deviceId))(subnet.deviceList)
          dispatch('upsertDhcpSubnet', {
            data: Object.assign({}, {
              subnetId: data.subnetId,
              ipv4Network: {
                network: subnet.ipv4.network,
                mask: subnet.ipv4.netmask,
                gateway: subnet.ipv4.gateway
              }
            })
          }).then(() => {
            dispatch('fetchDhcpSubnets').then(() => {
              dispatch('upsertDhcpSubnetDevice', {
                subnetId: data.subnetId,
                deviceId: data.deviceId,
                data: Object.assign({}, {
                  deviceId: data.deviceId,
                  macAddress: {
                    eui48: data.macAddress
                  },
                  networkAddress: {ipv4: deviceInSubnet.ipv4.host}
                }),
                event: 'addDhcpSubnetDevice'
              })
            })
          })
        })
      })
      .then(() => commit('setEditTargetIds', {}))
  },
  fetchDhcpSubnets ({commit}) {
    return axios({
      ...apiInit,
      method: 'get',
      url: dhcpUri
    })
      .then(({data}) => {
        commit('setDhcpSubnets', data)
        return data
      })
  },
  upsertDhcpSubnet ({commit, dispatch}, {data, id}) {
    return axios({
      ...apiInit,
      method: id ? 'put' : 'post',
      url: id ? `${dhcpUri}/${id}` : `${dhcpUri}`,
      data
    })
      .then(({data}) => {
        return dispatch('fetchDhcpSubnets')
      })
  },
  deleteDhcpSubnet ({commit, dispatch}, {id, data}) {
    return axios({
      ...apiInit,
      method: 'delete',
      url: `${dhcpUri}/${id}`,
      data
    })
      .then(({data}) => {
        return dispatch('fetchDhcpSubnets')
      })
  },
  fetchDhcpSubnetDevices ({commit}, subnetId) {
    return axios({
      ...apiInit,
      method: 'get',
      url: `${dhcpUri}/${subnetId}/devices`
    })
      .then(({data}) => {
        commit('setDhcpSubnetDevices', data)
        return data
      })
  },
  upsertDhcpSubnetDevice ({commit, dispatch}, {subnetId, deviceId, data, event}) {
    return axios({
      ...apiInit,
      method: event === 'addDhcpSubnetDevice' ? 'post' : 'put',
      url: event === 'addDhcpSubnetDevice' ? `${dhcpUri}/${subnetId}/devices` : `${dhcpUri}/${subnetId}/devices/${deviceId}`,
      data
    })
      .then(({data}) => {
        return dispatch('fetchDhcpSubnetDevices', subnetId)
      })
  },
  deleteDhcpSubnetDevice ({commit, dispatch}, {subnetId, deviceId}) {
    return axios({
      ...apiInit,
      method: 'delete',
      url: `${dhcpUri}/${subnetId}/devices/${deviceId}`
    })
      .then(({data}) => {
        return dispatch('fetchDhcpSubnetDevices', subnetId)
      })
  }
}

export default {
  state: Object.assign({}, initialState),
  mutations,
  actions,
  getters
}
