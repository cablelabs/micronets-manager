<template>
  <div class="device-row">
    <!--<p>DEVICE LEASES : {{deviceLeases}}</p>-->
    <div v-if="Object.keys(deviceLeases).length > 0" class="device-indicator">
      <div v-if="deviceLeases[deviceId].status == 'positive'"><status-indicator positive pulse></status-indicator></div>
      <div v-else-if="deviceLeases[deviceId].status == 'intermediary'"><status-indicator intermediary pulse></status-indicator></div>
      <div v-else-if="deviceLeases[deviceId].status == 'negative'"><status-indicator negative pulse></status-indicator></div>
    </div>
    <div v-else="!deviceLeases[deviceId]" class="device-indicator">
      <status-indicator intermediary pulse></status-indicator>
    </div>
    <span class="device-title">
      <h3>{{ device["device-name"] }}</h3>
      <p>{{ device["device-id"] }}</p>
    </span>
    <span class="device-item">{{ device["device-mac"]}}</span>
    <span class="device-item">{{ device["device-ip"] }}</span>
    <!--<v-btn class="configure-btn" @click.native.stop="configureMicronet">Configure</v-btn>-->
    <v-btn flat icon class="more-icon" color="grey">
      <v-icon>more_vert</v-icon>
    </v-btn>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { StatusIndicator } from 'vue-status-indicator'
import 'vue-status-indicator/styles.css'

export default {
  components: {StatusIndicator},
  name: 'DeviceCard',
  props: {
    device: Object,
    deviceId: String,
    subnetId: String,
    micronetId: String
  },
  computed: {
    ...mapState(['micronets', 'deviceLeases', 'users'])
  },
  methods: {
    created () {},
    mounted () {
      console.log('\n DeviceCard.vue mounted method Device Leases : ' + JSON.stringify(this.deviceLeases))
      console.log('\n DeviceCard.vue mounted method passed props Device : ' + JSON.stringify(this.device) + '\t\t Device ID : ' + JSON.stringify(this.deviceId))
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
