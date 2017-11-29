<template>
  <v-card flat class="json-input-text">
    <v-card-title class="orange--text">ADD SUBNET CARD</v-card-title>
    <v-card-text>
      <v-form ref="form">
      <textarea-autosize
        placeholder="Add JSON to add subnet / device"
        ref="someName"
        v-model="someValue"
        :autosize="true"
        :min-height="650"
        :max-width="650"
        @blur.native="onBlurTextarea"
        @input.native="onInputChange">
      </textarea-autosize>
        <v-btn @click="submit">submit</v-btn>
        <v-btn @click="clear">clear</v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
  import axios from 'axios'

  export default {
    data: {
      someValue: '',
      someName: ''
    },
    methods: {
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
        if (this.$refs.form.validate()) {
          // Native form submission is not yet supported
          axios.put('/api/micronets', {
            json: inputJson
          }).then((response) => {
            console.log('\n AXIOS PUT MICRONETS RESPONSE : ' + JSON.stringify(response))
          })
        }
      },
      clear () {
        this.$refs.form.reset()
        this.$refs.someName.$el.value = ''
      }
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
</style>
