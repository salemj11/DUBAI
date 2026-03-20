import process from 'node:process'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handlePlaceDetailsRequest } from './server/placeDetailsApi.js'

function placeDetailsApiPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  const maxBodyBytes = 16 * 1024

  return {
    name: 'place-details-api',
    configureServer(server) {
      server.middlewares.use('/api/place-details', async (request, response, next) => {
        if (request.method !== 'POST') {
          next()
          return
        }

        let rawBody = ''
        let tooLarge = false

        request.on('data', (chunk) => {
          if (tooLarge) {
            return
          }

          rawBody += chunk

          if (rawBody.length > maxBodyBytes) {
            tooLarge = true
            response.statusCode = 413
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({
              error: 'Request body is too large.',
            }))
          }
        })

        request.on('end', async () => {
          if (tooLarge) {
            return
          }

          let payload = {}

          try {
            payload = rawBody ? JSON.parse(rawBody) : {}
          } catch {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({
              error: 'Invalid JSON body.',
            }))
            return
          }

          await handlePlaceDetailsRequest(
            { method: request.method, headers: request.headers, body: payload, socket: request.socket },
            response,
            {
              apiKey: env.GOOGLE_PLACES_API_KEY,
              allowedReferer: env.GOOGLE_PLACES_ALLOWED_REFERER,
            }
          )
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), placeDetailsApiPlugin(mode)],
}))
