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
Vue.config.productionTip = false
Vue.use(Vuelidate)
Vue.use(Vuetify, {
  theme: {
    primary: '#264A5B',
    accent: '#EB5646',
    secondary: '#EB5646',
    primaryDark: '#002232',
    background: '#fafafa',
    white: '#FFFFFF',
    black: '#000000',
    message: '#757575',
    warning: '#ffa000',
    error: '#d50000',
    success: '#81c784'
  }
})

/* eslint-disable no-new */
new Vue({
  Vuetify,
  el: '#app',
  store,
  router,
  template: '<App/>',
  components: { App }
})
