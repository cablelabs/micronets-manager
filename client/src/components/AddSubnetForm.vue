<template>
  <v-card>
    <v-card-text>
      <v-form v-model="valid" ref="form" lazy-validation>
        <v-text-field v-model="subnetId" label="Subnet ID" required :rules="subnetIdRules"/>
        <v-text-field v-model="subnetName" label="Subnet Name" required :rules="subnetNameRules"/>
        <div>
          <v-select
            :items="configureRegisteredDevices.deviceIds"
            label="Select Device ID"
            v-model="deviceId"
            class="input-group--focused"
            item-value="text"
            :rules="[v => !!v || 'Device ID is required']"
            required
          ></v-select>
        </div>
        <v-text-field v-model="deviceName" label="Device Name" required :rules="deviceNameRules"/>
        <v-text-field v-model="deviceDescription" label="Device Description" required :rules="deviceDescriptionRules"/>
        <v-text-field v-model="macAddress" @input=associatedDeviceMacAddress label="MAC Address" required disabled/>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click.stop="submit" :disabled="!valid" class="add-subnet-btn">Add Subnet</v-btn>
      <v-btn color="primary" @click.stop="close">Close</v-btn>
      <v-spacer></v-spacer>
    </v-card-actions>
  </v-card>
</template>

<script>
  import pick from 'ramda/src/pick'
  import { find, propEq } from 'ramda'

  export default {
    name: 'add-subnet-form',
    props: {
      parentDialog: Boolean,
      micronets: Array
    },
    computed: {
      configureRegisteredDevices () {
        const micronet = find(propEq('_id', this.$route.params.id))(this.micronets)
        // let micronetDevices = micronet.devices.map((device, index) => {
        //   return {
        //     deviceIds: device.deviceId,
        //     index: index,
        //     macAddress: device.macAddress
        //   }
        // })
        let deviceIds = micronet.devices.map((device, index) => {
          // const deviceIdIndex = findIndex(propEq('deviceId', device.deviceId))(micronet.devices)
          return device.deviceId
        })
        let macAddresses = micronet.devices.map((device, index) => {
          return device.macAddress
        })
        return {micronet, deviceIds, macAddresses}
      },
      associatedDeviceMacAddress () {
        if (this.deviceId) {
          const associatedDevice = find(propEq('deviceId', this.deviceId))(this.configureRegisteredDevices.micronet.devices)
          // const macAddressIndex = findIndex(propEq('deviceId', this.deviceId))(this.configureRegisteredDevices.micronet.devices)
          this.macAddress = associatedDevice.macAddress
          return associatedDevice.macAddress
        }
      }
    },
    data () {
      return {
        valid: false,
        subnetId: '',
        subnetIdRules: [
          v => !!v || 'SubnetId is required',
          v => /^[A-F\d]{8}-[A-F\d]{4}-4[A-F\d]{3}-[89AB][A-F\d]{3}-[A-F\d]{12}$/i.test(v) || 'SubnetID should be UUIDv4'
        ],
        deviceId: '',
        macAddress: '',
        deviceName: '',
        deviceNameRules: [
          v => !!v || 'Device Name is required'
        ],
        subnetName: '',
        subnetNameRules: [
          v => !!v || 'Subnet Name is required'
        ],
        deviceDescription: '',
        deviceDescriptionRules: [
          v => !!v || 'Device Description is required'
        ],
        childDialog: this.parentDialogs
      }
    },
    methods: {
      submit () {
        if (this.$refs.form.validate()) {
          console.log('\n Submit method : ')
          this.$emit('submit', pick(['subnetId', 'subnetName', 'deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
          this.childDialog = false
          this.$emit('close', this.childDialog)
        }
      },
      close () {
        this.childDialog = false
        this.$emit('close', this.childDialog)
        this.$refs.form.reset()
      },
      created () {}
    }
  }
</script>

<style lang="css">
  .add-subnet-btn {
    margin-right: 10%;
  }

  .close-btn {
    margin-left: 15%;
  }
</style>
