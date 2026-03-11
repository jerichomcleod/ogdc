import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'node',
  },
  base: '/ogdc/',
  // Serve assets/ at URL root: /stone_1.png, /floor_1.png, etc.
  publicDir: 'assets',
  server: {
    port: 5173,
    // Explicitly override the MIME type for .ts files.
    // macOS registers .ts as video/mp2t (MPEG-2 Transport Stream video);
    // this forces the correct type so the browser accepts the module script.
    headers: {},
  },
  plugins: [
    {
      name: 'ts-mime-fix',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && /\.ts($|\?)/.test(req.url)) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          }
          next()
        })
      },
    },
  ],
})
