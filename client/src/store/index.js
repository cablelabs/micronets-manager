import Vue from 'vue'
import Vuex from 'vuex'
import storeSpec from './main'
import createPersistedState from "vuex-persistedstate";
Vue.use(Vuex)
 const store = new Vuex.Store(storeSpec)
// const store = new Vuex.Store({
//   storeSpec: storeSpec,
//   plugins: [
//     createPersistedState({ paths: ['deviceLeases']})
//   ]
// });
export default store
