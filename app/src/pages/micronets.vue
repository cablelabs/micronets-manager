<template>
  <Layout>
    <template v-for="(micronet, index) in subscriber.micronets">
      <template v-if="micronet['micronet-id']==$route.params.micronetId">
      <!--<template v-for="subnet in micronet.subnets">-->
        <!--<p>Device Leases from State : {{deviceLeases || []}}</p>-->
        <SubnetCard :subnet="micronet" :micronetId="micronet['micronet-id']" :subscriberId="subscriber.id" ></SubnetCard>
      </template>
      <!--</template>-->
    </template>
    <template v-if="subscriber.micronets.length  == 0">
      <p>No micronet found</p>
      <v-card>
        <v-card-title class="no-subnets">No Micronets found</v-card-title>
      </v-card>
    </template>
  </Layout>
</template>

<script>
  import SubnetCard from '../components/SubnetCard'
  import Layout from '../components/Layout'
  import AddSubnetForm from '../components/AddSubnetForm'
  import { mapState, mapActions, mapMutations } from 'vuex'
  export default {
    components: { SubnetCard, Layout, AddSubnetForm },
    name: 'micronets',
    computed: {
      ...mapState(['subscriber', 'deviceLeases', 'users', 'subscriberId'])
    },
    data: () => ({
      dialog: false,
      drawer: false
    }),
    methods: {
      ...mapMutations(['setEditTargetIds']),
      ...mapActions(['fetchMicronets', 'fetchSubscribers', 'fetchUsers']),
      openAddMicronet (micronetId) {
        this.dialog = true
        this.setEditTargetIds({ micronetId })
      },
      close (data) {
        this.dialog = data
      }
    },
    mounted () {
      this.fetchMicronets(this.$router.currentRoute.params.id).then(() => {
        console.log('\n Subscriber from state: ' + JSON.stringify(this.subscriber))
      })

      this.fetchUsers().then(() => {
        console.log('\n DeviceLeases from state : ' + JSON.stringify(this.deviceLeases))
      })
    },
    created () {}
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  .no-subnets {
    font-size: 20px;
    font-weight: bold;
    margin-top: 2%;
    margin-left 40%
    margin-right 40%
    padding-top: 120px;
  }
  .configure-micronet {
    margin-left 43%
    margin-right 40%
    margin-bottom : 5%
  }
  .add-subnet-form {
    background-color white!important
    min-width 100%
  }
  .close-btn {
    background-color white!important
    margin-left 90%
  }
</style>
