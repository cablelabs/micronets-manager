<template>
  <div class="device-row">
    <span class="device-title">
      <p>Device Lease: {{deviceLeases[device.deviceId].status}}</p>
      <div v-if="deviceLeases[device.deviceId].status == 'positive'"><status-indicator positive pulse></status-indicator></div>
      <div v-else="deviceLeases[device.deviceId].status == 'intermediary'"><status-indicator intermediary pulse></status-indicator></div>
      <div v-else><status-indicator intermediary pulse></status-indicator></div>
      <h3>{{ device.deviceName }}</h3>
      <p>{{ device.deviceDescription }}</p>
    </span>
    <span class="device-item">{{ device.mac.eui48}}</span>
    <span class="device-item">{{ device.ipv4.host }}</span>
    <v-btn class="configure-btn" @click.native.stop="configureMicronet">Configure</v-btn>
    <v-btn flat icon class="more-icon" color="grey">
      <v-icon>more_vert</v-icon>
    </v-btn>
  </div>
</template>

<script>
import { mapMutations, mapState } from 'vuex'
import { StatusIndicator } from 'vue-status-indicator'
import 'vue-status-indicator/styles.css'
import {findIndex, propEq, pathEq, filter} from 'ramda'

export default {
  components: {StatusIndicator},
  name: 'DeviceCard',
  props: {
    device: Object,
    subnetId: String,
    micronetId: String
  },
  computed:  {
    ...mapState(['micronets', 'leases', 'deviceLeases']),
    fetchLeaseState () {
      console.log('\n fetchLeaseState computed method called with device : ' + JSON.stringify(this.device) + '\t\t\t SubnetId : ' + JSON.stringify(this.subnetId))
      console.log('\n fetchLeaseState computed method leases from state : ' + JSON.stringify(this.leases))
      //const leaseIndex = findIndex(propEq('deviceId', this.device.deviceId))(this.leases);
      const leaseFound = this.leases.filter((x) => x.data.deviceId === this.device.deviceId)
      console.log('\n Lease Found : ' + JSON.stringify(leaseFound))
      let leaseIndex = this.leases.forEach((lease, index) => {
        console.log('\n Current lease : ' + JSON.stringify(lease))
        if (lease.data.deviceId === this.device.deviceId) {
          console.log('\n Match Found : ' + JSON.stringify(index))
          console.log('\n Match found for lease.data.deviceId : ' + JSON.stringify(lease.data.deviceId) + '\t\t this.device.deviceId : ' + JSON.stringify(this.device.deviceId))
          if (index == -1) {
            console.log('\n index == -1 Returning intermediary')
            return "intermediary"
          }
          if ( index > -1 && this.leases[index].type === 'leaseAcquired') {
            console.log('\n\n this.leases[index].type : ' + JSON.stringify(this.leases[index].type) + '\t\t Index value : ' + JSON.stringify(index))
            console.log('\n Returning positive')
            return "positive"
          }
          if (index > -1 && this.leases[index].type === 'leaseExpired') {
            console.log('\n\n this.leases[index].type : ' + JSON.stringify(this.leases[index].type) + '\t\t Index value : ' + JSON.stringify(index))
            console.log('\n Returning intermediary')
            return "intermediary"
          }
        }
      })
    }
  },
  methods: {
    ...mapMutations(['setEditTargetIds']),
    configureMicronet () {
      this.setEditTargetIds({ micronetId: this.micronetId, subnetId: this.subnetId, deviceId: this.device.deviceId })
      this.$router.push(`/configure-micronet/${this.micronetId}/subnet/${this.subnetId}`)
    },
    created () {
      console.log('\n DeviceCard.vue created method STATE : ' + JSON.stringify(this.micronets))
      console.log('\n Passed leases : ')
    },
    mounted () {
      console.log('\n DeviceCard.vue mounted method STATE : ' + JSON.stringify(this.micronets))
    }
  }
}
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  .configure-btn {
    font-size: 12px;
    font-family: Roboto;
    width: 5%;
    margin-left: 5%;
    margin-right: 5%;
    margin-top: 25px;
  }

  .more-icon {
    margin-left: 5%;
    margin-top: 25px;
  }

  .device-row {
    display: inline;
    min-width: 100%;
    max-height: 200px;
    display: flex;
    text-align: center;
    margin-top: 20px;
  }

  .device-title {
    display: inline-block;
    /*width: 35%;*/
    height: 75px;
    padding-top: 1%;
    /*margin: 55px 10px 10px 10px;*/
    text-align: left;
    /*border: 3px solid #73AD21;*/
  }

  .device-item {
    width: 30%;
    margin: 30px;
    margin-left: 1%
  }

  .device-list {
    min-width: 100%;
    padding-right: 0px;
  }

  .list-divider {
    margin-left: 2px;
    margin-top: 20px;
    margin-bottom: 10px
  }

</style>
