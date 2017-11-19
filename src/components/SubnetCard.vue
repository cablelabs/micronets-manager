<template>
  <v-app id="subnet-card">
          <v-card class="subnet-card">
            <v-card-title primary-title>
              <div>
                <div class="headline">Personal</div>
                <span v-if="!show" class="grey--text">3 Devices</span>
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
                <h3 class="card-title">Devices</h3>
                <DeviceCard/>
              </v-card-text>
            </v-slide-y-transition>
          </v-card>
  </v-app>
</template>

<script>
  import VBtn from 'vuetify/es5/components/VBtn/VBtn'
  import DeviceCard from '../components/DeviceCard'

  export default {
    components: {VBtn, DeviceCard},
    name: 'SubnetCard',
    data () {
      return {
        show: false
      }
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
    background-color: white;
  }

  .addDevice {
    color: #C41B20;
    background-color: #EEEEEE;
    font-size: 14px;
    font-family: Roboto;
  }

  .card-title {
    color: black;
    font-family: 'Roboto';
    font-weight: bold;
    margin-left: 2%;
    margin-top: 5%;
    margin-bottom: -5%;
  }
</style>
