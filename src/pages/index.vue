<template>
  <v-content>
    <v-container fluid>
      <v-app id="inspire">
        <v-navigation-drawer
          fixed
          v-model="drawer"
          right
          app
        >
          <v-flex lg12 lg12 offset-sm0 wrap>
            <v-card>
              <v-toolbar color="white" dark>
                <v-toolbar-title class="black--text">Console</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon @click.stop="drawer = !drawer">
                  <v-icon class="custom-icon">close</v-icon>
                </v-btn>
              </v-toolbar>
              <v-list two-line>
                <template v-for="message in items">
                  <v-divider v-if="message.divider" v-bind:inset="false"></v-divider>
                  <v-list-tile avatar v-else v-bind:key="message.title" @click="">
                    <v-list-tile-content>
                      <v-list-tile-sub-title v-html="message.status" class="messages"></v-list-tile-sub-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </template>
              </v-list>
            </v-card>
          </v-flex>
        </v-navigation-drawer>
        <v-toolbar color="#3A3A3A" dark fixed app>
          <header class="text-xs-center">
            <img class="logo" src="../assets/cablelabs-logo.png" />
          </header>
          <v-toolbar-title class="toolbar-title">Micronets Manager</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
        </v-toolbar>
        <div class="grid">
          <SubnetCard></SubnetCard>
        </div>
        <v-footer app>
          <span class="grey--text">&copy; 2017 CableLabs.</span>
          <v-spacer></v-spacer>
        </v-footer>
      </v-app>
    </v-container>
  </v-content>
</template>

<script>
  import VIcon from 'vuetify/es5/components/VIcon/VIcon'
  import SubnetCard from '../components/SubnetCard.vue'
  import VBtn from 'vuetify/es5/components/VBtn/VBtn'

  export default {
    components: { VBtn, VIcon, SubnetCard },
    name: 'home',
    data: () => ({
      drawer: false,
      items: [
        {status: '<span class=\'messages\'>05/08/2017 14:45:36 Device Authenticated 192.168.1.4</span>'},
        {divider: true, inset: true},
        {status: '<span class=\'messages\'>05/08/2017 13:45:36 Device Authenticated 192.168.1.5</span>'},
        {divider: true, inset: true},
        {status: '<span class=\'messages\'>05/08/2017 14:45:33 Device Authenticated 192.168.1.6</span>'}
      ]
    }),
    props: {
      source: String
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

  .custom-icon {
    background-color: white !important;
    color: #9e9e9e !important;
  }

  .toolbar-title {
    font-size: 20px;
    font-family: "Roboto";
  }

  .messages {
    background-color: white !important;
    color: #757575 !important;
    font-family: "Roboto Mono";
    font-size: 10px;
    font-weight: bold;
  }
  .company-logo {
    background-color: black;
    margin-top: 10px;
  }
</style>
