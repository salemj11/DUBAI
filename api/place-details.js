import process from 'node:process'

import { resolvePlaceDetails } from '../server/googlePlaces.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const details = await resolvePlaceDetails(request.body, {
      apiKey: process.env.GOOGLE_PLACES_API_KEY,
      allowedReferer: process.env.GOOGLE_PLACES_ALLOWED_REFERER,
    })

    response.status(200).json(details)
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load place details.',
    })
  }
}
