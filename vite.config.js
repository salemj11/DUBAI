import process from 'node:process'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolvePlaceDetails } from './server/googlePlaces.js'

function placeDetailsApiPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    name: 'place-details-api',
    configureServer(server) {
      server.middlewares.use('/api/place-details', async (request, response, next) => {
        if (request.method !== 'POST') {
          next()
          return
        }

        let rawBody = ''

        request.on('data', (chunk) => {
          rawBody += chunk
        })

        request.on('end', async () => {
          try {
            const payload = rawBody ? JSON.parse(rawBody) : {}
            const details = await resolvePlaceDetails(payload, {
              apiKey: env.GOOGLE_PLACES_API_KEY,
              allowedReferer: env.GOOGLE_PLACES_ALLOWED_REFERER,
            })

            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify(details))
          } catch (error) {
            response.statusCode = 500
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Failed to load place details.',
            }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), placeDetailsApiPlugin(mode)],
}))
