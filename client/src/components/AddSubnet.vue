<template>
  <v-container row wrap>
    <v-card flat class="json-input-text">
      <p>{{micronet}}</p>
      <v-card-title class="orange--text card-title"> ADD SUBNETS / DEVICES </v-card-title>
      <v-card-text>
        <v-form ref="form">
          <textarea-autosize class="input-textarea"
            placeholder="Add JSON to add subnet / device"
            ref="someName"
            v-model="someValue"
            :autosize="true"
            :min-width="800"
            :min-height="800"
            @blur.native="onBlurTextarea"
            @input.native="onInputChange">
          </textarea-autosize>
          <div class="input-btns">
          <v-btn @click="submit">submit</v-btn>
          <v-btn @click="clear">clear</v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
  import { mapState, mapActions } from 'vuex'

  export default {
    data: {
      someValue: '',
      someName: ''
    },
    computed: {
      ...mapState(['micronet'])
    },
    methods: {
      ...mapActions(['fetchMicronets', 'updateMicronets']),
      onInputChange () {
        console.log('\n onInputChange called')
        const jsonValue = this.$refs.someName.$el.value
        console.log('\n JSON VALUE onInputChange : ' + JSON.stringify(jsonValue))
        // console.log('\n V-MODEL someValue onInputChange  : ' + JSON.stringify(this.someValue))
      },
      onBlurTextarea () {
        console.log('\n onBlurTextarea called')
      },
      submit () {
        console.log('\n SUBMIT this.$refs.someName.$el.value : ' + JSON.stringify(this.$refs.someName.$el.value))
        const inputJson = this.$refs.someName.$el.value
        console.log('\n SUBMIT inputJson : ' + JSON.stringify(inputJson))
        this.updateMicronets({id: this.micronet._id, data: inputJson})
        // if (this.$refs.form.validate()) {
          // Native form submission is not yet supported
          // axios.put(`/api/micronets/${this.micronet._id}`, {
          //   json: inputJson
          // }).then((response) => {
          //   console.log('\n AXIOS PUT MICRONETS RESPONSE : ' + JSON.stringify(response))
          // })
        // }
      },
      clear () {
        this.$refs.form.reset()
        this.$refs.someName.$el.value = ''
      }
    },
    mounted () {
      console.log('\n MOUNTED ADD SUBNET')
      return this.fetchMicronets()
    }
  }
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="stylus" scoped>
  @import '../style/main'
  .json-input-text {
    background-color: white;
    margin-left: 5%;
    margin-right: 5%;
    margin-top: 5%;
    padding-left: 5%;
    padding-right: 5%;
    min-width: 100%;
    min-height: 50%;
  }
  .card-title {
    margin-left: 25%
    text-align: center
    font-weight: bold
    font-size: 20px
    color: darkred !important;
  }
  .input-textarea {
    width: 80%
    height:50%
  }
  .input-btns {
    display: block
    margin-top: 1%
    margin-left:30%
  }
</style>
