import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import svgLoader from 'vite-svg-loader'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    vue(),
    svgLoader(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [
        ElementPlusResolver(), // Element Plus 组件自动导入
      ],
    }),
    
  ],
  server:{
    port:5120,
    proxy:{
      '/api':{
        target:'http://localhost:3000/',
        changeOrigin:true,
        rewrite:(path)=>path.replace(/^\/api/,'')
      }
    },
    open:false
  }
})
