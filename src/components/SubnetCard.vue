<template>
          <v-card v-if="subnets" class="subnet-card">
            <v-card-title primary-title>
              <div>
                <div class="headline">{{ subnets.subnetName }}</div>
                <span v-if="!show" class="grey--text" slot="text">{{`${subnets.deviceList.length} Devices`}}</span>
              </div>
              <v-spacer></v-spacer>
              <v-btn raised class="addDevice">ADD DEVICE</v-btn>
              <v-card-actions>
                <v-btn icon @click.native="show = !show">
                  <v-icon>{{ show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card-title>
            <v-slide-y-transition>
              <v-card-text v-show="show">
                <span>
                <span class="numberCircle">{{subnets.deviceList.length}}</span>
                <span class="card-text-title">Devices</span>
                </span>
                <DeviceCard :devices="subnets.deviceList"/>
              </v-card-text>
            </v-slide-y-transition>
          </v-card>
</template>

<script>
  import VBtn from 'vuetify/es5/components/VBtn/VBtn'
  import DeviceCard from '../components/DeviceCard'
  import VCardTitle from 'vuetify/src/components/VCard/VCardTitle'

  export default {
    components: { VCardTitle, VBtn, DeviceCard },
    name: 'SubnetCard',
    data () {
      return {
        show: false
      }
    },
    props: {
      subnets: Object
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  h1, h2 {
    font-weight: normal;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }
  a {
    color: #42b983;
  }
  .subnet-card {
    min-width: 100%;
    margin-top: 20px;
    /*background-color: #EEEEEE;*/
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
    background: #fff;
    border: 2px solid black;
    color: black;
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    font-family: Roboto, sans-serif;
    margin-left: 1%;
  }

</style>
