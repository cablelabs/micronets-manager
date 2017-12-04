<template>
  <v-app light>
    <v-navigation-drawer
      fixed
      v-model="drawer"
      disable-resize-watcher
      right
      app
    >
      <v-toolbar color="white" dark>
        <v-toolbar-title class="black--text">Console</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click.stop="drawer = !drawer">
          <v-icon class="grey--text">close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-list v-if="micronets.length > 0">
        <template v-for="(message,index) in micronets[0].logEvents">
          <div class="message-list">
            <span class="message--text message-content" >{{ formatLogMessage(message) }}</span>
            <v-divider v-if="index + 1 < micronets[0].logEvents.length" :key="index" class="message-divider"/>
          </div>
        </template>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar color="#3A3A3A" dark fixed app>
      <header class="text-xs-center">
        <router-link to="/"><img class="logo" src="../assets/cablelabs-logo.png"/></router-link>
      </header>
      <v-toolbar-title class="toolbar-title">Micronets Manager</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn flat icon @click.stop="drawer = !drawer">
        <img class="logo" src="../assets/console-logo.png"/>
      </v-btn>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <slot />
      </v-container>
    </v-content>
    <v-footer app>
      <span class="black--text">&copy; 2017 CableLabs.</span>
      <v-spacer></v-spacer>
    </v-footer>
  </v-app>
</template>

<script>
  import { mapState, mapActions } from 'vuex'
  import Moment from 'moment'
  export default {
    name: 'Layout',
    computed: {
      ...mapState(['micronets'])
    },
    data: () => ({
      drawer: false
    }),
    methods: {
      ...mapActions(['fetchMicronets']),
      mounted () {
        return this.fetchMicronets()
      },
      formatLogMessage (log) {
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
  .toolbar-title {
    font-size: 20px;
    font-family: "Roboto";
  }

  .message-content {
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
</style>
