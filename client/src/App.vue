<template>
  <router-view></router-view>
</template>
<script>
  export default {
    name: 'app',
    data () {
      return {
        fixed: false
      }
    }
  }
</script>

<style lang="stylus">
  @import './style/main.styl'
</style>
