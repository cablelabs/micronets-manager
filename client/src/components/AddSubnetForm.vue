<template>
  <v-card>
    <v-card-text>
      <v-text-field v-model="subnetId" label="Subnet ID"  @blur="$v.subnetId.$touch()" required />
      <div>
      <span class="red--text mb-4 mt-3" v-if="!$v.subnetId.required">Subnet ID is required</span>
      <span class="red--text mb-4 mt-3" v-if="!$v.subnetId.minLength">Subnet ID must have at least {{$v.subnetId.$params.minLength.min}} characters.</span>
      </div>
      <v-text-field v-model="subnetName" label="Subnet Name" @input="$v.subnetName.$touch()" required/>
      <div>
        <span class="red--text mb-4 mt-3" v-if="!$v.subnetName.required">Subnet Name is required</span>
      </div>
      <v-text-field v-model="deviceId" label="Device ID" @input="$v.deviceId.$touch()" required />
      <div>
        <span class="red--text mb-4 mt-3" v-if="!$v.subnetName.required">Device ID is required</span>
        <span class="red--text mb-4 mt-3" v-if="!$v.deviceId.minLength">Device ID must have at least {{$v.subnetId.$params.minLength.min}} characters.</span>
      </div>
      <v-text-field v-model="deviceName" label="Device Name" @input="$v.deviceName.$touch()" required />
      <div>
        <span class="red--text mb-4 mt-3" v-if="!$v.deviceName.required">Device Name is required</span>
      </div>
      <v-text-field v-model="deviceDescription" label="Device Description" @input="$v.deviceDescription.$touch()" required />
      <div>
        <span class="red--text mb-4 mt-3" v-if="!$v.deviceDescription.required">Device Description is required</span>
      </div>
      <v-text-field v-model="macAddress" label="Mac Address" @input="$v.macAddress.$touch()" required/>
      <div>
        <span class="red--text mb-4 mt-3" v-if="!$v.macAddress.required">Mac Address is required</span>
        <span class="red--text mb-4 mt-3" v-if="!$v.macAddress.macAddress">Invalid Mac Address.</span>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click.stop="submit" :disabled=isDisabled class="add-subnet-btn">Add Subnet</v-btn>
      <v-btn color="primary" @click.stop="close">Close</v-btn>
      <v-spacer></v-spacer>
    </v-card-actions>
  </v-card>
</template>

<script>
import pick from 'ramda/src/pick'
import { required, minLength, macAddress, or } from 'vuelidate/lib/validators'

export default {
  name: 'add-subnet-form',
  props: ['parentDialog'],
  data () {
    return {
      subnetId: '',
      deviceId: '',
      macAddress: '',
      deviceName: '',
      subnetName: '',
      deviceDescription: '',
      childDialog: this.parentDialog
    }
  },
  computed: {
    isDisabled: function () {
      return this.$v.$invalid === true
    }
  },
  validations: {
    subnetId: {
      required,
      minLength: minLength(32)
    },
    deviceId: {
      required,
      minLength: minLength(32)
    },
    macAddress: {
      required,
      macAddress: or(macAddress(':'), macAddress(''))
    },
    deviceName: {
      required,
      minLength: minLength(1)
    },
    subnetName: {
      required,
      minLength: minLength(1)
    },
    deviceDescription: {
      required,
      minLength: minLength(1)
    }
  },
  methods: {
    submit () {
      this.$emit('submit', pick(['subnetId', 'subnetName', 'deviceId', 'deviceName', 'macAddress', 'deviceDescription'], this))
      this.childDialog = false
      this.$emit('close', this.childDialog)
    },
    close () {
      this.childDialog = false
      this.$emit('close', this.childDialog)
    }
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
