import axios from 'axios'
import { findIndex, propEq, pathEq, filter, find, lensPath, set, omit, merge, lensProp, view } from 'ramda'
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
    console.log('\n Store setEditTargetIds micronetId : ' + JSON.stringify(micronetId) + '\t  subnetId : ' + JSON.stringify(subnetId) + '\t  deviceId : ' + JSON.stringify(deviceId))
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
      console.log('\n SessionUpdate event with Data : ' + JSON.stringify(data))
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
            console.log('\n Session Devices : ' + JSON.stringify(sessionDevices))
            const micronet = find(propEq('id', subscriberID))(state.micronets)
            console.log('\n Micro-net found from state : ' + JSON.stringify(micronet))
            const devicesLens = lensProp('devices', micronet)
            console.log('\n Event data from session update : ' + JSON.stringify(eventData))
            if (!eventData.device.hasOwnProperty('class')) {
              console.log('\n\n No class property found in event data . Only update devices list ... ')
              console.log('\n\n Upsert Micronet data set(devicesLens, sessionDevices, micronet) : ' + JSON.stringify(set(devicesLens, sessionDevices, micronet)))
              return dispatch('upsertMicronet', {
                   id: micronet._id,
                   data: set(devicesLens, sessionDevices, micronet),
                   event: 'sessionUpdate'
                 })
            }
            if (eventData.device.hasOwnProperty('class')) {
              console.log('\n sessionUpdate event Data for device : ' + JSON.stringify(eventData.device.deviceId) + '\t\t has class : ' + JSON.stringify(eventData.device.class))
              let subnetForClassIndex = findIndex(propEq('class', eventData.device.class))(micronet.subnets)
              console.log('\n subnetForClassIndex : ' + JSON.stringify(subnetForClassIndex))
              if (subnetForClassIndex > -1) {
                console.log('\n Subnet for class ' + JSON.stringify(eventData.device.class) + '\t\t is : ' + JSON.stringify(micronet.subnets[subnetForClassIndex]))
                console.log('\n Add the device to existing subnet : ')
                const subnetToUpdate = micronet.subnets[subnetForClassIndex]
                const updatedDeviceList = subnetToUpdate.deviceList.push(Object.assign({}, {
                  deviceId: eventData.device.deviceId,
                  deviceName: `${subnetToUpdate.class} Device`,
                  deviceDescription: `${subnetToUpdate.class} Device`,
                  timestampUtc: (new Date()).toISOString(),
                  mac: {
                    eui48: eventData.device.macAddress
                  }
                }))
                console.log('\n updatedDeviceList : ' + JSON.stringify(updatedDeviceList))
                console.log('\n\n subnetToUpdate.deviceList : ' + JSON.stringify(subnetToUpdate.deviceList))
                console.log('\n Specific subnet to update : ' + JSON.stringify(subnetToUpdate) + '\t\t\t at index : ' + JSON.stringify(subnetForClassIndex))
                const subnetDeviceListLens = lensProp('deviceList', subnetForClassIndex)
                const subnetLens = lensPath('subnets', subnetForClassIndex)
                console.log('\n Retrieved subnetLens : ' + JSON.stringify(view(subnetLens,micronet)))
                console.log('\n Retrieved subnetDeviceListLens : ' + JSON.stringify(view(subnetDeviceListLens,micronet.subnets)))
                commit('setEditTargetIds', {
                  micronetId: micronet._id,
                  subnetId: micronet.subnets[subnetForClassIndex].subnetId
                })
                dispatch('saveMicronet', {
                  id: micronet._id,
                  data: subnetToUpdate,
                  event: 'sessionUpdate'
                }).then(() => {
                  console.log('\n Inside then of saveMicronet calling upsertMicronet for updating devices')
                  // TODO : DHCP Upserts Add device to subnet
                  console.log('\n Trying to print micronet._id : ' + JSON.stringify(micronet._id))
                  dispatch('fetchMicronets').then(() => {
                      const micronetToUpsert = find(propEq('id', eventData.subscriberId))(state.micronets)
                      console.log('\n micronetToUpsert : ' + JSON.stringify(micronetToUpsert))
                      const subnetToUpsert = micronetToUpsert.subnets[subnetForClassIndex]
                      console.log('\n subnetToUpsert : ' + JSON.stringify(subnetToUpsert))
                      const deviceToUpsert = find(propEq('deviceId', eventData.device.deviceId))(subnetToUpsert.deviceList)
                      console.log('\n deviceToUpsert : ' + JSON.stringify(deviceToUpsert))
                      console.log('\n eventData : ' + JSON.stringify(eventData))
                    dispatch('fetchDhcpSubnets').then(() => {
                      dispatch('upsertDhcpSubnetDevice', {
                        subnetId: subnetToUpsert.subnetId,
                        deviceId: deviceToUpsert.deviceId,
                        data: Object.assign({}, {
                          deviceId: deviceToUpsert.deviceId,
                          macAddress: {
                            eui48: deviceToUpsert.macAddress ? deviceToUpsert.macAddress : deviceToUpsert.mac.eui48
                          },
                          networkAddress: {ipv4:deviceToUpsert.ipv4.host}
                        }),
                        event: 'addDhcpSubnetDevice'
                      }).then(() => {
                       console.log('\n Inside then of upsertDhcpSubnetDevice for event addDhcpSubnetDevice for existing class.Calling upsertDeviceLeases')
                        console.log('\n ')
                         dispatch('upsertDeviceLeases',{event:'addDeviceLease', data:{deviceId:eventData.device.deviceId}})
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
                console.log('\n SubnetToAdd Obj : ' + JSON.stringify(subnetToAdd))
                commit('setEditTargetIds', {micronetId: micronet._id})
                dispatch('addSubnetToMicronet', subnetToAdd).then(() => {
                  console.log('\n Inside then of addSubnetToMicronet before calling upsertMicronet for updating devices.')
                 // DHCP Upserts Add subnet and device
                  console.log('\n state.micronets after micronet._id : ' + JSON.stringify(micronet))
                  return dispatch('fetchMicronets').then(() => {
                    console.log('\n state.micronets after fetchMicronets : ' + JSON.stringify(state.micronets))
                    console.log('\n subnetToAdd : ' + JSON.stringify(subnetToAdd))
                    const micronetForSubscriber =  find(propEq('id', eventData.subscriberId))(state.micronets)
                    console.log('\n micronetForSubscriber : ' + JSON.stringify(micronetForSubscriber))
                    const micronet = find(propEq('_id', micronetForSubscriber._id))(state.micronets)
                    console.log('\n micronet : ' + JSON.stringify(micronet))
                    const subnet = find(propEq('subnetId', subnetToAdd.subnetId))(micronet.subnets)
                    console.log('\n subnet : ' + JSON.stringify(subnet))
                    const deviceInSubnet = find(propEq('deviceId', eventData.device.deviceId))(subnet.deviceList)
                    console.log('\n deviceInSubnet : ' + JSON.stringify(deviceInSubnet))
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
                      console.log('\n Inside then of upsertDhcpSubnet ')
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
                          console.log('\n Inside then of upsertDhcpSubnetDevice for event addDhcpSubnetDevice for new class.Calling upsertDeviceLeases ')
                          dispatch('upsertDeviceLeases',{event:'addDeviceLease', data:{deviceId:eventData.device.deviceId}})
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
    console.log('\n\n PopulateMultipleSubnets subnetTagMeta : ' + JSON.stringify(subnetTagMeta))
    // var devices = subTagsMeta.map((obj) => { return obj.devices })
    if (subnetTagMeta.devices.length === 1) {
      subnetTagMeta.devices.forEach((device, index) => {
        console.log('\n subnetTagMeta Device : ' + JSON.stringify(device))
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
      console.log('\n\n Single subnet : ' + JSON.stringify(subnets))
    }
    if (subnetTagMeta.devices.length > 1) {
      console.log('\n subnetTagMeta devices length : ' + JSON.stringify(subnetTagMeta.devices.length))
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
              dispatch('populateSubnetsWithTagsMeta', data._id).then((subnetTags) => {
                console.log('\n InitializeMicronets callback populateSubnetsWithTagsMeta subnetTags : ' + JSON.stringify(subnetTags))
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
      return dispatch('initializeMicronets', {token: data.accessToken}).then(()=> {
      })
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
        console.log('\n\n FetchMicronets : ' + JSON.stringify(data))
        commit(id ? 'replaceMicronet' : 'setMicronets', data)
        return data
      })
  },
  upsertMicronet ({commit}, {id, data, event}) {
    console.log('\n  UupsertMicronet  Id : ' + JSON.stringify(id) + '\t\t\t Data : ' + JSON.stringify(data) + '\t\t Event : ' + JSON.stringify(event))
    let dataFormatCheck = Object.assign(omitOperationalStateMeta(data), {timestampUtc: (new Date()).toISOString()})
    const valid = ajv.validate(Schema.Definitions.Subnet, dataFormatCheck)
    console.log('\n Ajv Errors : ' + JSON.stringify(ajv.errors))
    if (valid === true && event !== 'sessionUpdate') {
      // console.log('\n Valid is true && event !== sessionUpdate ')
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
      // console.log('\n Valid is true && && event === sessionUpdate ')
      console.log('\n UpsertMicronet for event : ' + JSON.stringify(event) + '\t\t\t  Data : ' + JSON.stringify(data))
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
    console.log('\n saveMicronet  Data  : ' + JSON.stringify(data))
    const {micronetId, subnetId, deviceId} = state.editTargetIds
    console.log('\n state.editTargetIds : ' + JSON.stringify(state.editTargetIds))
    const micronet = find(propEq('_id', micronetId))(state.micronets)
    console.log('\n saveMicronet micronet from state  : ' + JSON.stringify(micronet))
    const subnetIndex = findIndex(propEq('subnetId', subnetId))(micronet.subnets)
    console.log('\n saveMicronet subnetIndex  : ' + JSON.stringify(subnetIndex))
    const subnetLens = lensPath(['subnets', subnetIndex])
    console.log('\n saveMicronet subnetLens  : ' + JSON.stringify(view(subnetLens,micronet)))
    if (!deviceId) return dispatch('upsertMicronet', {id: micronetId, data: set(subnetLens, data, micronet)})
    // const deviceIndex = findIndex(propEq('deviceId', deviceId), view(subnetLens, micronet).deviceList)
    // const deviceLens = lensPath(['subnets', subnetIndex, 'deviceList', deviceIndex])
    // return dispatch('upsertMicronet', {id: micronetId, data: set(deviceLens, data, micronet)})
    return dispatch('upsertMicronet', {id: micronetId, data: set(subnetLens, data, micronet)})
  },
  addSubnetToMicronet ({state, commit, dispatch}, data) {
    const {micronetId} = state.editTargetIds
    console.log('\n Client addSubnetToMicronet set micronetId : ' + JSON.stringify(micronetId))
    console.log('\n Client addSubnetToMicronet called with Post data :  ' + JSON.stringify(data))
    return axios({
      ...apiInit,
      method: 'post',
      url: `${process.env.BASE_URL}/add-subnet-to-micronet`,
      data: {...data, micronetId}
    })
      .then(() => { () => commit('setEditTargetIds', {}) })
  },
  addSubnet ({state, commit, dispatch}, data) {
    console.log('\n addSubnet data :  ' + JSON.stringify(data))
    console.log('\n addSubnet Array.isArray(data) :  ' + JSON.stringify(Array.isArray(data)))
    const {micronetId} = state.editTargetIds
    console.log('\n addSubnet micronetId : ' + JSON.stringify(micronetId))
    if (Array.isArray(data) && data.length > 1) {
      console.log('\n Data.length : ' + JSON.stringify(data.length) + '\t\t Multiple sub-nets found ...')
      return axios({
        ...apiInit,
        method: 'post',
        url: `${process.env.BASE_URL}/add-subnets`,
        data: {data, micronetId}
      }).then(() => {
        commit('setEditTargetIds', {})
        console.log('\n addSubnets callback.Data passed to axios request is : ' + JSON.stringify(data))
        return dispatch('fetchMicronets', micronetId).then(() => {
          const micronet = find(propEq('_id', micronetId))(state.micronets)
          console.log('\n state.micronets : ' + JSON.stringify(state.micronets))
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
                console.log('\n\n deviceFromData value : ' + JSON.stringify(deviceFromData))
                const deviceInSubnet = find(propEq('deviceId', deviceFromData.deviceId))(subnet.deviceList)
                console.log('\n  upsertDhcpSubnet callback deviceInSubnet : ' + JSON.stringify(deviceInSubnet))
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
      console.log('\n Else loop before calling url : ' + JSON.stringify(`${process.env.BASE_URL}/add-subnet`))
      console.log('\n Array.isArray(data) : ' + JSON.stringify(Array.isArray(data)))
      let patchedData = {}
      if (Array.isArray(data) && data.length === 1) {
        console.log('\n Array.isArray(data) : ' + JSON.stringify(Array.isArray(data)) + '\t\t data.length : ' + JSON.stringify(data.length))
        console.log('\n Data[0] : ' + JSON.stringify(data[0]))
        patchedData = data[0]
        console.log('\n Patched data : ' + JSON.stringify(patchedData))
      }
      if (Array.isArray(data) === false) {
        console.log('\n Array.isArray(data) ' + JSON.stringify(Array.isArray(data)) )
        patchedData = data
        console.log('\n Patched data no processing : ' + JSON.stringify(patchedData))
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
            console.log('\n deviceInSubnet : ' + JSON.stringify(deviceInSubnet))
            console.log('\n patchedData : ' + JSON.stringify(patchedData))
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
          console.log('\n upsertDhcpSubnetDevice callback')
          commit('setEditTargetIds', {})
        })
    }
  },

  upsertDeviceLeases ({state,commit}, {type, data, event}) {
    console.log('\n UpsertDeviceLeases State : ' + JSON.stringify(state.deviceLeases) + '\t\t Event : ' + JSON.stringify(event))
    if(event === 'init') {
      console.log('\n UpsertDeviceLeases initial load for event : ' + JSON.stringify(event))
      let deviceLeasesForState = {}
      state.micronets.forEach((micronet,micronetIndex) => {
        console.log('\n Micro-net Devices : ' + JSON.stringify(micronet.devices) + ' \t\t micronet index : ' + JSON.stringify(micronetIndex))
        micronet.subnets.forEach((subnet, subnetIndex) => {
          console.log('\n Current subnet : ' + JSON.stringify(subnet) + '\t\t at SubnetIndex : ' + JSON.stringify(subnetIndex))
          subnet.deviceList.forEach((device, deviceIndex) => {
            console.log('\n Current device : ' + JSON.stringify(device) + '\t\t at DeviceIndex : ' + JSON.stringify(deviceIndex))
            deviceLeasesForState[device.deviceId] = Object.assign({},{status:'intermediary'})
          })
        })
      })
      console.log('\n UpsertDeviceLeases deviceLeasesForState : ' + JSON.stringify(deviceLeasesForState))
      commit('setDeviceLeases', deviceLeasesForState)
      return deviceLeasesForState
    }

    if(event === 'upsert') {
      console.log('\n UpsertDeviceLeases  type : ' + JSON.stringify(type) + '\t Data : ' + JSON.stringify(data) + '\t\t Event : ' + JSON.stringify(event))
      if(type === 'leaseAcquired') {
        let updatedDeviceLeases =  Object.assign({}, state.deviceLeases)
        console.log('\n LeaseAcquired event detected in upsertDeviceLeases.UpdatedDevices before upsert for leaseAcquired : ' + JSON.stringify(updatedDeviceLeases))
        updatedDeviceLeases[data.deviceId].status = 'positive'
        console.log('\n UpdatedDeviceLeases after upsert for leaseAcquired : ' + JSON.stringify(updatedDeviceLeases) )
        commit('setDeviceLeases', updatedDeviceLeases)
      }

      if(type === 'leaseExpired') {
        let updatedDeviceLeases =  Object.assign({}, state.deviceLeases)
        console.log('\n UpdatedDeviceLeases before upsert for leaseExpired : ' + JSON.stringify(updatedDeviceLeases))
        updatedDeviceLeases[data.deviceId].status = 'intermediary'
        console.log('\n UpdatedDeviceLeases after upsert for leaseExpired : ' + JSON.stringify(updatedDeviceLeases) )
        commit('setDeviceLeases', updatedDeviceLeases)
      }
    }

    if(event === 'addDeviceLease') {
      console.log('\n UpsertDeviceLeases called with data : ' + JSON.stringify(data))
      let updatedDeviceLeases =  Object.assign({}, state.deviceLeases)
      console.log('\n UpdatedDeviceLeases before add  : ' + JSON.stringify(updatedDeviceLeases))
      updatedDeviceLeases[data.deviceId] = { status:'intermediary' }
      console.log('\n UpdatedDeviceLeases after add  : ' + JSON.stringify(updatedDeviceLeases))
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
    console.log('\n UpsertDhcpSubnet called with url : ' + JSON.stringify(url) + '\t\t method : ' + JSON.stringify(method) + '\t\t Data : ' + JSON.stringify(data) + '\t\t ID : ' + JSON.stringify(id))
    return axios({
      ...apiInit,
      method: method,
      url: url,
      data
    })
      .then(({data}) => {
        console.log('\n UpsertDhcpSubnet data : ' + JSON.stringify(data))
        return dispatch('fetchDhcpSubnets')
      })
  },

  deleteDhcpSubnet ({state, commit, dispatch}, {id, data}) {
    console.log('\n Testing state for dhcp subnets : ' + JSON.stringify(state.dhcpSubnets))
    const url = `${localDhcpUri}/dhcp/subnets`
    console.log('\n DeleteDhcpSubnet called with url : ' + JSON.stringify(url) + '\t\t Data : ' + JSON.stringify(data) + '\t\t Id : ' + JSON.stringify(id))
    return axios({
      ...apiInit,
      method: 'delete',
      url: `${url}/${id}`,
      data
    })
      .then(({data}) => {
        console.log('\n DeleteDhcpSubnet data : ' + JSON.stringify(data))
        return dispatch('fetchDhcpSubnets')
      })
  },

  fetchDhcpSubnetDevices ({commit}, subnetId) {
    const url = `${localDhcpUri}/dhcp/subnets/${subnetId}/devices`
    console.log('\n FetchDhcpSubnetDevices called with url : ' + JSON.stringify(url))
    return axios({
      ...apiInit,
      method: 'get',
      url: url
    })
      .then(({data}) => {
        console.log('\n FetchDhcpSubnetDevices data : ' + JSON.stringify(data))
        commit('setDhcpSubnetDevices', data)
        return data
      })
  },
  upsertDhcpSubnetDevice ({commit, dispatch}, {subnetId, deviceId, data, event}) {
    console.log('\n UpsertDhcpSubnetDevice subnetId : ' + JSON.stringify(subnetId) + '\n DeviceId : ' + JSON.stringify(deviceId) + '\n Data : ' + JSON.stringify(data) + '\n Event : ' + JSON.stringify(event))
    const method = event === 'addDhcpSubnetDevice' ? 'post' : 'put'
    const url = event === 'addDhcpSubnetDevice' ? `${localDhcpUri}/dhcp/subnets/${subnetId}/devices` : `${localDhcpUri}/dhcp/subnets/${subnetId}/devices/${deviceId}`
    console.log('\n UpsertDhcpSubnetDevice url : ' + JSON.stringify(url) + '\t\t Method : ' + JSON.stringify(method))
    return axios({
      ...apiInit,
      method: method,
      url: url,
      data
    })
      .then(({data}) => {
        console.log('\n UpsertDhcpSubnetDevice data: ' + JSON.stringify(data))
        return dispatch('fetchDhcpSubnetDevices', subnetId)
      })
  },
  deleteDhcpSubnetDevice ({commit, dispatch}, {subnetId, deviceId}) {
    console.log('\n DeleteDhcpSubnetDevice subnetId : ' + JSON.stringify(subnetId) + '\t\t DeviceId : ' + JSON.stringify(deviceId))
    const url = `${localDhcpUri}/dhcp/subnets/${subnetId}/devices/${deviceId}`
    console.log('\n DeleteDhcpSubnetDevice url : ' + JSON.stringify(url))
    return axios({
      ...apiInit,
      method: 'delete',
      url: url
    })
      .then(({data}) => {
        console.log('\n DeleteDhcpSubnetDevice data : ' + JSON.stringify(data))
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
