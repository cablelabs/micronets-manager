<template>
  <v-container fluid>
    <v-layout>
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
        <p>Current Micronet : {{ micronet }}</p>
        <p>ShowDevices: {{ showDevices }}</p>
        <!--<p>ShowDevices Updated array : {{ showDevices[0].show }}</p>-->
        <!--<p v-model="currentMicronet.subnets" placeholder="add multiple lines" />-->
        <template v-for="(subnet, subnetIndex) in micronet.subnets">
          <v-form class="text-xs-center subnet-form" ref="form">
            <v-text-field v-model="subnet.subnetId" label="Subnet ID" required/>
            <v-text-field v-model="subnet.subnetName" label="Subnet Name" required/>
            <v-text-field v-model="subnet.ipv4.gateway" label="Subnet IPv4 Gateway" required/>
            <v-text-field v-model="subnet.ipv4.netmask" label="Subnet IPv4 NetMask" required/>
            <v-text-field v-model="subnet.ipv4.network" label="Subnet IPv4 NetWork" required/>
            <div>
              <h3 v-if="subnet.deviceList" class="device-header">Devices</h3>
              <v-btn color="success" @click.stop="addDeviceForm">Add Device</v-btn>
            </div>
            <v-flex>
              <div class="cards">
                <v-card class="device-card" v-show="true">
                  <template v-for="(device, deviceIndex) in subnet.deviceList">
                    <v-btn flat icon dark color="red darken-5" class="close-btn"
                           @click.stop="deleteDevice(subnet.subnetId, device.deviceId, subnetIndex, deviceIndex)">
                      <v-icon>close</v-icon>
                    </v-btn>
                    <v-text-field v-model="device.deviceName" label="Device Name" required/>
                    <v-text-field v-model="device.deviceDescription" label="Device Description" required/>
                    <v-select
                      :items="currentMicronet.deviceIds"
                      label="Select Device ID"
                      v-model="device.deviceId"
                      class="input-group--focused"
                      item-value="text"
                      required
                    ></v-select>
                    <v-text-field v-model="device.ipv4.host" label="Device IPv4 HOST" required/>
                    <v-select
                      :items="currentMicronet.macAddresses"
                      label="Select Device Mac Address"
                      v-model="device.mac.eui48"
                      class="input-group--focused"
                      item-value="text"
                      required
                    ></v-select>
                    <v-btn color="success"
                           @click.stop="updateDevice(subnet.subnetId, device.deviceId, subnetIndex, deviceIndex)">Update
                    </v-btn>
                    <!--<v-btn color="error" @click.stop="deleteDevice(subnet.subnetId, device.deviceId, subnetIndex,deviceIndex)">Delete</v-btn>-->
                  </template>
                </v-card>
              </div>
              <div class="cards">
                <template v-if="showAddDeviceForm == true">
                  <v-card class="device-card">
                    <v-text-field v-model="newDeviceName" label="Device Name" required/>
                    <v-text-field v-model="newDeviceDescription" label="Device Description" required/>
                    <v-text-field v-model="newDeviceId" label="Device ID" required/>
                    <v-text-field v-model="newDeviceMacAddress" label="Device Mac Address" required/>
                    <v-btn color="success"
                           @click.stop="addDeviceToSubnet(subnet.subnetId, subnetIndex, newDeviceName, newDeviceDescription, newDeviceId, newDeviceMacAddress)">
                      Add
                    </v-btn>
                  </v-card>
                </template>
              </div>
            </v-flex>
            <div class="form-btns">
              <v-btn color="primary" @click.stop="submitForm(subnetIndex)">Submit</v-btn>
              <v-btn>Done</v-btn>
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
    </v-layout>
  </v-container>
</template>

