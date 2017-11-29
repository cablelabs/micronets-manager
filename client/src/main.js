// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import 'babel-polyfill'
import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.css'
import App from './App'
import router from './router'
import Vuelidate from 'vuelidate'
import store from './store'
import VueTextareaAutosize from 'vue-textarea-autosize'

Vue.use(Vuelidate)
Vue.use(Vuetify)
Vue.use(VueTextareaAutosize)
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  store,
  router,
  template: '<App/>',
  components: { App }
})
