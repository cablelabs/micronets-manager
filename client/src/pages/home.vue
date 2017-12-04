<template>
  <Layout>
    <template v-if="micronets.length > 0" v-for="(item,index) in micronets">
      <template v-for="(subnetItem,subIndex) in item.subnets">
        <SubnetCard :subnet="subnetItem" :key="subIndex"></SubnetCard>
      </template>
    </template>
    <template v-if="micronets.length == 0">
      <v-card>
        <v-card-text class="no-subnets">No Micro-nets found </v-card-text>
      </v-card>
    </template>
  </Layout>
</template>

<script>
  import SubnetCard from '../components/SubnetCard.vue'
  import Layout from '../components/Layout.vue'
  import { mapState, mapActions } from 'vuex'

  export default {
    components: { SubnetCard, Layout },
    name: 'home',
    computed: {
      ...mapState(['micronets'])
    },
    data: () => ({
      drawer: false
    }),
    methods: {
      ...mapActions(['fetchMicronets'])
    },
    created () {
      return this.fetchMicronets()
    }
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  .no-subnets {
    min-height: 300px;
    text-align: center;
    font-size: 20px;
    font-weight: bold;
    margin-top: 2%;
    padding-top: 120px;
  }
</style>
