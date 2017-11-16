<template>
  <v-app light>
    <v-content>
      <v-container fluid>
        <v-slide-y-transition mode="out-in">
          <v-layout column align-center>
            <blockquote>
              Micronets Manager
              <footer>
              </footer>
            </blockquote>
          </v-layout>
        </v-slide-y-transition>
      </v-container>
    </v-content>
    <v-footer :fixed="fixed" app>
      <span>&copy; 2017</span>
    </v-footer>
  </v-app>
</template>

<script>
  export default {
    data () {
      return {
        fixed: false
      }
    }
  }

</script>
