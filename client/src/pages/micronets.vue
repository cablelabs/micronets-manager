<template>
  <Layout>
    <template v-for="(micronet, index) in micronets">
      <template v-if="micronet.id==$route.params.subscriberId">
      <v-btn class="mt-4" @click.native="openAddMicronet(micronet._id)">Add Subnet</v-btn>
      <template v-for="subnet in micronet.subnets">
        <p>Leases from State : {{leases || []}}</p>
        <p>Device Leases from State : {{deviceLeases || []}}</p>
        <SubnetCard :subnet="subnet" :key="subnet.subnetId" :micronetId="micronet._id" ></SubnetCard>
      </template>
      <!--<hr class="mt-4" v-if="index < micronets.length - 1"/>-->
      </template>
    </template>
    <template v-if="!micronets.length">
      <v-card>
        <v-card-title class="no-subnets">No Micro-nets found</v-card-title>
        <!--<v-card-actions>-->
          <!--<v-btn class="primary mt-4 configure-micronet" to="/configure-micronet">Add Subnet</v-btn>-->
        <!--</v-card-actions>-->
      </v-card>
    </template>
    <v-dialog :value="!!editTarget" @input="setEditTargetIds({})" max-width="500px" v-model="dialog"
              transition="dialog-bottom-transition"
              scrollable>
      <AddSubnetForm v-if="editTarget " :data="editTarget" @submit="addSubnet" :parentDialog="dialog" @close="close" :micronets="this.micronets"/>
    </v-dialog>
  </Layout>
</template>

<script>
  import SubnetCard from '../components/SubnetCard'
  import Layout from '../components/Layout'
  import AddSubnetForm from '../components/AddSubnetForm'
  import io from 'socket.io-client';
  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex'
  const socket = io(`${process.env.DHCP_SOCKET_URL}`)
  export default {
    components: { SubnetCard, Layout, AddSubnetForm },
    name: 'micronets',
    computed: {
      ...mapState(['micronets', 'leases', 'deviceLeases']),
      ...mapGetters(['editTarget'])
    },
    data: () => ({
      dialog: false,
      drawer: false
    }),
    methods: {
      ...mapMutations(['setEditTargetIds']),
      ...mapActions(['fetchMicronets', 'addSubnet', 'fetchSubscribers', 'upsertLeases', 'upsertDeviceLeases']),
      openAddMicronet (micronetId) {
        this.dialog = true
        this.setEditTargetIds({ micronetId })
      },
      close (data) {
        this.dialog = data
      }
    },
    mounted () {
      console.log('\n Micronets.vue created state : ' + JSON.stringify(this.micronets))
    },
    created () {
      this.setEditTargetIds({})
      socket.on('leaseAcquired', (data) => {
        console.log('\n\n Micronets.vue created method leaseAquired event caught . Data received :  ' + JSON.stringify(data))
        this.upsertDeviceLeases({type:data.type, data:data.data, event:'upsert'})
      })
      socket.on('leaseExpired', (data) => {
        console.log('\n\n Micronets.vue created method leaseExpired event caught . Data received :  ' + JSON.stringify(data))
        this.upsertDeviceLeases({type:data.type, data:data.data, event:'upsert'})

      })
      console.log('\n Micronets.vue created called ... ')
      this.$on('pageReload', () => {
        console.log('\n pageReload event created Micronets page')
        console.log('\n this.$router.currentRoute.params.id : ' + JSON.stringify(this.$router.currentRoute.params.id))
        this.$router.currentRoute.params.id ? this.fetchMicronets(this.$router.currentRoute.params.id) : ''
      })
      return this.fetchMicronets(this.$router.currentRoute.params.id)
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
