<template>
  <v-layout>
    <v-flex>
      <v-card class="space">
        <v-container fluid grid-list-md>
          <v-layout row wrap>
            <v-flex xs12 md6>
            <v-card-title primary-title>
              <div>
                <h3 class="headline mb-0">{{this.subscriberName}}</h3>
                <h2 class="headline mb-0">{{this.subscriberId}}</h2>
              </div>
            </v-card-title>
            <v-card-actions>
              <v-btn flat color="orange" @click.native.stop=showMicronets>Show Micro-nets</v-btn>
            </v-card-actions>
            </v-flex>
          </v-layout>
        </v-container>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
  import Layout from '../components/Layout'

  export default {
    name: 'Subscriber',
    components: {Layout},
    data () {
      return {}
    },
    methods: {
      showMicronets () {
        this.$router.push(`${this.subscriberId}/micronets/${this.id}`)
      }
    },
    props: {
      subscriberId: String,
      subscriberName: String,
      devices: Array,
      id: String
    }
  }
</script>

<style scoped>
  .space {
    margin-bottom: 50px;
  }
</style>
