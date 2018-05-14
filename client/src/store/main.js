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
    console.log('\n Client store setEditTargetIds called with micronetId : ' + JSON.stringify(micronetId))
    console.log('\n Client store setEditTargetIds called with subnetId : ' + JSON.stringify(subnetId))
    console.log('\n Client store setEditTargetIds called with deviceId : ' + JSON.stringify(deviceId))
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
    console.log('\n Client upsertSubscribers type : ' + JSON.stringify(type) + '\t\t Data : ' + JSON.stringify(data))
    let eventData = data
    const subscriberID = data.subscriberId
    if (type === 'sessionUpdate') {
      console.log('\n sessionUpdate called DATA : ' + JSON.stringify(data))
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
            console.log('\n Micro-net found from state : ' + JSON.stringify(micronet))
            const devicesLens = lensProp('devices', micronet)
            if (eventData.device.hasOwnProperty('class')) {
              console.log('\n sessionUpdate event Data for device : ' + JSON.stringify(eventData.device.deviceId) + '\t\t has class : ' + JSON.stringify(eventData.device.class))
              let subnetForClassIndex = findIndex(propEq('class', eventData.device.class))(micronet.subnets)
              console.log('\n subnetForClassIndex : ' + JSON.stringify(subnetForClassIndex))
              if (subnetForClassIndex > -1) {
                console.log('\n Subnet for class ' + JSON.stringify(eventData.device.class) + '\t\t is : ' + JSON.stringify(micronet.subnets[subnetForClassIndex]))
                console.log('\n Add the device to existing subnet : ')
                const subnet = micronet.subnets[subnetForClassIndex]
                const updatedDeviceList = subnet.deviceList.push(Object.assign({}, {
                  deviceId: eventData.device.deviceId,
                  deviceName: `${subnet.class} Device`,
                  deviceDescription: `${subnet.class} Device`,
                  timestampUtc: (new Date()).toISOString(),
                  mac: {
                    eui48: eventData.device.macAddress
                  }
                }))
                console.log('\n updatedDeviceList : ' + JSON.stringify(updatedDeviceList))
                const subnetDeviceListLens = lensProp('deviceList', micronet.subnets[subnetForClassIndex])
                console.log('\n Retrieved subnetDeviceListLens : ' + JSON.stringify(subnetDeviceListLens))
                commit('setEditTargetIds', {
                  micronetId: micronet._id,
                  subnetId: micronet.subnets[subnetForClassIndex].subnetId
                })
                dispatch('saveMicronet', {
                  id: micronet._id,
                  data: set(subnetDeviceListLens, updatedDeviceList, micronet),
                  event: 'sessionUpdate'
                })
              }
              if (subnetForClassIndex === -1) {
                console.log('\n No subnet for class found as subnetForClassIndex  is : ' + JSON.stringify(subnetForClassIndex))
                const subnetToAdd = Object.assign({}, {
                  subnetId: uuidv4(),
                  subnetName: `${eventData.device.class} Subnet`,
                  class: `${eventData.device.class}`,
                  deviceId: eventData.device.deviceId,
                  deviceName: `${eventData.device.class} Device`,
                  deviceDescription: `${eventData.device.class} Device`,
                  macAddress: eventData.device.macAddress
                })
                console.log('\n SubnetToAdd Obj : ' + JSON.stringify(subnetToAdd))
                commit('setEditTargetIds', { micronetId: micronet._id })
                dispatch('addSubnet', subnetToAdd).then(() => {
                })
              }
            }
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
              // dispatch('upsertSubnetsForDevicesWithTags', data._id)
              // dispatch('upsertSubnetsForDevicesWithTags', data._id)
            })
        })
      })
    }
  },

  populateSubnetsObject ({state, commit, dispatch}, subnetTagMeta) {
    let subnets = []
    console.log('\n\n PopulateMultipleSubnets passed subnetTagMeta : ' + JSON.stringify(subnetTagMeta))
    // var devices = subTagsMeta.map((obj) => { return obj.devices })
    if (subnetTagMeta.devices.length === 1) {
      subnets.push(subnetTagMeta.devices.map((device, index) => {
        console.log('\n subnetTagMeta.devices.length : ' + JSON.stringify(subnetTagMeta.devices.length) + '\t\t\t Device : ' + JSON.stringify(device))
        Object.assign({}, {
          subnetId: uuidv4(),
          subnetName: `${device.class} Subnet`,
          class: `${device.class}`,
          deviceId: device.deviceId,
          deviceName: `${device.class} Device`,
          deviceDescription: `${device.class} Device`,
          mac: {eui48: device.macAddress}
        })
      }))
    }
    if (subnetTagMeta.devices.length > 1) {
      console.log('\n subnetTagMeta.devices.length : ' + JSON.stringify(subnetTagMeta.devices.length))
      var uniqueClasses = [...new Set(subnetTagMeta.devices.flatten().map(item => item.class))].filter(Boolean)
      console.log('\n PopulateMultipleSubnets Unique classes : ' + JSON.stringify(uniqueClasses))
      uniqueClasses.forEach((classValue, index) => {
        console.log('\n Class from uniqueClasses : ' + JSON.stringify(classValue))
        subnets.push(Object.assign({}, {
          subnetId: uuidv4(),
          subnetName: `${classValue} Subnet`,
          class: classValue,
          deviceList: []
        }))
      })
      console.log('\n Populate Sub-nets array without devices : ' + JSON.stringify(subnets))
      if (subnets.length === uniqueClasses.length) {
        console.log('\n Length subnets array : ' + JSON.stringify(subnets.length) + '\t\t\t Unique Classes array : ' + JSON.stringify(uniqueClasses))
        console.log('\n Populating deviceList of individual subnets with devices : ' + JSON.stringify(subnetTagMeta.devices))
        subnetTagMeta.devices.forEach((device, deviceIndex) => {
          console.log('\n DeviceIndex : ' + JSON.stringify(deviceIndex) + '\t\t\t Device : ' + JSON.stringify(device))
          let subnetIndex = findIndex(propEq('class', device.class))(subnets)
          console.log('\n Found subnetIndex : ' + JSON.stringify(subnetIndex))
          if (subnetIndex > -1 && subnets[subnetIndex].class === device.class) {
            subnets[subnetIndex].deviceList.push(Object.assign({
              deviceId: device.deviceId,
              deviceName: `${device.class} Device`,
              deviceDescription: `${device.class} Device`,
              timestampUtc: (new Date()).toISOString(),
              mac: {eui48: device.macAddress}
            }))
          }
        })
        console.log('\n\n Subnets with deviceList : ' + JSON.stringify(subnets))
      }
    }
    return subnets
  },
  upsertSubnetsForDevicesWithTags ({state, commit, dispatch}, {id, subnetTags}) {
    console.log('\n\n upsertSubnetsForDevicesWithTags passed id : ' + JSON.stringify(id) + '\t\t\t subnetTags : ' + JSON.stringify(subnetTags))
    if (id) {
      console.log('\n\n Micronet id found :  ' + JSON.stringify(id))
      let subnetTagsIndex = findIndex(propEq('micronetId', id))(subnetTags)
      console.log('\n\n subnetTagsIndex : ' + JSON.stringify(subnetTagsIndex))
      let subnetTagMeta = subnetTags[subnetTagsIndex]
      console.log('\n Current subnetTagMeta : ' + JSON.stringify(subnetTagMeta))
      dispatch('populateSubnetsObject', subnetTagMeta).then((subnetsObj) => {
        console.log('\n\n Then of populateMultipleSubnets returned subnetsObj : ' + JSON.stringify(subnetsObj))
        commit('setEditTargetIds', {micronetId: id})
        dispatch('addSubnet', subnetsObj).then(() => {
        })
      })
    }
  },
  populateSubnetsWithTagsMeta ({state, commit, dispatch}) {
    let subnetTagsMeta = []
    let combinedSubTagsMeta = []
    return dispatch('fetchMicronets').then((micronets, index) => {
      console.log('\n micronets from fetchMicronets : ' + JSON.stringify(micronets))
      micronets.forEach((micronet, mIndex) => {
        micronet.devices.forEach((device, index) => {
          console.log('\n Device Index : ' + JSON.stringify(index) + '\t\t\t Device : ' + JSON.stringify(device))
          if (device.class) {
            console.log('\n PopulateSubnetsWithTagsMeta Device class : ' + JSON.stringify(device.class))
            subnetTagsMeta.push(Object.assign({}, {
              micronetId: micronet._id,
              devices: [{
                deviceId: device.deviceId,
                macAddress: device.macAddress,
                class: device.class
              }]
            }))
          }
        })
      })
      console.log('\n subnetTagsMeta : ' + JSON.stringify(subnetTagsMeta))
      var uniqueMicronetIds = [...new Set(subnetTagsMeta.map(item => item.micronetId))]
      console.log('\n uniqueMicronetIds : ' + JSON.stringify(uniqueMicronetIds))
      var devices = subnetTagsMeta.map((obj) => { return obj.devices })
      var uniqueClasses = [...new Set(devices.flatten().map(item => item.class))]
      console.log('\n Unique classes : ' + JSON.stringify(uniqueClasses))
      subnetTagsMeta.forEach((subTagMeta, tagMetaIndex) => {
        console.log('\n subTagMeta : ' + JSON.stringify(subTagMeta) + ' \t\t Index : ' + JSON.stringify(tagMetaIndex))
        uniqueMicronetIds.forEach((micronetId, index) => {
          console.log('\n Micronet ID from uniqueMicronetIds : ' + JSON.stringify(micronetId) + ' \t\t Index : ' + JSON.stringify(index))
          if (micronetId === subTagMeta.micronetId) {
            console.log('\n Match found ')
            const subTagMetaIndex = findIndex(propEq('micronetId', subTagMeta.micronetId))(combinedSubTagsMeta)
            console.log('\n subTagMetaIndex : ' + JSON.stringify(subTagMetaIndex))
            if (subTagMetaIndex === -1) {
              combinedSubTagsMeta.push(Object.assign({}, {
                micronetId: subTagMeta.micronetId,
                devices: subTagMeta.devices
              }))
              console.log('\n Newly constructed combinedSubTagsMeta : ' + JSON.stringify(combinedSubTagsMeta))
            }
            if (subTagMetaIndex > -1) {
              console.log('\n subTagMetaIndex: ' + JSON.stringify(subTagMetaIndex))
              console.log('\n Printing found combinedSubTagsMeta at subTagMetaIndex : ' + JSON.stringify(combinedSubTagsMeta[subTagMetaIndex]))
              console.log('\n tagMeta.devices : ' + JSON.stringify(subTagMeta.devices))
              combinedSubTagsMeta[subTagMetaIndex].devices = combinedSubTagsMeta[subTagMetaIndex].devices.concat(subTagMeta.devices)
              console.log('\n Updated combinedSubTagsMeta : ' + JSON.stringify(combinedSubTagsMeta))
            }
          }
        })
      })
      console.log('\n Reconstrcuted combinedSubTagsMeta : ' + JSON.stringify(combinedSubTagsMeta))
      return combinedSubTagsMeta
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
              console.log('\b Initialize Micronets Data from /create-mock-micronet : ' + JSON.stringify(data))
              let mergedMicronet = merge(subscriber, data)
              newData.push(mergedMicronet)
              console.log('\n Initialize Micronets newData : ' + JSON.stringify(newData))
              // dispatch('upsertSubnetsForDevicesWithTags', data._id)
              dispatch('populateSubnetsWithTagsMeta', data._id).then((subnetTags) => {
                console.log('\n InitializeMicronets Inside then of populateSubnetsWithTagsMeta subnetTags : ' + JSON.stringify(subnetTags))
                dispatch('upsertSubnetsForDevicesWithTags', {id: data._id, subnetTags})
              })
            })
        })
        commit('setMicronets', newData)
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
      console.log('\n Client upsertMicronet for event : ' + JSON.stringify(event) + '\t\t\t with DATA : ' + JSON.stringify(data))
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
    console.log('\n Save Micronet called with data  : ' + JSON.stringify(data))
    const {micronetId, subnetId, deviceId} = state.editTargetIds
    console.log('\n state.editTargetIds : ' + JSON.stringify(state.editTargetIds))
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
    console.log('\n Client Add subnet called with Post data :  ' + JSON.stringify(data))
    console.log('\n Client Add subnet Array.isArray(data) :  ' + JSON.stringify(Array.isArray(data)))
    const {micronetId} = state.editTargetIds
    console.log('\n Client Add subnet MicronetId : ' + JSON.stringify(micronetId))
    if (Array.isArray(data) && data.length > 1) {
      console.log('\n Data.length : ' + JSON.stringify(data.length) + '\t\t Multiple sub-nets found ...')
      return axios({
        ...apiInit,
        method: 'post',
        url: `${process.env.BASE_URL}/add-subnets`,
        data: {data, micronetId}
      }).then(() => commit('setEditTargetIds', {}))
    } else {
      console.log('\n Client inside else loop before calling url : ' + JSON.stringify(`${process.env.BASE_URL}/add-subnet`))
      return axios({
        ...apiInit,
        method: 'post',
        url: `${process.env.BASE_URL}/add-subnet`,
        data: {...data, micronetId}
      })
        .then(() => {
          () => commit('setEditTargetIds', {})
          return dispatch('fetchMicronets', micronetId).then(() => {
            // const micronet = find(propEq('_id', micronetId))(state.micronets)
            // const subnet = find(propEq('subnetId', data.subnetId))(micronet.subnets)
            // const deviceInSubnet = find(propEq('deviceId', data.deviceId))(subnet.deviceList)
            // dispatch('upsertDhcpSubnet', {
            //   data: Object.assign({}, {
            //     subnetId: data.subnetId,
            //     ipv4Network: {
            //       network: subnet.ipv4.network,
            //       mask: subnet.ipv4.netmask,
            //       gateway: subnet.ipv4.gateway
            //     }
            //   })
            // }).then(() => {
            //   dispatch('fetchDhcpSubnets').then(() => {
            //     dispatch('upsertDhcpSubnetDevice', {
            //       subnetId: data.subnetId,
            //       deviceId: data.deviceId,
            //       data: Object.assign({}, {
            //         deviceId: data.deviceId,
            //         macAddress: {
            //           eui48: data.macAddress
            //         },
            //         networkAddress: {ipv4: deviceInSubnet.ipv4.host}
            //       }),
            //       event: 'addDhcpSubnetDevice'
            //     })
            //   })
            // })
          })
        })
        .then(() => commit('setEditTargetIds', {}))
    }
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
