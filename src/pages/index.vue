<template>
  <v-content fluid>
    <v-container row grow wrap>
      <v-app id="app">
        <v-navigation-drawer
          fixed
          v-model="drawer"
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
                <template v-for="(message,index) in messages">
                  <v-divider/>
                    <div class="message-list">
                      <span class="messages">{{message.status}}</span>
                    </div>
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
          <v-btn flat icon @click.stop="drawer = !drawer">
            <img class="logo" src="../assets/console-icon.png"/>
          </v-btn>
        </v-toolbar>
          <SubnetCard></SubnetCard>
      </v-app>
    </v-container>
    <v-footer app>
      <span class="black--text">&copy; 2017 CableLabs.</span>
      <v-spacer></v-spacer>
    </v-footer>
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
      messages: [
        { status: '05/08/2017 14:45:36 Device Authenticated 192.168.1.4' },
        { status: '05/08/2017 13:45:36 Device Authenticated 192.168.1.5' },
        { status: '05/08/2017 14:45:33 Device Authenticated 192.168.1.6' }
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
    min-height:30px;
  }
  .console-divider{
    margin-left: 0px;
  }
</style>
