<template>
  <v-app id="subnet-card">
    <v-layout row wrap>
      <v-flex lg12>
        <v-card class="subnet-card">
          <v-card-media height="00px">
          </v-card-media>
          <v-card-title primary-title>
            <div>
              <div class="headline">Personal</div>
              <span  v-if="!show" class="grey--text">3 Devices</span>
              <span  v-if="show" class="black--text--darken-4">Devices</span>
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
             <DeviceCard/>
            </v-card-text>
          </v-slide-y-transition>
        </v-card>
      </v-flex>
    </v-layout>
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
    width: 88em;
  }
  .addDevice {
    color: #C41B20;
    background-color: #EEEEEE;
    font-size: 14px;
    font-family: Roboto;
  }
</style>
