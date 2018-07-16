<template>
  <Layout>
    <h2 class="text-xs-center orange--text title">Configure {{editTargetIds.deviceId ? 'Device' : 'Subnet'}}</h2>
    <h3 class="text-xs-center caption grey--text">
      Micro-Net: {{editTargetIds.micronetId}}<br/>
      Sub-Net: {{editTargetIds.subnetId}}<br/>
      {{editTargetIds.deviceId ? `Device: ${editTargetIds.deviceId}` : ''}}
    </h3>
    <template v-for="(subnet, subnetIndex) in micronet.subnets">
      <v-form v-if="subnet.subnetId === editTargetIds.subnetId" class="text-xs-center subnet-form" v-model="valid"
              ref="subnetForm" lazy-validation>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.subnetId" label="Subnet ID" required disabled
                      :rules="subnetIdRules"/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.subnetName" label="Subnet Name" required
                      :rules="subnetNameRules"/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.ipv4.gateway" label="Subnet IPv4 Gateway" required
                      :rules="ipv4HostRules"/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.ipv4.netmask" label="Subnet IPv4 NetMask" required
                      :rules="ipv4NetmaskRules"/>
        <v-text-field v-if="!editTargetIds.deviceId" v-model="subnet.ipv4.network" label="Subnet IPv4 NetWork" required
                      :rules="ipv4HostRules"/>
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
                    <v-text-field v-model="device.deviceName" label="Device Name" required :rules="deviceNameRules"/>
                    <v-text-field v-model="device.deviceDescription" label="Device Description" required
                                  :rules="deviceDescriptionRules"/>
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
                                  required :rules="ipv4HostRules"/>
                    <!--<v-select-->
                      <!--:items="currentMicronet.macAddresses"-->
                      <!--label="Select Device Mac Address"-->
                      <!--v-model="device.mac.eui48"-->
                      <!--class="input-group&#45;&#45;focused"-->
                      <!--item-value="text"-->
                      <!--required-->
                    <!--&gt;</v-select>-->
                    <v-text-field v-model="device.mac.eui48" label="Mac Address" required disabled/>
                    <v-btn color="success" :disabled="!valid"
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
                <v-form v-model="addDeviceFormValid" ref="addDeviceToSubnetForm" lazy-validation="true"
                        v-if="subnet.subnetId === editTargetIds.subnetId">
                  <v-card class="device-card">
                    <v-btn flat icon dark color="red darken-5" class="close-btn"
                           @click.stop="onCloseAddDevice">
                      <v-icon>close</v-icon>
                    </v-btn>
                    <v-text-field v-model="newDeviceName" label="Device Name" required :rules="deviceNameRules"/>
                    <v-text-field v-model="newDeviceDescription" label="Device Description" required
                                  :rules="deviceDescriptionRules"/>
                    <v-text-field v-model="newDeviceId" label="Device ID" required :rules="deviceIdRules"/>
                    <!--<v-select-->
                      <!--:items="fetchAvailableDeviceIds"-->
                      <!--label="Select Device ID"-->
                      <!--v-model="newDeviceId"-->
                      <!--class="input-group&#45;&#45;focused"-->
                      <!--item-value="text"-->
                      <!--required-->
                      <!--:rules="deviceIdRules"-->
                    <!--&gt;</v-select>-->
                    <v-text-field v-model="newDeviceMacAddress" label="Device Mac Address" required :rules="deviceMacAddressRules"/>
                    <!--<v-select-->
                      <!--:items="currentMicronet.macAddresses"-->
                      <!--label="Select Device Mac Address"-->
                      <!--v-model="newDeviceMacAddress"-->
                      <!--class="input-group&#45;&#45;focused"-->
                      <!--item-value="text"-->
                      <!--required-->
                      <!--:rules="deviceMacAddressRules"-->
                    <!--&gt;</v-select>-->
                    <v-btn color="success" :disabled="!isAddDeviceValid()"
                           @click.stop="addDeviceToSubnet(subnet.subnetId, subnetIndex, newDeviceName, newDeviceDescription, newDeviceId, newDeviceMacAddress)">
                      Add
                    </v-btn>
                  </v-card>
                </v-form>
              </v-flex>
            </template>
          </v-layout>
        </v-container>
        <div class="form-btns">
          <!--<v-btn color="success" v-if="fetchAvailableDeviceIds.length > 0" @click.stop="addDeviceForm">Add Device</v-btn>-->
          <v-btn color="success"  @click.stop="addDeviceForm">Add Device</v-btn>
          <v-btn color="primary" @click.stop="submitForm(subnetIndex)" :disabled="!valid">Submit</v-btn>
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
  import { findIndex, propEq, lensPath, view, difference } from 'ramda'

  export default {
    components: {Layout},
    name: 'AddSubnet',
    data: () => ({
      addDeviceFormValid: false,
      valid: true,
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
      timeout: 2000,
      subnetIdRules: [
        v => !!v || 'SubnetId is required',
        v => /^[A-F\d]{8}-[A-F\d]{4}-4[A-F\d]{3}-[89AB][A-F\d]{3}-[A-F\d]{12}$/i.test(v) || 'SubnetID should be UUIDv4'
      ],
      subnetNameRules: [
        v => !!v || 'Subnet Name is required'
      ],
      deviceNameRules: [
        v => !!v || 'Device Name is required'
      ],
      deviceDescriptionRules: [
        v => !!v || 'Device Description is required'
      ],
      deviceIdRules: [
        v => !!v || 'Device ID is required'
        // v => /^[A-Fa-f0-9]{64}$/i.test(v) || 'Device ID should be SHA256 of the device public key'
      ],
      deviceMacAddressRules: [
        v => !!v || 'Device Mac address is required',
        v => /^^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/i.test(v) || 'Device Mac address should be according to standard IEEE 802 format'
      ],
      ipv4HostRules: [
        v => !!v || 'Subnet IPv4 Host is required',
        v => /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/i.test(v) || 'Ipv4 Host should be valid IP Address'
      ],
      ipv4NetmaskRules: [
        v => !!v || 'Subnet IPv4 NetMask is required',
        v => /^(((255\.){3}(255|254|252|248|240|224|192|128|0+))|((255\.){2}(255|254|252|248|240|224|192|128|0+)\.0)|((255\.)(255|254|252|248|240|224|192|128|0+)(\.0+){2})|((255|254|252|248|240|224|192|128|0+)(\.0+){3}))$/i.test(v) || 'Invalid Ipv4 Netmask format'
      ]
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
      },
      fetchAvailableDeviceIds () {
        const {deviceIds, micronet} = this.currentMicronet
        const subnetIndex = findIndex(propEq('subnetId', this.$router.currentRoute.params.subnetId))(micronet.subnets)
        const subnetLens = lensPath(['subnets', subnetIndex])
        const deviceList = view(subnetLens, micronet).deviceList
        let takenDeviceIds = deviceList.map((device, index) => {
          return device.deviceId
        })
        const availableDeviceIds = difference(deviceIds, takenDeviceIds)
        return availableDeviceIds
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
        return this.saveMicronet({data: this.micronet.subnets[subnetIndex]})
          .then(() => { this.saving = false })
      },
      updateDevice (subnetId, deviceId, subnetIndex, deviceIndex, deviceName, deviceDescription, deviceIpv4Host, deviceMacAdd) {
        this.micronet = this.micronet
        const dhcpDeviceUpdate = Object.assign(
          {
            deviceId: deviceId,
            macAddress: {
              eui48: deviceMacAdd
            },
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
          macAddress: {
            eui48: deviceMacAddress
          },
          networkAddress: {
            ipv4: '192.168.1.42'
          }
        })
        this.$emit('addDhcpSubnetDevice', {subnetId: subnetId, deviceId: deviceId, data: dhcpAddDeviceData})
        this.showAddDeviceForm = !this.showAddDeviceForm
        // this.$refs.addDeviceToSubnetForm.reset()
        this.resetAddDeviceForm()
      },
      resetAddDeviceForm () {
        this.newDeviceMacAddress = ''
        this.newDeviceName = ''
        this.newDeviceDescription = ''
        this.newDeviceId = ''
      },
      onCloseAddDevice () {
        this.resetAddDeviceForm()
        this.showAddDeviceForm = !this.showAddDeviceForm
        return this.showAddDeviceForm
      },
      isAddDeviceValid () {
        return this.newDeviceName !== '' && this.newDeviceMacAddress !== '' && this.newDeviceId !== '' && this.newDeviceDescription !== '' && this.addDeviceFormValid === true
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
      this.micronet = currentMicronet
      currentMicronet.subnets[0].deviceList.map((device, index) => {
        this.showDevices.push({deviceId: device.deviceId, show: true})
      })
      this.fetchDhcpSubnets().then((data) => {
        this.fetchDhcpSubnetDevices(this.$route.params.subnetId).then((data) => {
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
