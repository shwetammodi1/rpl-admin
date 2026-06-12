import { defineConfig } from 'vite'
import honox from 'honox/vite'
import build from '@hono/vite-build/cloudflare-workers'
import adapter from '@hono/vite-dev-server/cloudflare'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      build: {
        manifest: true,
        rollupOptions: {
          input: ['./app/client.ts', './app/style.css'],
          output: {
            entryFileNames: 'static/client.js',
            assetFileNames: 'static/assets/[name].[ext]',
          },
        },
      },
    }
  }

  return {
    plugins: [
      honox({
        client: { input: ['./app/client.ts', './app/style.css'] },
        devServer: { adapter },
      }),
      build(),
    ],
  }
})
