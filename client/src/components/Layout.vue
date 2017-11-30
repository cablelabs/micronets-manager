<template>
  <div>
        <v-navigation-drawer
          fixed
          v-model="drawer"
          disable-resize-watcher
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
              <v-list v-if="micronet.length > 0">
                <template v-for="(message,index) in micronet[0].logEvents">
                  <div class="message-list">
                    <span class="messages" >{{ formatLogMessage(message) }}</span>
                    <v-divider v-if="index + 1 < micronet[0].logEvents.length" :key="index" class="message-divider"/>
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
  </div>
</template>
<script>
  import { mapState, mapActions } from 'vuex'
  import Moment from 'moment'
  export default {
    name: 'Layout',
    computed: {
      ...mapState(['micronet'])
    },
    data: () => ({
      drawer: false
    }),
    methods: {
      ...mapActions(['fetchMicronets']),
      mounted () {
        console.log('\n MOUNTED')
        // return this.$store.dispatch('fetchMicronets')
        return this.fetchMicronets()
      },
      formatLogMessage (log) {
        // console.log('\n log : ' + JSON.stringify(log))
        if (log.indexOf(':') > -1) {
          var utcLogDateTimeStamp = log.split(':')[0]
          return Moment(utcLogDateTimeStamp).format('lll').concat(' ').concat(log.split(':')[1])
        } else {
          return Moment(new Date()).format('lll').concat(' : ').concat(log)
        }
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus">
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
    font-weight: bold;
    margin-top: 5px;
    margin-bottom: 5px;
    margin-left: 10px;
    overflow-wrap: break-word;
    word-wrap: break-word;
    display inline-block
  }
  .message-list {
    margin-left: 0px;
    text-align: left;
    width: 100%
    min-height: 35px;

  }
  .message-divider {
    margin-top: 10px;
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
