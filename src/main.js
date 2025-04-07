import { createApp } from 'vue'
import '@/assets/reset.css'
import './style.css'
import router from './router'
import App from './App.vue'



const app = createApp(App)
// 使用路由
app.use(router)
app.mount('#app')

