import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/pages'
import AddSubnet from '../components/AddSubnet'
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/',
      name: 'AddSubnet',
      component: AddSubnet
    }
  ]
})
