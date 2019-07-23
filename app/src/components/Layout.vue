<template>
  <v-app light>
    <v-toolbar color="#3A3A3A" dark fixed app>
      <header class="text-xs-center">
        <router-link to="/"></router-link>
        <router-link to="/"><img class="logo" src="../assets/cablelabs-logo.png"/></router-link>
      </header>
      <v-toolbar-title class="toolbar-title">Micronets Manager</v-toolbar-title>
      <v-spacer></v-spacer>
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
      ...mapActions(['fetchMicronets'])
    },
    created () {
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
  .toolbar-title {
    font-size: 20px;
    font-family: "Roboto";
    margin-left: 32%
  }
  .message-content {
    font-family: "Roboto";
    font-size: 10px;
    font-weight: bold;
    margin-top: 5px;
    margin-bottom: 10px;
    overflow-wrap: break-word;
    word-wrap: break-word;
    display: inline-block
  }
  .message-list {
    margin-left: 0px;
    margin-top: 3px;
    text-align: left;
    width: 100%
  }
  .message-divider {
    margin-top: 5px;
  }
</style>
