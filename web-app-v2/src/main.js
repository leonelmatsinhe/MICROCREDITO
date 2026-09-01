import { createApp } from 'vue'
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import router from './router'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './assets/styles/app.scss'

import App from './App.vue'

const app = createApp(App)

// Pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Router
app.use(router)

// Quasar
app.use(Quasar, {
  plugins: {
    Notify,
    Dialog,
    Loading
  },
  config: {
    brand: {
      primary: '#0D7C3D',
      secondary: '#1E40AF',
      accent: '#0891B2',
      dark: '#1F2937',
      positive: '#059669',
      negative: '#DC2626',
      info: '#0891B2',
      warning: '#D97706'
    },
    dark: false,
    notify: {
      position: 'top-right',
      timeout: 3000,
      actions: [{ icon: 'close', color: 'white' }]
    }
  }
})

app.mount('#q-app')
