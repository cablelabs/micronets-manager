<template>
  <v-app id="subnet-card">
    <v-layout row wrap>
      <v-flex lg12>
        <v-card class="subnet-card">
          <v-card-media
            src="https://vuetifyjs.com/static/doc-images/cards/sunshine.jpg"
            height="00px"
          >
          </v-card-media>
          <v-card-title primary-title>
            <div>
              <div class="headline">Personal</div>
              <span class="grey--text">3 Devices</span>
            </div>
            <v-spacer></v-spacer>
            <v-card-actions>
              <v-btn icon @click.native="show = !show">
                <v-icon>{{ show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card-title>
          <v-slide-y-transition>
            <v-card-text v-show="show">
              I'm a thing. But, like most politicians, he promised more than he could deliver. You won't have time for sleeping, soldier, not with all the bed making you'll be doing. Then we'll go with that data file! Hey, you add a one and two zeros to that or we walk! You're going to do his laundry? I've got to find a way to escape.
              soldier, not with all the bed making you'll be doing. Then we'll go with that data file! Hey, you add a one and two zeros to that or we walk! You're going to do his laundry? I've got to find a way to escape.
            </v-card-text>
          </v-slide-y-transition>
        </v-card>
      </v-flex>
    </v-layout>
  </v-app>
</template>

<script>
  export default {
    name: 'SubnetCard',
    data () {
      return {
        show: false
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  h1, h2 {
    font-weight: normal;
  }
  ul {
    list-style-type: none;
    padding: 0;
  }
  li {
    display: inline-block;
    margin: 0 10px;
  }
  a {
    color: #42b983;
  }
  .subnet-card {
    width: 88em;
  }
</style>
