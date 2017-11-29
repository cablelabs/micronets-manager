<template>
    <v-container row wrap>
      <v-list class="device-list">
        <template v-for="(item, index) in devices">
          <div class="device-row" :key="index">
            <span class="device-title">
              <h3>{{ item.deviceName }}</h3>
              <p>{{ item.deviceDescription }}</p>
            </span>
            <span class="device-item">{{ item.mac.eui48}}</span>
            <span class="device-item">{{ item.ipv4.host }}</span>
              <v-btn raised class="configure-btn" disabled>Configure</v-btn>
            <v-btn flat icon class="more-icon">
              <v-icon>more_vert</v-icon>
            </v-btn>
          </div>
          <v-divider v-if="index + 1 < devices.length" :key="index" inset="false" class="list-divider"></v-divider>
        </template>
      </v-list>
    </v-container>
</template>

<script>
  export default {
    components: {},
    name: 'DeviceCard',
    data () {
      console.log('\n DEVICE CARD DEVICES PROP : ' + JSON.stringify(this.devices))
      return {
      }
    },
    props: {
      devices: Array
    },
    methods: {}
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  @import '../style/main'
  .configure-btn {
    color: $theme.grey;
    background-color: $theme.white;
    font-size: 12px;
    font-family: Roboto;
    width: 5%;
    margin-left: 5%;
    margin-right: 5%;
    margin-top: 1%;
  }
  .more-icon {
    color: $theme.grey;
    background-color: $theme.white;
    margin-left: 5%;
    margin-top: 1%;
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
    width: 25%;
    height: 75px;
    padding-top: 1%;
    /*margin: 55px 10px 10px 10px;*/
    text-align: left;
    /*border: 3px solid #73AD21;*/
  }
  .device-item {
    width: 30%;
    margin: 25px;
  }
  .device-list {
    min-width: 100%;
    padding-right: 0px;
  }
  .list-divider {
    margin-left: 2px;
  }

</style>
