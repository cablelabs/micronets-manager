<template>
  <Layout>
    <template v-for="(micronet, index) in micronets">
         <Subscriber :subscriberId=micronet.id  :subscriberName="micronet.name" :ssId="micronet.ssid" :devices=micronet.devices :index=index :id="micronet._id"/>
    </template>
    <template v-if="!micronets.length">
      <v-card>
        <v-card-title class="no-subnets">No Micro-nets found</v-card-title>
        <v-card-actions>
          <v-btn class="primary mt-4 configure-micronet" to="/configure-micronet">Add Subnet</v-btn>
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
      ...mapState(['micronets']),
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
      ...mapActions(['fetchMicronets', 'addSubnet', 'fetchSubscribers', 'upsertSubscribers']),
      openAddMicronet (micronetId) {
        this.dialog = true
        this.setEditTargetIds({ micronetId })
      },
      close (data) {
        this.dialog = data
      }
    },
    mounted () {
      this.setEditTargetIds({})
      this.fetchSubscribers().then(({data}) => {})
      this.$socket.on('socketSessionUpdate', (data) => {
        console.log('\n Vue socket binding npm event socketSessionUpdate caught with data ' + JSON.stringify(data))
        this.upsertSubscribers(data)
      })
      this.$socket.on('socketSessionCreate', (data) => {
        console.log('\n Vue socket binding npm event socketSessionCreate caught with data ' + JSON.stringify(data))
        this.upsertSubscribers(data)
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
