import Vue from 'vue'
import Vuex from 'vuex'
import storeSpec from './main'

Vue.use(Vuex)

const store = new Vuex.Store(storeSpec)

export default store
