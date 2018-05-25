import axios from 'axios'
import {findIndex, propEq, find, lensPath, set, omit, merge, lensProp} from 'ramda'
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
const localDhcpUri = `${process.env.BASE_URL}`
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
  },
  deviceLeases: []
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
  setLeases: setState('leases'),
  setDeviceLeases: setState('deviceLeases'),
  setEditTargetIds (state, {micronetId, subnetId, deviceId}) {
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
    console.log('\n UpsertSubscribers type : ' + JSON.stringify(type) + '\t\t Data : ' + JSON.stringify(data))
    let eventData = data
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
            const sessionDevices = data.devices
            const micronet = find(propEq('id', subscriberID))(state.micronets)
            const devicesLens = lensProp('devices', micronet)
            if (!eventData.device.hasOwnProperty('class')) {
              return dispatch('upsertMicronet', {
                id: micronet._id,
                data: set(devicesLens, sessionDevices, micronet),
                event: 'sessionUpdate'
              })
            }
            if (eventData.device.hasOwnProperty('class')) {
              let subnetForClassIndex = findIndex(propEq('class', eventData.device.class))(micronet.subnets)
              if (subnetForClassIndex > -1) {
                const subnetToUpdate = micronet.subnets[subnetForClassIndex]
                // const subnetDeviceListLens = lensProp('deviceList', subnetForClassIndex)
                // const subnetLens = lensPath('subnets', subnetForClassIndex)
                commit('setEditTargetIds', {
                  micronetId: micronet._id,
                  subnetId: micronet.subnets[subnetForClassIndex].subnetId
                })
                dispatch('saveMicronet', {
                  id: micronet._id,
                  data: subnetToUpdate,
                  event: 'sessionUpdate'
                }).then(() => {
                  // TODO : DHCP Upserts Add device to subnet
                  dispatch('fetchMicronets').then(() => {
                    const micronetToUpsert = find(propEq('id', eventData.subscriberId))(state.micronets)
                    const subnetToUpsert = micronetToUpsert.subnets[subnetForClassIndex]
                    const deviceToUpsert = find(propEq('deviceId', eventData.device.deviceId))(subnetToUpsert.deviceList)
                    dispatch('fetchDhcpSubnets').then(() => {
                      dispatch('upsertDhcpSubnetDevice', {
                        subnetId: subnetToUpsert.subnetId,
                        deviceId: deviceToUpsert.deviceId,
                        data: Object.assign({}, {
                          deviceId: deviceToUpsert.deviceId,
                          macAddress: {
                            eui48: deviceToUpsert.macAddress ? deviceToUpsert.macAddress : deviceToUpsert.mac.eui48
                          },
                          networkAddress: {ipv4: deviceToUpsert.ipv4.host}
                        }),
                        event: 'addDhcpSubnetDevice'
                      }).then(() => {
                        dispatch('upsertDeviceLeases', {event: 'addDeviceLease', data: {deviceId: eventData.device.deviceId}})
                      })
                    })
                  })
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
                commit('setEditTargetIds', {micronetId: micronet._id})
                dispatch('addSubnetToMicronet', subnetToAdd).then(() => {
                 // DHCP Upserts Add subnet and device
                  return dispatch('fetchMicronets').then(() => {
                    const micronetForSubscriber = find(propEq('id', eventData.subscriberId))(state.micronets)
                    const micronet = find(propEq('_id', micronetForSubscriber._id))(state.micronets)
                    const subnet = find(propEq('subnetId', subnetToAdd.subnetId))(micronet.subnets)
                    const deviceInSubnet = find(propEq('deviceId', eventData.device.deviceId))(subnet.deviceList)
                    dispatch('upsertDhcpSubnet', {
                      data: Object.assign({}, {
                        subnetId: subnetToAdd.subnetId,
                        ipv4Network: {
                          network: subnet.ipv4.network,
                          mask: subnet.ipv4.netmask,
                          gateway: subnet.ipv4.gateway
                        }
                      })
                    }).then(() => {
                      dispatch('fetchDhcpSubnets').then(() => {
                        dispatch('upsertDhcpSubnetDevice', {
                          subnetId: subnetToAdd.subnetId,
                          deviceId: subnetToAdd.deviceId,
                          data: Object.assign({}, {
                            deviceId: subnetToAdd.deviceId,
                            macAddress: {
                              eui48: subnetToAdd.macAddress ? subnetToAdd.macAddress : subnetToAdd.mac.eui48
                            },
                            networkAddress: {ipv4: deviceInSubnet.ipv4.host}
                          }),
                          event: 'addDhcpSubnetDevice'
                        }).then(() => {
                          dispatch('upsertDeviceLeases', {event: 'addDeviceLease', data: {deviceId: eventData.device.deviceId}})
                        })
                      })
                    })
                  })
                })
              }
            }
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
            })
        })
      })
    }
  },

  populateSubnetsObject ({state, commit, dispatch}, subnetTagMeta) {
    let subnets = []
    if (subnetTagMeta.devices.length === 1) {
      subnetTagMeta.devices.forEach((device, index) => {
        subnets.push(Object.assign({}, {
          subnetId: uuidv4(),
          subnetName: `${device.class} Subnet`,
          class: `${device.class}`,
          deviceId: device.deviceId,
          deviceName: `${device.class} Device`,
          deviceDescription: `${device.class} Device`,
          mac: {eui48: device.macAddress}
        }))
      })
    }
    if (subnetTagMeta.devices.length > 1) {
      var uniqueClasses = [...new Set(subnetTagMeta.devices.flatten().map(item => item.class))].filter(Boolean)
      uniqueClasses.forEach((classValue, index) => {
        subnets.push(Object.assign({}, {
          subnetId: uuidv4(),
          subnetName: `${classValue} Subnet`,
          class: classValue,
          deviceList: []
        }))
      })
      if (subnets.length === uniqueClasses.length) {
        subnetTagMeta.devices.forEach((device, deviceIndex) => {
          let subnetIndex = findIndex(propEq('class', device.class))(subnets)
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
      }
    }
    return subnets
  },

  upsertSubnetsForDevicesWithTags ({state, commit, dispatch}, {id, subnetTags}) {
    if (id) {
      let subnetTagsIndex = findIndex(propEq('micronetId', id))(subnetTags)
      let subnetTagMeta = subnetTags[subnetTagsIndex]
      dispatch('populateSubnetsObject', subnetTagMeta).then((subnetsObj) => {
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
      micronets.forEach((micronet, mIndex) => {
        micronet.devices.forEach((device, index) => {
          if (device.class) {
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
      var uniqueMicronetIds = [...new Set(subnetTagsMeta.map(item => item.micronetId))]
      // var devices = subnetTagsMeta.map((obj) => { return obj.devices })
     // var uniqueClasses = [...new Set(devices.flatten().map(item => item.class))]
      subnetTagsMeta.forEach((subTagMeta, tagMetaIndex) => {
        uniqueMicronetIds.forEach((micronetId, index) => {
          if (micronetId === subTagMeta.micronetId) {
            const subTagMetaIndex = findIndex(propEq('micronetId', subTagMeta.micronetId))(combinedSubTagsMeta)
            if (subTagMetaIndex === -1) {
              combinedSubTagsMeta.push(Object.assign({}, {
                micronetId: subTagMeta.micronetId,
                devices: subTagMeta.devices
              }))
            }
            if (subTagMetaIndex > -1) {
              combinedSubTagsMeta[subTagMetaIndex].devices = combinedSubTagsMeta[subTagMetaIndex].devices.concat(subTagMeta.devices)
            }
          }
        })
      })
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
              let mergedMicronet = merge(subscriber, data)
              newData.push(mergedMicronet)
              dispatch('populateSubnetsWithTagsMeta', data._id).then((subnetTags) => {
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
      return dispatch('initializeMicronets', {token: data.accessToken}).then(() => {
      })
    })
  },

  fetchSubscribers ({state, commit, dispatch}, id) {
    return axios({
      ...apiInit,
      method: 'get',
      url: id ? `${micronetsUrl}/${id}` : micronetsUrl
    })
      .then(({data}) => {
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
        commit(id ? 'replaceMicronet' : 'setMicronets', data)
        return data
      })
  },

  upsertMicronet ({commit}, {id, data, event}) {
    let dataFormatCheck = Object.assign(omitOperationalStateMeta(data), {timestampUtc: (new Date()).toISOString()})
    const valid = ajv.validate(Schema.Definitions.Subnet, dataFormatCheck)
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

  saveMicronet ({state, dispatch}, {data}) {
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

  addSubnetToMicronet ({state, commit, dispatch}, data) {
    const {micronetId} = state.editTargetIds
    return axios({
      ...apiInit,
      method: 'post',
      url: `${process.env.BASE_URL}/add-subnet-to-micronet`,
      data: {...data, micronetId}
    })
      .then(() => { () => commit('setEditTargetIds', {}) })
  },

  addSubnet ({state, commit, dispatch}, data) {
    const {micronetId} = state.editTargetIds
    if (Array.isArray(data) && data.length > 1) {
      return axios({
        ...apiInit,
        method: 'post',
        url: `${process.env.BASE_URL}/add-subnets`,
        data: {data, micronetId}
      }).then(() => {
        commit('setEditTargetIds', {})
        return dispatch('fetchMicronets', micronetId).then(() => {
          const micronet = find(propEq('_id', micronetId))(state.micronets)
          data.forEach((subnetFromData, dataIndex) => {
            console.log('\n Current subnetFromData : ' + JSON.stringify(subnetFromData))
            const subnet = find(propEq('subnetId', subnetFromData.subnetId))(micronet.subnets)
            console.log('\n addSubnets callback subnet : ' + JSON.stringify(subnet))
            dispatch('upsertDhcpSubnet', {
              data: Object.assign({}, {
                subnetId: subnetFromData.subnetId,
                ipv4Network: {
                  network: subnet.ipv4.network,
                  mask: subnet.ipv4.netmask,
                  gateway: subnet.ipv4.gateway
                }
              })
            }).then(() => {
              subnetFromData.deviceList.forEach((deviceFromData, deviceIndex) => {
                const deviceInSubnet = find(propEq('deviceId', deviceFromData.deviceId))(subnet.deviceList)
                dispatch('fetchDhcpSubnets').then(() => {
                  dispatch('upsertDhcpSubnetDevice', {
                    subnetId: subnetFromData.subnetId,
                    deviceId: deviceInSubnet.deviceId,
                    data: Object.assign({}, {
                      deviceId: deviceInSubnet.deviceId,
                      macAddress: {
                        eui48: deviceInSubnet.mac.eui48
                      },
                      networkAddress: {ipv4: deviceInSubnet.ipv4.host}
                    }),
                    event: 'addDhcpSubnetDevice'
                  })
                })
              })
            })
          })
        })
      })
    } else {
      let patchedData = {}
      if (Array.isArray(data) && data.length === 1) {
        patchedData = data[0]
      }
      if (Array.isArray(data) === false) {
        patchedData = data
      }
      return axios({
        ...apiInit,
        method: 'post',
        url: `${process.env.BASE_URL}/add-subnet`,
        data: {...patchedData, micronetId}
      })
        .then(() => {
          commit('setEditTargetIds', {})
          return dispatch('fetchMicronets', micronetId).then(() => {
            const micronet = find(propEq('_id', micronetId))(state.micronets)
            const subnet = find(propEq('subnetId', patchedData.subnetId))(micronet.subnets)
            const deviceInSubnet = find(propEq('deviceId', patchedData.deviceId))(subnet.deviceList)
            dispatch('upsertDhcpSubnet', {
              data: Object.assign({}, {
                subnetId: patchedData.subnetId,
                ipv4Network: {
                  network: subnet.ipv4.network,
                  mask: subnet.ipv4.netmask,
                  gateway: subnet.ipv4.gateway
                }
              })
            }).then(() => {
              console.log('\n upsertDhcpSubnet callback ')
              dispatch('fetchDhcpSubnets').then(() => {
                dispatch('upsertDhcpSubnetDevice', {
                  subnetId: patchedData.subnetId,
                  deviceId: patchedData.deviceId,
                  data: Object.assign({}, {
                    deviceId: patchedData.deviceId,
                    macAddress: {
                      eui48: patchedData.macAddress ? patchedData.macAddress : patchedData.mac.eui48
                    },
                    networkAddress: {ipv4: deviceInSubnet.ipv4.host}
                  }),
                  event: 'addDhcpSubnetDevice'
                })
              })
            })
          })
        })
        .then(() => {
          commit('setEditTargetIds', {})
        })
    }
  },

  upsertDeviceLeases ({state, commit}, {type, data, event}) {
    if (event === 'init') {
      let deviceLeasesForState = {}
      state.micronets.forEach((micronet, micronetIndex) => {
        micronet.subnets.forEach((subnet, subnetIndex) => {
          subnet.deviceList.forEach((device, deviceIndex) => {
            deviceLeasesForState[device.deviceId] = Object.assign({}, {status: 'intermediary'})
          })
        })
      })
      commit('setDeviceLeases', deviceLeasesForState)
      return deviceLeasesForState
    }

    if (event === 'upsert') {
      if (type === 'leaseAcquired') {
        let updatedDeviceLeases = Object.assign({}, state.deviceLeases)
        updatedDeviceLeases[data.deviceId].status = 'positive'
        commit('setDeviceLeases', updatedDeviceLeases)
      }

      if (type === 'leaseExpired') {
        let updatedDeviceLeases = Object.assign({}, state.deviceLeases)
        updatedDeviceLeases[data.deviceId].status = 'intermediary'
        commit('setDeviceLeases', updatedDeviceLeases)
      }
    }

    if (event === 'addDeviceLease') {
      let updatedDeviceLeases = Object.assign({}, state.deviceLeases)
      updatedDeviceLeases[data.deviceId] = { status: 'intermediary' }
      commit('setDeviceLeases', updatedDeviceLeases)
    }
  },

  fetchDhcpSubnets ({commit}) {
    const url = `${localDhcpUri}/dhcp/subnets`
    console.log('\n FtchDhcpSubnets url : ' + JSON.stringify(url))
    return axios({
      ...apiInit,
      method: 'get',
      url: url
    })
      .then(({data}) => {
        console.log('\n FetchDhcpSubnets Data : ' + JSON.stringify(data))
        commit('setDhcpSubnets', data)
        return data
      })
  },

  upsertDhcpSubnet ({state, commit, dispatch}, {data, id}) {
    console.log('\n Testing state for dhcp subnets : ' + JSON.stringify(state.dhcpSubnets))
    const url = id ? `${localDhcpUri}/dhcp/subnets/${id}` : `${localDhcpUri}/dhcp/subnets`
    const method = id ? 'put' : 'post'
    return axios({
      ...apiInit,
      method: method,
      url: url,
      data
    })
      .then(({data}) => {
        return dispatch('fetchDhcpSubnets')
      })
  },

  deleteDhcpSubnet ({state, commit, dispatch}, {id, data}) {
    const url = `${localDhcpUri}/dhcp/subnets`
    return axios({
      ...apiInit,
      method: 'delete',
      url: `${url}/${id}`,
      data
    })
      .then(({data}) => {
        return dispatch('fetchDhcpSubnets')
      })
  },

  fetchDhcpSubnetDevices ({commit}, subnetId) {
    const url = `${localDhcpUri}/dhcp/subnets/${subnetId}/devices`
    return axios({
      ...apiInit,
      method: 'get',
      url: url
    })
      .then(({data}) => {
        commit('setDhcpSubnetDevices', data)
        return data
      })
  },

  upsertDhcpSubnetDevice ({commit, dispatch}, {subnetId, deviceId, data, event}) {
    const method = event === 'addDhcpSubnetDevice' ? 'post' : 'put'
    const url = event === 'addDhcpSubnetDevice' ? `${localDhcpUri}/dhcp/subnets/${subnetId}/devices` : `${localDhcpUri}/dhcp/subnets/${subnetId}/devices/${deviceId}`
    return axios({
      ...apiInit,
      method: method,
      url: url,
      data
    })
      .then(({data}) => {
        return dispatch('fetchDhcpSubnetDevices', subnetId)
      })
  },

  deleteDhcpSubnetDevice ({commit, dispatch}, {subnetId, deviceId}) {
    const url = `${localDhcpUri}/dhcp/subnets/${subnetId}/devices/${deviceId}`
    return axios({
      ...apiInit,
      method: 'delete',
      url: url
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
