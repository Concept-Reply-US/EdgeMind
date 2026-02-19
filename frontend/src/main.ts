import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Chart, registerables } from 'chart.js'
import App from './App.vue'
import router from './router'
import './assets/variables.css'
import './assets/base.css'
import './assets/animations.css'
import './assets/responsive.css'

Chart.register(...registerables)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
