import Vue from 'vue'
import Vuex from 'vuex'
import storeSpec from './view'

Vue.use(Vuex)
const store = new Vuex.Store(storeSpec)
export default store
