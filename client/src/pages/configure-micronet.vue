<template>
  <Layout>
    <h2 class="text-xs-center orange--text title">Configure {{editTargetIds.deviceId ? 'Device' : 'Subnet'}}</h2>
    <h3 class="text-xs-center caption grey--text">
      Micronet: {{editTargetIds.micronetId}}<br/>
      Subnet: {{editTargetIds.subnetId}}<br/>
      {{editTargetIds.deviceId ? `Device: ${editTargetIds.deviceId}` : ''}}
    </h3>
    <!--<v-form class="text-xs-center">-->
    <!--<v-text-field class="input-textarea" v-model="textAreaInput" auto-grow multi-line rows="10" light textarea/>-->
    <!--<div class="text-xs-center mt-3">-->
    <!--<v-btn @click="reset">reset</v-btn>-->
    <!--<v-btn class="ml-4 mr-4 primary " @click="submit">save</v-btn>-->
    <!--<v-btn to="/">done</v-btn>-->
    <!--</div>-->
    <!--</v-form>-->
    <!--<p>EditTargetIds.subnetId : {{editTargetIds.subnetId}}</p>-->
    <template v-for="(subnet, subnetIndex) in micronet.subnets">
      <!--<p>Subnet.ID : {{subnet.subnetId}}</p>-->
      <v-form v-if="subnet.subnetId === editTargetIds.subnetId" class="text-xs-center subnet-form" ref="form">
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.subnetId" label="Subnet ID" required disabled/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.subnetName" label="Subnet Name" required/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.ipv4.gateway" label="Subnet IPv4 Gateway"
                      required/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.ipv4.netmask" label="Subnet IPv4 NetMask"
                      required/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.ipv4.network" label="Subnet IPv4 NetWork"
                      required/>
        <div class="devices">
          <h1 v-if="subnet.deviceList" class="device-header">Devices</h1>
        </div>
        <v-container fluid>
          <v-layout row wrap>
            <template v-for="(device, deviceIndex) in subnet.deviceList">
              <v-flex xs12 sm6>
                <div class="cards">
                  <v-card class="device-card" v-show="true">
                    <v-btn flat icon dark color="red darken-5" class="close-btn"
                           @click.stop="deleteDevice(subnet.subnetId, device.deviceId, subnetIndex, deviceIndex)">
                      <v-icon>close</v-icon>
                    </v-btn>
                    <v-text-field v-model="device.deviceName" label="Device Name" required/>
                    <v-text-field v-model="device.deviceDescription" label="Device Description" required/>
                    <!--<v-select-->
                    <!--:items="currentMicronet.deviceIds"-->
                    <!--label="Select Device ID"-->
                    <!--v-model="device.deviceId"-->
                    <!--class="input-group&#45;&#45;focused"-->
                    <!--item-value="text"-->
                    <!--required-->
                    <!--disabled-->
                    <!--&gt;</v-select>-->
                    <v-text-field v-model="device.deviceId" label="Device ID" required disabled/>
                    <v-text-field v-if="device.ipv4!=undefined" v-model="device.ipv4.host" label="Device IPv4 HOST"
                                  required/>
                    <v-select
                      :items="currentMicronet.macAddresses"
                      label="Select Device Mac Address"
                      v-model="device.mac.eui48"
                      class="input-group--focused"
                      item-value="text"
                      required
                    ></v-select>
                    <v-btn color="success"
                           @click.stop="updateDevice(subnet.subnetId, device.deviceId, subnetIndex, deviceIndex, device.deviceName, device.deviceDescription, device.ipv4.host, device.mac.eui48)">
                      Update
                    </v-btn>
                    <!--<v-btn color="error" @click.stop="deleteDevice(subnet.subnetId, device.deviceId, subnetIndex,deviceIndex)">Delete</v-btn>-->
                  </v-card>
                </div>
              </v-flex>
            </template>
            <template v-if="showAddDeviceForm == true">
              <v-flex xs12 sm6>
                <v-card class="device-card">
                  <v-btn flat icon dark color="red darken-5" class="close-btn"
                         @click.stop="showAddDeviceForm=!showAddDeviceForm">
                    <v-icon>close</v-icon>
                  </v-btn>
                  <v-text-field v-model="newDeviceName" label="Device Name" required/>
                  <v-text-field v-model="newDeviceDescription" label="Device Description" required/>
                  <v-text-field v-model="newDeviceId" label="Device ID" required/>
                  <v-text-field v-model="newDeviceMacAddress" label="Device Mac Address" required/>
                  <v-btn color="success"
                         @click.stop="addDeviceToSubnet(subnet.subnetId, subnetIndex, newDeviceName, newDeviceDescription, newDeviceId, newDeviceMacAddress)">
                    Add
                  </v-btn>
                </v-card>
              </v-flex>
            </template>
          </v-layout>
        </v-container>
        <div class="form-btns">
          <v-btn color="success" @click.stop="addDeviceForm">Add Device</v-btn>
          <v-btn color="primary" @click.stop="submitForm(subnetIndex)">Submit</v-btn>
          <v-btn @click.stop="routeToMicronet">Done</v-btn>
        </div>
      </v-form>
    </template>
    <v-snackbar
      :timeout="timeout"
      :color="color"
      :multi-line="mode === 'multi-line'"
      :vertical="mode === 'vertical'"
      v-model="toast.show"
    >
      {{ toast.value }}
    </v-snackbar>
  </Layout>
