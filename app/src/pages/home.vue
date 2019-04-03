<template>
  <Layout>
    <template v-for="(micronet, index) in subscriber.micronets">
        <SubnetCard :subnet="micronet" :key="micronet['micronet-id']" :subscriberId="subscriber.id" ></SubnetCard>
    </template>
    <template v-if="subscriber.micronets.length == 0">
      <v-card>
        <v-card-title class="no-subnets">No Micronets found</v-card-title>
        <v-card-actions>
          <!--<v-btn class="primary mt-4 configure-micronet" to="/configure-micronet">Add Subnet</v-btn>-->
        </v-card-actions>
      </v-card>
    </template>
  </Layout>
</template>

<script>
  import SubnetCard from '../components/SubnetCard'
  import Layout from '../components/Layout'
  import AddSubnetForm from '../components/AddSubnetForm'
  import Subscriber from '../components/Subscriber'
  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex'

  export default {
    components: { SubnetCard, Layout, AddSubnetForm, Subscriber },
    name: 'home',
    computed: {
      ...mapState(['subscriber', 'deviceLeases', 'users']),
      ...mapGetters(['editTarget'])
    },
    data: () => ({
      dialog: false,
      drawer: false,
      isConnected: false,
      socketMessage: ''
    }),
    sockets: {
      connect () {
        // Fired when the socket connects.
        this.isConnected = true
      },
      disconnect () {
        this.isConnected = false
      },
      // Fired when the server sends something on the "messageChannel" channel.
      messageChannel (data) {
        this.socketMessage = data
      }
    },
    methods: {
      ...mapMutations(['setEditTargetIds']),
      ...mapActions(['fetchMicronets', 'upsertDeviceLeases', 'fetchUsers'])
    },
    mounted () {
      const subscriberId = '7B2A-BE88-08817Z'
      console.log('\n Home page mounted  : ' + JSON.stringify(window.location.href))
      this.fetchMicronets(subscriberId).then(() => {
        console.log('\n   Subscriber : ' + JSON.stringify(this.subscriber))
        console.log('\n DeviceLeases : ' + JSON.stringify(this.deviceLeases))
      })
      this.fetchUsers().then(() => {
        console.log('\n Users : ' + JSON.stringify(this.users))
      })
    },
    created () {
      const subscriberId = '7B2A-BE88-08817Z'
      this.fetchMicronets(subscriberId).then(() => {
        console.log('\n  Subscriber : ' + JSON.stringify(this.subscriber))
      })
      this.fetchUsers().then(() => {
        console.log('\n Users : ' + JSON.stringify(this.users))
      })
    }
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
