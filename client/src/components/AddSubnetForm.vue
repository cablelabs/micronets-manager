<template>
  <v-card>
    <v-card-text>
      <v-form v-model="valid" ref="form" lazy-validation>
      <v-text-field v-model="subnetId" label="Subnet ID"  required :rules="subnetIdRules" />
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
      <v-text-field v-model="deviceName" label="Device Name"  required :rules="deviceNameRules"/>
      <v-text-field v-model="deviceDescription" label="Device Description"  required :rules="deviceDescriptionRules" />
      <div>
        <v-select
          :items="configureRegisteredDevices.macAddresses"
          label="Select Mac Address"
          v-model="macAddress"
          class="input-group--focused"
          item-value="text"
          :rules="[v => !!v || 'Mac Address is required']"
          required
        ></v-select>
      </div>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click.stop="submit"  :disabled="!valid" class="add-subnet-btn">Add Subnet</v-btn>
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
      return { micronet, deviceIds, macAddresses }
    }
  },
  data () {
    return {
      valid: true,
      subnetId: '',
      subnetIdRules: [
        v => !!v || 'SubnetId is required',
        v => (v && v.length >= 32) || 'SubnetId must be atleast 32 characters'
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
      // console.log('\n Submit this.$refs.form : ' + JSON.stringify(this.$refs.form))
      this.$emit('submit', pick(['subnetId', 'subnetName', 'deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
      this.childDialog = false
      this.$emit('close', this.childDialog)
    },
    close () {
      this.childDialog = false
      this.$emit('close', this.childDialog)
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
