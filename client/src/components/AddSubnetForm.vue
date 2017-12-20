<template>
  <v-card>
    <v-card-text>
      <v-text-field v-model="subnetId" label="Subnet ID" />
      <v-text-field v-model="subnetName" label="Subnet Name" />
      <v-text-field v-model="deviceId" label="Device ID" />
      <v-text-field v-model="deviceName" label="Device Name" />
      <v-text-field v-model="deviceDescription" label="Device Description" />
      <v-text-field v-model="macAddress" label="Mac Address" />
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" flat @click.stop="$emit('cancel')">cancel</v-btn>
      <v-btn color="primary" @click.stop="submit">Add Subnet</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import pick from 'ramda/src/pick'

export default {
  name: 'add-subnet-form',
  data () {
    return {
      subnetId: '',
      deviceId: '',
      macAddress: '',
      deviceName: '',
      subnetName: '',
      deviceDescription: ''
    }
  },
  methods: {
    submit () {
      this.$emit('submit', pick(['subnetId', 'subnetName', 'deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
    }
  }
}
</script>

<style lang="css">
</style>
