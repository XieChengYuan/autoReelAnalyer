import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    port: 5174, // 你想要使用的端口号
    host: '0.0.0.0',
    proxy: {
      // 如果需要代理配置，可以在这里添加
    }
  }
}) 