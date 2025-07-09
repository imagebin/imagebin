import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

import viteImagemin from '@vheemstra/vite-plugin-imagemin'
import oxipng from '@imagebin/oxipng'
// import imageminMozjpeg from 'imagemin-mozjpeg'
// import imageminWebp from 'imagemin-webp'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    assetsInlineLimit: 0
  },
  plugins: [
    tailwindcss(),
    react(),
    viteImagemin({
      cache: false,
      onlyAssets: true,
      plugins: {
        png: oxipng(),
      },
      // makeWebp: {
      //   plugins: {
      //     jpg: imageminWebp(),
      //   },
      // },
    }),
  ],
})
