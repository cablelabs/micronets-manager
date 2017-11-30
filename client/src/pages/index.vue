<template>
  <v-content fluid class="app">
    <v-container row grow wrap >
      <v-app id="app" >
        <Layout></Layout>
        <!--<div>-->
          <!--<p><strong> MICRONET : </strong>{{micronet}}</p>-->
        <!--</div>-->
        <template v-if="micronet.length > 0" v-for="(item,index) in micronet">
          <template v-for="(subnetItem,subIndex) in item.subnets">
            <SubnetCard :subnet="subnetItem" :key="subIndex"></SubnetCard>
          </template>
        </template>
        <template v-if="micronet.length == 0">
          <v-card>
            <v-card-text class="no-subnets">No Micro-nets found </v-card-text>
          </v-card>
        </template>
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
  import Layout from '../components/Layout.vue'
  import { mapState, mapActions } from 'vuex'

  export default {
    components: { SubnetCard, Layout },
    name: 'home',
    computed: {
      // ...mapGetters(['micronet']),
      // ...mapState({micronet: x => x.micronet})
      ...mapState(['micronet'])
    },
    data: () => ({
      drawer: false,
      eItems: {
        subnets: []
      }
    }),
    methods: {
      ...mapActions(['fetchMicronets'])
    },
    mounted () {
      return this.fetchMicronets()
    }
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  @import '../style/main'
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
