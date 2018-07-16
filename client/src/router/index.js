import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/pages/home'
import ConfigureMicronet from '@/pages/configure-micronet'
import Micronets from '@/pages/micronets'
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/:subscriberId/micronets/:id',
      name: 'Micronets',
      component: Micronets
    },
    {
      path: '/configure-micronet/:micronetId/subnet/:subnetId',
      name: 'ConfigureMicronet',
      component: ConfigureMicronet
    }
  ]
})
