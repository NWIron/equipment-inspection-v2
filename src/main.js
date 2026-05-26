import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAccessStore } from './stores/access'
import './styles.css'

const pinia = createPinia()
const accessStore = useAccessStore(pinia)

await accessStore.initialize()

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')
