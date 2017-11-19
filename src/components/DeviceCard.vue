<template>
  <v-content fluid>
    <v-container row grow wrap>
      <v-list class="device-list">
        <template v-for="(item, index) in items">
          <div class="device-row">
            <span class="device-title">
              <h3>{{ item.deviceName }}</h3>
              <p>{{ item.deviceDescription }}</p>
            </span>
            <span class="device-item">{{ item.macAddress }}</span>
            <span class="device-item">{{ item.ipAddress }}</span>
              <v-btn raised class="configure-btn">Configure</v-btn>
            <v-btn flat icon class="more-icon">
              <v-icon>more_vert</v-icon>
            </v-btn>
          </div>
          <v-divider v-if="index + 1 < items.length" :key="item.title"></v-divider>
        </template>
      </v-list>
    </v-container>
  </v-content>
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
        selected: [2],
        items: [
          {
            deviceName: 'Camera',
            deviceDescription: 'Ovis Mini Cam?',
            macAddress: '192.168.1.12',
            ipAddress: '23.45.56.43.34.98.88'
          },
          {
            deviceName: 'Tablet',
            deviceDescription: 'Nexus tablet',
            macAddress: '192.168.1.12',
            ipAddress: '23.45.56.43.34.98.88'
          },
          {
            deviceName: 'Computer',
            deviceDescription: 'MacBook Pro 2015',
            macAddress: '192.168.1.12',
            ipAddress: '23.45.56.43.34.98.88'
          },
          {
            deviceName: 'Mini cam',
            deviceDescription: 'Mini Cam',
            macAddress: '192.168.1.12',
            ipAddress: '23.45.56.43.34.98.88'
          },
          {
            deviceName: 'iPhone',
            deviceDescription: 'iPhone X 2017',
            macAddress: '192.168.1.12',
            ipAddress: '23.45.56.43.34.98.88'
          }
        ]
      }
    },

    methods: {
      toggle (index) {
        const i = this.selected.indexOf(index)

        if (i > -1) {
          this.selected.splice(i, 1)
        } else {
          this.selected.push(index)
        }
      }
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
    width: 35%;
    margin: 50px;
  }
  .device-list {
    min-width: 100%;
  }

</style>
