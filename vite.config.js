import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = path.dirname(fileURLToPath(import.meta.url))

// Dev-only endpoint: the browser POSTs a binary GLB here and it lands in exports/.
const exportEndpoint = () => ({
  name: 'export-endpoint',
  configureServer(server) {
    server.middlewares.use('/__export', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405
        return res.end('method not allowed')
      }
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        const buf = Buffer.concat(chunks)
        const dir = path.join(projectDir, 'exports')
        fs.mkdirSync(dir, { recursive: true })
        const file = path.join(dir, 'carton.glb')
        fs.writeFileSync(file, buf)
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: true, file, bytes: buf.length }))
      })
    })
  },
})

export default defineConfig({
  // BASE_PATH is set by the GitHub Pages workflow (/pull-a-fry/)
  base: process.env.BASE_PATH || '/',
  plugins: [react(), exportEndpoint()],
  server: { port: 5183, strictPort: true },
})
