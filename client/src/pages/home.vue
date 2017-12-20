<template>
  <Layout>
    <template v-for="(micronet, index) in micronets">
      <v-btn class="mt-4" @click.native="openAddMicronet(micronet._id)">Add Subnet</v-btn>
      <template v-for="subnet in micronet.subnets">
        <SubnetCard :subnet="subnet" :key="subnet.subnetId" :micronetId="micronet._id"></SubnetCard>
      </template>
      <hr class="mt-4" v-if="index < micronets.length - 1" />
    </template>
    <template v-if="!micronets.length">
      <v-card>
        <v-card-text class="no-subnets">No Micro-nets found </v-card-text>
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
    min-height: 300px;
    text-align: center;
    font-size: 20px;
    font-weight: bold;
    margin-top: 2%;
    padding-top: 120px;
  }
</style>
