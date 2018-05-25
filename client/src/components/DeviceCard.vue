<template>
  <div class="device-row">
    <div v-if="Object.keys(deviceLeases).length > 0 && deviceLeases[device.deviceId]" class="device-indicator">
      <div v-if="deviceLeases[device.deviceId].status == 'positive'"><status-indicator positive pulse></status-indicator></div>
      <div v-else-if="deviceLeases[device.deviceId].status == 'intermediary'"><status-indicator intermediary pulse></status-indicator></div>
    </div>
    <div v-else="!deviceLeases[device.deviceId]" class="device-indicator">
      <!--<p>Object.keys(deviceLeases).length : {{Object.keys(deviceLeases).length}}</p>-->
      <!--<p>deviceLeases[device.deviceId] : {{deviceLeases[device.deviceId]}}</p>-->
      <status-indicator intermediary pulse></status-indicator>
    </div>
    <span class="device-title">
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
    ...mapState(['micronets', 'deviceLeases']),
  },
  methods: {
    ...mapMutations(['setEditTargetIds']),
    configureMicronet () {
      this.setEditTargetIds({ micronetId: this.micronetId, subnetId: this.subnetId, deviceId: this.device.deviceId })
      this.$router.push(`/configure-micronet/${this.micronetId}/subnet/${this.subnetId}`)
    },
    created () {
      console.log('\n DeviceCard.vue created method micronets : ' + JSON.stringify(this.micronets) + '\t\t Device Leases : ' + JSON.stringify(this.deviceLeases))
    },
    mounted () {}
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
    margin-top: 2%;
  }

  .more-icon {
    margin-left: 5%;
    margin-top: 2%;
  }

  .device-row {
    display: inline;
    min-width: 100%;
    min-height: auto;
    display: flex;
    text-align: center;
    margin-top: 20px;
  }

  .device-indicator {
    padding-top :2.5%
    text-align center
    min-width: 4%;
    min-height: auto;
  }

  .device-title {
    display: inline-block;
    /*min-width: auto*/
    min-width : 35%
    min-height: auto;
    max-height: 105px;
    padding-top: 2%;
    /*margin: 55px 10px 10px 10px;*/
    text-align: left;
    /*border: 3px solid #73AD21;*/
  }

  .device-item {
    padding-top: 0.5%;
    min-width: 10%;
    margin: 30px;
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
