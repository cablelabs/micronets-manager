import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/pages/home'
import AddSubnet from '@/pages/add-subnet'
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/add/subnet',
      name: 'AddSubnet',
      component: AddSubnet
    }
  ]
})
