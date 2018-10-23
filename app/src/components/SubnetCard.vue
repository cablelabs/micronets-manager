<template >
  <v-card  class="subnet-card">
    <v-card-title primary-title>
      <!--<p>Subnet Card subnet : {{subnet}}</p>-->
      <div>
        <div class="headline">{{ subnet["class"] }}</div>
        <span v-if="!show" class="grey--text" slot="text">{{`${subnet["connected-devices"].length} Devices`}}</span>
      </div>
      <v-spacer></v-spacer>
      <v-btn raised class="addDevice" @click.native.stop="configureMicronet" :disabled="true">Configure</v-btn>
      <v-card-actions>
        <v-btn icon @click.native="show = !show">
          <v-icon>{{ show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card-title>
    <v-slide-y-transition>
      <v-card-text v-show="show">
        <span>
          <span class="numberCircle">{{subnet["connected-devices"].length}}</span>
          <span class="card-text-title">Devices</span>
        </span>
        <v-list class="device-list">
          <template v-for="(device, deviceIndex) in subnet['connected-devices']">
            <DeviceCard :device="device" :deviceId="device['device-id']" :subnetId="subnet['micronet-subnet-id']" :micronetId="micronetId" :subscriberId="subscriberId"/>
            <v-divider v-if="deviceIndex + 1 < subnet['connected-devices'].length" :inset="false" class="list-divider"/>
          </template>
        </v-list>
      </v-card-text>
    </v-slide-y-transition>
  </v-card>
</template>

<script>
import DeviceCard from '../components/DeviceCard'
import { mapMutations } from 'vuex'

export default {
  components: { DeviceCard },
  name: 'SubnetCard',
  data () {
    return {
      show: false
    }
  },
  props: {
    subnet: Object,
    micronetId: String,
    subscriberId: String
  },
  methods: {
    ...mapMutations(['setEditTargetIds']),
    configureMicronet () {
      this.setEditTargetIds({ micronetId: this.micronetId, subnetId: this.subnet.subnetId })
      this.$router.push(`/configure-micronet/${this.micronetId}/subnet/${this.subnet.subnetId}`)
    }
  },
  mounted () {
    console.log('\n SubnetCard mounted method this.subnet : ' + JSON.stringify(this.subnet) + '\t\t micronetID : ' + JSON.stringify(this.micronetId) + '\t\t Subscriber ID : ' + JSON.stringify(this.subscriberId))
  },
  created () {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  .subnet-card {
    min-width: 100%;
    margin-top: 20px;
  }
  .addDevice {
    color: #C41B20;
    background-color: #EEEEEE;
    font-size: 14px;
    font-family: Roboto;
  }
  .card-text-title {
    color: black;
    font-family: 'Roboto';
    font-size: 18px;
    font-weight: bold;
    margin-left: 1%;
    margin-top: 5%;
    margin-bottom: -5%;
  }
  .numberCircle {
    border-radius: 50%;
    width: 15px;
    height: 15px;
    padding: 8px;
    background: white;
    border: 2px solid black;
    color: black;
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    font-family: Roboto, sans-serif;
    margin-left: 1%;
  }
</style>
