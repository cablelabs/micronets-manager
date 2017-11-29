<template>
  <v-content fluid class="app">
    <v-container row grow wrap >
      <v-app id="app" >
        <v-navigation-drawer
          fixed
          v-model="drawer"
          disable-resize-watcher="true"
          right
          app
        >
          <v-flex offset-sm0 wrap>
            <v-card>
              <v-toolbar color="white" dark>
                <v-toolbar-title class="black--text">Console</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon @click.stop="drawer = !drawer">
                  <v-icon class="custom-icon">close</v-icon>
                </v-btn>
              </v-toolbar>
              <v-list>
                <template v-for="(message,index) in items.logEvents">
                  <v-divider />
                  <div class="message-list">
                    <span class="messages" ><strong>{{ formatLogMessage(message) }}</strong></span>
                  </div>
                </template>
              </v-list>
            </v-card>
          </v-flex>
        </v-navigation-drawer>
        <v-toolbar color="#3A3A3A" dark fixed app>
          <header class="text-xs-center">
            <img class="logo" src="../assets/cablelabs-logo.png"/>
          </header>
          <v-toolbar-title class="toolbar-title">Micronets Manager</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn flat icon @click.stop="drawer = !drawer">
            <img class="logo" src="../assets/console-logo.png"/>
          </v-btn>
        </v-toolbar>
        <template v-if="items && items.subnets.length > 0" v-for="(item,index) in items.subnets">
          <SubnetCard :subnets="item" :key="index"></SubnetCard>
        </template>
        <!--<template v-if="micronet && micronet[0].subnets.length > 0" v-for="(item,index) in micronet[0].subnets">-->
          <!--<SubnetCard :subnets="item" :key="index"></SubnetCard>-->
        <!--</template>-->
        <template>
          <p> <strong>this.$store.state value :</strong> {{this.$store.state}}</p>
          <p> <strong>this.$store.getters.microNet value :</strong> {{this.$store.getters.micronet}}</p>
          <p> <strong>this.micronet value :</strong> {{this.micronet}}</p>
        </template>
        <!--<template v-if="micronet[0].subnets.length == 0">-->
          <!--<v-card>-->
            <!--<v-card-text class="no-subnets">No Micro-nets found </v-card-text>-->
          <!--</v-card>-->
        <!--</template>-->
      </v-app>
    </v-container>
    <v-footer app>
      <span class="black--text">&copy; 2017 CableLabs.</span>
      <v-spacer></v-spacer>
    </v-footer>
  </v-content>
</template>

<script>
  import SubnetCard from '../components/SubnetCard.vue'
  import Moment from 'moment'
  import axios from 'axios'
  import { mapGetters, mapState, mapActions } from 'vuex'

  export default {
    components: { SubnetCard },
    name: 'home',
    computed: {
      ...mapGetters({micronet: 'micronet'}),
      ...mapState({micronet: 'micronet'})
    },
    data: () => ({
      drawer: false,
      eItems: {
        subnets: []
      },
      items: {
        'timestampUtc': '20171116T202706.000',
        'statusCode': 0,
        'statusText': 'Success!',
        'logEvents': [
          '20171116T202706.010: Created subnet Medical-001',
          '20171116T202706.020: Added device Gram\'s Insulin Pump'
        ],
        'subnets': [{
          'subnetId': 'a4b1c01c-7247-4e30-75b0-a8705783f9b9',
          'subnetName': 'Medical',
          'ipv4': {
            'network': '192.168.1.0',
            'netmask': '255.255.255.0',
            'gateway': '192.168.1.1'
          },
          'deviceList': [{
            'timestampUtc': '20171116T202706.005Z',
            'deviceId': 'ab242b4fd36f8a05f872d68bec2cca09aa89bb2a555a82ddaab9c4748556f746',
            'deviceName': 'Gram\'s Insulin Pump',
            'deviceDescription': 'Pump-o-Matic 5000',
            'mac': {
              'eui48': '7A86B493840E'
            },
            'ipv4': {
              'host': '192.168.1.2'
            }
          },
          {
            'timestampUtc': '20171116T202706.005Z',
            'deviceId': 'ab242b4fd36f8a05f872d68bec2cca09aa89bb2a555a82ddaab9c4748556f746',
            'deviceName': 'Gram\'s BP Monitor',
            'deviceDescription': 'BP Monitor',
            'mac': {
              'eui48': '7A89G493840E'
            },
            'ipv4': {
              'host': '192.168.1.3'
            }
          }]
        },
        {
          'subnetId': 'd9b1c91c-7247-4e30-85b0-a8705783f9b8',
          'subnetName': 'Personal',
          'ipv4': {
            'network': '192.169.1.0',
            'netmask': '255.255.255.0',
            'gateway': '192.169.1.1'
          },
          'deviceList': [{
            'timestampUtc': '20171116T202706.005Z',
            'deviceId': 'ab242b4fd36f8a05f872d68bec2cca09aa89bb2a555a82ddaab9c4748556f746',
            'deviceName': 'Macbook Pro',
            'deviceDescription': 'Personal computer',
            'mac': {
              'eui48': '7A86B493840E'
            },
            'ipv4': {
              'host': '192.169.1.2'
            }
          },
          {
            'timestampUtc': '20171116T202706.005Z',
            'deviceId': 'ab242b4fd36f8a05f872d68bec2cca09aa89bb2a555a82ddaab9c4748556f746',
            'deviceName': 'iPhone X',
            'deviceDescription': 'iPhone X',
            'mac': {
              'eui48': '7A86B493840E'
            },
            'ipv4': {
              'host': '192.169.1.3'
            }
          }]
        }]
      }
    }),
    methods: {
      ...mapState(['micronet']),
      ...mapActions(['getMicronets']),
      fetchMicronets () {
        const url = `${process.env.BASE_URL || ''}/micronets`
        return axios({
          method: 'get',
          url,
          crossDomain: true,
          headers: { 'Content-type': 'application/json' }
        })
          .then(response => {
            console.log('\n response : ' + JSON.stringify(response))
          })
      },
      formatLogMessage (log) {
        console.log('\n log : ' + JSON.stringify(log))
        if (log.indexOf(':') > -1) {
          var utcLogDateTimeStamp = log.split(':')[0]
          return Moment(utcLogDateTimeStamp).format('lll').concat(' ').concat(log.split(':')[1])
        } else {
          return Moment(new Date()).format('lll').concat(' ').concat(log)
        }
      }
    },
    created () {
      console.log('\n CREATED method ...')
      this.$store.dispatch('getMicronets')
    },
    mounted () {
      console.log('\n MOUNTED method ...')
      this.$store.dispatch('getMicronets')
    },
    init () {
      console.log('\n INIT method ...')
      this.$store.dispatch('getMicronets')
    }
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  @import '../style/main'
  .custom-icon {
    background-color: $theme.white !important;
    color: $theme.icon !important;
  }

  .toolbar-title {
    font-size: 20px;
    font-family: "Roboto";
  }

  .messages {
    background-color: $theme.white !important;
    color: $theme.messages !important;
    font-family: "Roboto";
    font-size: 10px;
    margin-top: 0px;
    margin-bottom: 10px;
    margin-left: 10px;
  }
  .message-list {
    margin-left: 0px;
    text-align: left;
    width: 360px;
    min-height: 30px;

  }
  .no-subnets {
    background-color: $theme.white;
    color: $theme.black
    min-height: 300px;
    text-align: center;
    font-size: 20px;
    font-weight: bold;
    margin-top: 2%;
    padding-top: 120px;
  }
  .app {
    background-color:$theme.background ;
  }
</style>
