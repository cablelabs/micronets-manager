<template>
  <Layout>
    <h2 class="text-xs-center orange--text title">ADD SUBNETS / DEVICES</h2>
    <v-form class="text-xs-center">
      <textarea-autosize
        class="input-textarea"
        placeholder="JSON to add subnet / device"
        ref="textAreaInput"
        v-model="textAreaInput"
        :autosize="true"
        :min-width="800"
        :min-height="600"
        @blur.native="onBlurTextarea"
        @input.native="onInputChange">
      </textarea-autosize>
      <div class="text-xs-center mt-3">
        <v-btn @click="submit(micronets[0]._id)">submit</v-btn>
        <v-btn class="ml-3" @click="clear">clear</v-btn>
      </div>
    </v-form>
  </Layout>
</template>

<script>
  import { mapState, mapActions } from 'vuex'
  import Layout from '@/components/Layout.vue'

  export default {
    components: {Layout},
    name: 'AddSubnet',
    data: () => ({
      textAreaInput: '',
      saving: false
    }),
    computed: {
      ...mapState(['micronets'])
    },
    methods: {
      ...mapActions(['fetchMicronets', 'upsertMicronet']),
      onInputChange () {},
      onBlurTextarea () {},
      submit (micronetId) {
        this.saving = true
        return this.upsertMicronet({ id: micronetId, data: this.textAreaInput })
          .then(() => { this.saving = false })
      },
      clear () {
        this.textAreaInput = ''
      }
    },
    mounted () {
      return this.fetchMicronets()
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
    max-width: 1000px;
    min-height: 50%;
    border: 2px solid #dadada;
    border-radius: 7px;
    margin: 32px auto;
    padding: 16px;
  }
</style>