</template>

<script>
  import { mapState, mapGetters, mapActions } from 'vuex'
  import Layout from '@/components/Layout.vue'
  import { findIndex, propEq } from 'ramda'

  export default {
    components: {Layout},
    name: 'AddSubnet',
    data: () => ({
      micronet: {},
      newDeviceName: '',
      newDeviceDescription: '',
      newDeviceId: '',
      newDeviceMacAddress: '',
      showAddDeviceForm: false,
      showDevices: [],
      textAreaInput: '',
      saving: false,
      color: 'error',
      mode: '',
      timeout: 2000
    }),
    computed: {
      ...mapState(['editTargetIds', 'toast', 'micronets', 'dhcpSubnets', 'dhcpSubnetDevices']),
      ...mapGetters(['editTarget']),
      currentMicronet () {
        const index = findIndex(propEq('_id', this.editTargetIds.micronetId))(this.micronets)
        const currentMicronet = this.micronets[index]
        let deviceIds = currentMicronet.devices.map((device, index) => {
          // const deviceIdIndex = findIndex(propEq('deviceId', device.deviceId))(micronet.devices)
          return device.deviceId
        })
        let macAddresses = currentMicronet.devices.map((device, index) => {
          return device.macAddress
        })
        return {micronet: currentMicronet, deviceIds: deviceIds, macAddresses: macAddresses}
      }
    },
    methods: {
      ...mapActions(['saveMicronet', 'fetchDhcpSubnets', 'fetchDhcpSubnetDevices', 'upsertDhcpSubnet', 'deleteDhcpSubnet', 'fetchDhcpSubnetDevices', 'upsertDhcpSubnetDevice', 'deleteDhcpSubnetDevice']),
      routeToMicronet () {
        this.$router.push(`/${this.micronet.id}/micronets/${this.editTargetIds.micronetId}`)
      },
      submit () {
        this.saving = true
        return this.saveMicronet(JSON.parse(this.textAreaInput))
          .then(() => { this.saving = false })
      },
      submitForm (subnetIndex) {
        // this.$emit('submitForm', pick(['subnetId', 'subnetName', 'deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
        return this.saveMicronet(this.micronet.subnets[subnetIndex])
          .then(() => { this.saving = false })
      },
      updateDevice (subnetId, deviceId, subnetIndex, deviceIndex, deviceName, deviceDescription, deviceIpv4Host, deviceMacAdd) {
        this.micronet = this.micronet
        const dhcpDeviceUpdate = Object.assign(
          {
            deviceId: deviceId,
            macAddress: deviceMacAdd,
            networkAddress: {
              ipv4: deviceIpv4Host
            }
          })
        this.$emit('upsertDhcpSubnetDevice', {subnetId: subnetId, deviceId: deviceId, data: dhcpDeviceUpdate})
      },
      deleteDevice (subnetId, deviceId, subnetIndex, deviceIndex) {
        const idIndex = findIndex(propEq('deviceId', `${deviceId}`))(this.micronet.subnets[subnetIndex].deviceList)
        idIndex > -1 ? this.micronet.subnets[subnetIndex].deviceList.splice(idIndex, 1) : this.micronet
        this.$emit('deleteDhcpSubnetDevice', {subnetId: subnetId, deviceId: deviceId})
      },
      addDeviceForm () {
        this.showAddDeviceForm = true
      },
      addDeviceToSubnet (subnetId, subnetIndex, deviceName, deviceDescription, deviceId, deviceMacAddress) {
        this.micronet.subnets[subnetIndex].deviceList.push(
          {
            deviceDescription: deviceDescription,
            deviceName: deviceName,
            deviceId: deviceId,
            timestampUtc: (new Date()).toISOString(),
            mac: {
              eui48: deviceMacAddress
            }
          })
        // Adding DHCP Entries
        const dhcpAddDeviceData = Object.assign({}, {
          deviceId: deviceId,
          macAddress: deviceMacAddress,
          networkAddress: {
            ipv4: '192.168.1.42'
          }
        })
        this.$emit('addDhcpSubnetDevice', {subnetId: subnetId, deviceId: deviceId, data: dhcpAddDeviceData})
        this.showAddDeviceForm = !this.showAddDeviceForm
      },
      reset () {
        this.textAreaInput = JSON.stringify(this.editTarget, null, 4)
      }
    },
    created () {
      this.reset()
    },
    mounted () {
      const index = findIndex(propEq('_id', this.editTargetIds.micronetId))(this.micronets)
      const currentMicronet = this.micronets[index]
      // let deviceIds = currentMicronet.devices.map((device, index) => {
      //   // const deviceIdIndex = findIndex(propEq('deviceId', device.deviceId))(micronet.devices)
      //   return device.deviceId
      // })
      // let macAddresses = currentMicronet.devices.map((device, index) => {
      //   return device.macAddress
      // })
      this.micronet = currentMicronet
      currentMicronet.subnets[0].deviceList.map((device, index) => {
        this.showDevices.push({deviceId: device.deviceId, show: true})
      })
      this.fetchDhcpSubnets().then((data) => {
        console.log('\n DHCP SubNets : ' + JSON.stringify(data))
        // console.log('\n Router route : ' + JSON.stringify(this.$route.params.subnetId))
        this.fetchDhcpSubnetDevices(this.$route.params.subnetId).then((data) => {
          console.log('\n DHCP SubNet Devices : ' + JSON.stringify(data))
        })

        this.$on('upsertDhcpSubnetDevice', ({subnetId, deviceId, data: dhcpDeviceUpdate}) => {
          this.upsertDhcpSubnetDevice({subnetId, deviceId, data: dhcpDeviceUpdate})
        })

        this.$on('deleteDhcpSubnetDevice', ({subnetId, deviceId}) => {
          this.deleteDhcpSubnetDevice({subnetId, deviceId})
        })

        this.$on('addDhcpSubnetDevice', ({subnetId, deviceId, data}) => {
          this.upsertDhcpSubnetDevice({subnetId, deviceId, data, event: 'addDhcpSubnetDevice'})
        })
      })
    }
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  .title {
    font-weight: bold
    font-size: 20px
    color: darkred !important;
  }

  .input-textarea {
    width: 95%;
    margin: 32px auto;
    padding: 16px;
  }

  .device-card {
    padding: 50px 50px 50px 50px
    border-left: 6px solid green
    margin-top: 50px
  }

  .device-header {
    padding-top: 10px
  }

  .form-btns {
    margin 100px 50px 20px 50px
  }

  .subnet-form {
    margin-top 50px
    padding: 50px 50px 50px 50px
    border-style: solid
  }

  .close-btn {
    margin-left 90%
  }

  .cards {
    margin-right 30px
  }

  .devices {
    display inline-block
  }
</style>
