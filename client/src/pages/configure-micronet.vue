<template>
  <Layout>
    <h2 class="text-xs-center orange--text title">Configure {{editTargetIds.deviceId ? 'Device' : 'Subnet'}}</h2>
    <h3 class="text-xs-center caption grey--text">
      Micronet: {{editTargetIds.micronetId}}<br/>
      Subnet: {{editTargetIds.subnetId}}<br/>
      {{editTargetIds.deviceId ? `Device: ${editTargetIds.deviceId}` : ''}}
    </h3>
    <v-form class="text-xs-center">
      <v-text-field class="input-textarea" v-model="textAreaInput" auto-grow multi-line rows="10" light textarea/>
      <div class="text-xs-center mt-3">
        <v-btn @click="reset">reset</v-btn>
        <v-btn class="ml-4 mr-4 primary " @click="submit">save</v-btn>
        <v-btn to="/">done</v-btn>
      </div>
    </v-form>
  </Layout>
</template>

<script>
  import { mapState, mapGetters, mapActions } from 'vuex'
  import Layout from '@/components/Layout.vue'

  export default {
    components: {Layout},
    name: 'AddSubnet',
    data: () => ({
      textAreaInput: '',
      saving: false
    }),
    computed: {
      ...mapState(['editTargetIds']),
      ...mapGetters(['editTarget'])
    },
    methods: {
      ...mapActions(['saveMicronet']),
      onInputChange () {},
      onBlurTextarea () {},
      submit () {
        this.saving = true
        return this.saveMicronet(JSON.parse(this.textAreaInput))
          .then(() => { this.saving = false })
      },
      reset () {
        this.textAreaInput = JSON.stringify(this.editTarget, null, 4)
      }
    },
    created () {
      this.reset()
    }
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  .title {
    font-weight: bold
    font-size: 20px
    color: darkred !important;
  }
  .input-textarea {
    width: 95%;
    margin: 32px auto;
    padding: 16px;
  }
</style>
