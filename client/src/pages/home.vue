<template>
  <Layout>
    <template v-for="(micronet, index) in micronets">
      <v-btn class="mt-4 primary" @click.native="openAddMicronet(micronet._id)">Add Subnet</v-btn>
      <template v-for="subnet in micronet.subnets">
        <SubnetCard :subnet="subnet" :key="subnet.subnetId" :micronetId="micronet._id"></SubnetCard>
      </template>
      <hr class="mt-4" v-if="index < micronets.length - 1" />
    </template>
    <template v-if="!micronets.length">
      <v-card>
        <v-card-title class="no-subnets">No Micro-nets found</v-card-title>
        <v-card-actions>
          <v-btn class="primary mt-4 configure-micronet" to="/configure-micronet">Add Subnet</v-btn>
        </v-card-actions>
      </v-card>
    </template>
    <v-dialog :value="!!editTarget" @input="setEditTargetIds({})" max-width="500px">
      <AddSubnetForm v-if="editTarget ":data="editTarget" @submit="addSubnet" />
    </v-dialog>
  </Layout>
</template>

<script>
  import SubnetCard from '../components/SubnetCard'
  import Layout from '../components/Layout'
  import AddSubnetForm from '../components/AddSubnetForm'
  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex'

  export default {
    components: { SubnetCard, Layout, AddSubnetForm },
    name: 'home',
    computed: {
      ...mapState(['micronets']),
      ...mapGetters(['editTarget'])
    },
    data: () => ({
      drawer: false
    }),
    methods: {
      ...mapMutations(['setEditTargetIds']),
      ...mapActions(['fetchMicronets', 'addSubnet']),
      openAddMicronet (micronetId) {
        this.setEditTargetIds({ micronetId })
      }
    },
    created () {
      this.setEditTargetIds({})
      return this.fetchMicronets()
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
</style>
