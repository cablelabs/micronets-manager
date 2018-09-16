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
      <v-list v-if="subscriber.micronets.micronet.length > 0">
        <v-container
          style="max-height: max-content"
          class="scroll-y"
          id="scroll-target"
        >
          <v-layout
            column
            align-center
            justify-center
            v-scroll:#scroll-target="onScroll"
            style="height: auto"
          >
            <!--<template v-for="(message,index) in subscriber.micronets.micronet[micronetIndex].logEvents">-->
              <!--<div class="message-list">-->
                <!--<span class="message&#45;&#45;text message-content">{{ formatLogMessage(message) }}</span>-->
                <!--<v-divider v-if="index + 1 < micronets[micronetIndex].logEvents.length" :key="index" class="message-divider"/>-->
              <!--</div>-->
            <!--</template>-->
          </v-layout>
        </v-container>
      </v-list>
      <v-list v-if="subscriber.micronets.micronet.length > 0 && micronetIndex == -1">
        <v-subheader v-if="Object.keys(this.$router.currentRoute.params).length == 0">All Logs</v-subheader>
        <v-container
          style="max-height: max-content"
          class="scroll-y"
          id="scroll-target"
        >
          <v-layout
            column
            align-center
            justify-center
            v-scroll:#scroll-target="onScroll"
            style="height: auto"
          >
            <template v-for="(micronet, index) in subscriber.micronets.micronet">
              <template v-for="(message,msgIndex) in micronet.logEvents">
                <div class="message-list">
                  <span class="message--text message-content">{{ formatLogMessage(message) }}</span>
                  <v-divider v-if="msgIndex + 1 < micronet.logEvents.length" class="message-divider"/>
                  <v-spacer></v-spacer>
                </div>
              </template>
            </template>
          </v-layout>
        </v-container>
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
        <slot/>
      </v-container>
    </v-content>
    <v-footer app>
      <span class="black--text">&copy; 2018 CableLabs.</span>
      <v-spacer></v-spacer>
    </v-footer>
  </v-app>
</template>

<script>
  import { mapState, mapActions } from 'vuex'
  import Moment from 'moment'
  import { propEq, findIndex } from 'ramda'

  export default {
    name: 'Layout',
    computed: {
      ...mapState(['subscriber']),
      micronetIndex () {
        const micronetIndex = findIndex(propEq('_id', this.$route.params.id))(this.subscriber)
        console.log('\n micronetIndex : ' + JSON.stringify(micronetIndex))
        return micronetIndex
      }
    },
    data: () => ({
      drawer: false,
      offsetTop: 0
    }),
    methods: {
      ...mapActions(['fetchMicronets']),
      formatLogMessage (log) {
        if (log.indexOf(':') > -1) {
          var utcLogDateTimeStamp = log.split(':')[0]
          return Moment(utcLogDateTimeStamp).format('lll').concat(' ').concat(log.split(':')[1])
        } else {
          return Moment(new Date()).format('lll').concat(' : ').concat(log)
        }
      },
      onScroll (e) {
        this.offsetTop = e.target.scrollTop
      }
    },
    created () {
      return this.fetchMicronets()
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  .toolbar-title {
    font-size: 20px;
    font-family: "Roboto";
  }
  .message-content {
    font-family: "Roboto";
    font-size: 10px;
    font-weight: bold;
    margin-top: 5px;
    margin-bottom 10px;
    overflow-wrap: break-word;
    word-wrap: break-word;
    display inline-block
  }
  .message-list {
    margin-left: 0px;
    margin-top: 3px
    text-align: left;
    width: 100%
  }
  .message-divider {
    margin-top: 5px;
  }
</style>
