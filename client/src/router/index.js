import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/pages/home'
import ConfigureMicronet from '@/pages/configure-micronet'
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/configure-micronet',
      name: 'ConfigureMicronet',
      component: ConfigureMicronet
    }
  ]
})
