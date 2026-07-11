import { defineConfig } from 'vite'
import honox from 'honox/vite'
import build from '@hono/vite-build/cloudflare-pages'
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
        // Wrap the adapter so getPlatformProxy runs with remote bindings enabled,
        // proxying the DB (D1) binding to the real production database.
        devServer: {
          adapter: () => adapter({ proxy: { experimental: { remoteBindings: true } } }),
        },
      }),
      build(),
    ],
  }
})
