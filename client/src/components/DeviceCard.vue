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
            <v-btn class="configure-btn" disabled>Configure</v-btn>
            <v-btn flat icon class="more-icon" color="grey">
              <v-icon>more_vert</v-icon>
            </v-btn>
          </div>
          <v-divider v-if="index + 1 < devices.length" :key="index" :inset="inset" class="list-divider"></v-divider>
        </template>
      </v-list>
    </v-container>
</template>

<script>
  export default {
    components: {},
    name: 'DeviceCard',
    data () {
      return {
        inset: false
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
    width: 35%;
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
