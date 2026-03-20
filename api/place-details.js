import process from 'node:process'

import { handlePlaceDetailsRequest } from '../server/placeDetailsApi.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '16kb',
    },
  },
}

export default async function handler(request, response) {
  await handlePlaceDetailsRequest(request, response, {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
    allowedReferer: process.env.GOOGLE_PLACES_ALLOWED_REFERER,
  })
}
