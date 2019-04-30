import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/pages/home'
import Micronets from '@/pages/micronets'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/users/:id',
      name: 'Home',
      component: Home
    },
    {
      path: '/:subscriberId/micronets/:micronetId',
      name: 'Micronets',
      component: Micronets
    }
  ]
})
