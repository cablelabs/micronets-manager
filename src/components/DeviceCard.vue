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
              <v-btn raised class="configure-btn">Configure</v-btn>
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
  import VListTileAction from 'vuetify/es5/components/VList/VListTileAction'
  import VContent from 'vuetify/es5/components/VGrid/VContent'

  export default {
    components: {
      VContent,
      VListTileAction},
    name: 'DeviceCard',
    data () {
      return {
      }
    },

    props: {
      devices: Array
    },

    methods: {
    }
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .configure-btn {
    color: grey;
    background-color: white;
    font-size: 12px;
    font-family: Roboto;
    width: 5%;
    margin-left: 5%;
    margin-right: 5%;
  }
  .more-icon {
    color: grey;
    background-color: white;
    margin-left: 5%;
  }

  .device-row {
    display: inline;
    min-width: 100%;
    max-height: 200px;
  }

  .device-title {
    display: inline-block;
    width: 25%;
    height: 75px;
    margin: 10px;
    border: 3px solid #73AD21;
  }
  .device-item {
    width: 25%;
    margin: 20px;
  }
  .device-list {
    min-width: 100%;
    padding-right: 0px;
  }
  .list-divider {
    margin-left: 5px;
  }

</style>