<script>
  import { mapState, mapGetters, mapActions } from 'vuex'
  import Layout from '@/components/Layout.vue'
  import { findIndex, propEq, pick } from 'ramda'

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
      ...mapState(['editTargetIds', 'toast', 'micronets']),
      ...mapGetters(['editTarget']),
      currentMicronet () {
        console.log('\n currentMicronet method called ... ')
        const index = findIndex(propEq('_id', this.editTargetIds.micronetId))(this.micronets)
        console.log('\n currentMicronet Index : ' + JSON.stringify(index))
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
      ...mapActions(['saveMicronet']),
      onInputChange () {},
      onBlurTextarea () {},
      submit () {
        this.saving = true
        return this.saveMicronet(JSON.parse(this.textAreaInput))
          .then(() => { this.saving = false })
      },
      submitForm (subnetIndex) {
        console.log('\n SubmitForm called subnetIndex : ' + JSON.stringify(subnetIndex))
        // console.log('\n SubmitForm called this.$refs.form : ' + JSON.stringify(this.$refs.form.subnetId))
        console.log('\n SubnetForm accessing values subnetName: ' + JSON.stringify(this.micronet.subnets[subnetIndex].subnetName))
        console.log('\n SubnetForm accessing values subnetId: ' + JSON.stringify(this.micronet.subnets[subnetIndex].subnetId))
        console.log('\n SubnetForm accessing NEW VALUES : ' + JSON.stringify(this.micronet))
        // this.$emit('submitForm', pick(['subnetId', 'subnetName', 'deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
        return this.saveMicronet(this.micronet.subnets[subnetIndex])
          .then(() => { this.saving = false })
      },
      updateDevice (subnetId, deviceId, subnetIndex, deviceIndex) {
        console.log('\n updateDevice called deviceIndex : ' + JSON.stringify(deviceIndex) + '\t\t SubnetIndex : ' + JSON.stringify(subnetIndex))
        console.log('\n updateDevice called subnetId : ' + JSON.stringify(subnetId) + '\t\t\t DeviceId : ' + JSON.stringify(deviceId))
        console.log('\n updateDevice called deviceName : ' + JSON.stringify(this.micronet.subnets[subnetIndex].deviceList[deviceIndex].deviceName))
        this.$emit('updateDeviceInSubnet', pick(['deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
      },
      deleteDevice (subnetId, deviceId, subnetIndex, deviceIndex) {
        console.log('\n deleteDevice called subnetId : ' + JSON.stringify(subnetId) + '\t\t\t DeviceId : ' + JSON.stringify(deviceId))
        console.log('\n deleteDevice called subnetIndex : ' + JSON.stringify(subnetIndex) + '\t\t\t DeviceIndex : ' + JSON.stringify(deviceIndex))
        console.log('\n deleteDevice called this.$refs.subnetForm : ' + JSON.stringify(this.$refs.subnetForm))
        // this.$emit('submitForm', pick(['subnetId', 'subnetName', 'deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
        // this.showDevices[deviceIndex].show = false
        console.log('\n this.micronet : ' + JSON.stringify(this.micronet))
        const idIndex = findIndex(propEq('deviceId', `${deviceId}`))(this.micronet.subnets[subnetIndex].deviceList)
        console.log('\n\n Device to delete index : ' + JSON.stringify(idIndex))
        const newMicronet = idIndex > -1 ? this.micronet.subnets[subnetIndex].deviceList.splice(idIndex, 1) : this.micronet
        console.log('\n new Micro-net : ' + JSON.stringify(newMicronet))
      },
      addDeviceForm () {
        console.log('\n addDeviceForm called')
        console.log('\n this.micronet : ' + JSON.stringify(this.micronet))
        console.log('\n this.addDeviceForm : ' + JSON.stringify(this.showAddDeviceForm))
        this.showAddDeviceForm = !this.showAddDeviceForm
      },
      addDeviceToSubnet (subnetId, subnetIndex, deviceName, deviceDescription, deviceId, deviceMacAddress) {
        console.log('\n addDeviceToSubnetcalled subnetId : ' + JSON.stringify(subnetId) + '\t\t\t subnetIndex : ' + JSON.stringify(subnetIndex))
        console.log('\n addDeviceToSubnet called device deviceName : ' + JSON.stringify(deviceName) + '\t\t\t deviceDescription : ' + JSON.stringify(deviceDescription) + '\t\t\t deviceId : ' + JSON.stringify(deviceId) + '\t\t\t DeviceMacAddress : ' + JSON.stringify(deviceMacAddress))
        console.log('\n this.micronet : ' + JSON.stringify(this.micronet))
        this.micronet.subnets[subnetIndex].deviceList.push(
          {
            deviceDescription: deviceDescription,
            deviceName: deviceName,
            deviceId: deviceId,
            timestampUtc: '2018-04-09T19:33:55.681Z',
            ipv4: {
              host: '192.168.0.2'
            },
            mac: {
              eui48: deviceMacAddress
            }
          })
        console.log('\n New Micronet after adding device : ' + JSON.stringify(this.micronet))
        this.showAddDeviceForm = !this.showAddDeviceForm
      },
      reset () {
        this.textAreaInput = JSON.stringify(this.editTarget, null, 4)
      }
    },
    created () {
      console.log('\n configure-micronet created called ... ')
      this.reset()
    },
    mounted () {
      console.log('\n configure-micronet mounted called ... ')
      const index = findIndex(propEq('_id', this.editTargetIds.micronetId))(this.micronets)
      console.log('\n currentMicronet Index : ' + JSON.stringify(index))
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
      console.log('\n Mounted this.micro-net : ' + JSON.stringify(this.micronet))
      console.log('\n Mounted this.showDevices : ' + JSON.stringify(this.showDevices))
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
    margin 20px 20px 20px 20px
    margin-bottom 50px
  }

  .device-header {
    padding: 50px 50px 50px 50px
    margin-left -100em
    float left float
    display block
  }

  .form-btns {
    margin 100px 50px 20px 50px
  }

  .subnet-form {
    /*background-color white*/
    padding: 50px 50px 50px 50px
    /*border darkred*/
    border-style: solid
    /*background-color: lightgrey;*/
    /*border-left: 6px solid red;*/
  }

  .close-btn {
    margin-left 90%
  }

  .cards {
    margin 20px 20px 20px 20px
  }
</style>
