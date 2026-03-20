import { getPlaceById } from '../src/data/tripData.js'
import { resolvePlaceDetails } from './googlePlaces.js'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 90
const RESPONSE_CACHE_TTL_MS = 5 * 60_000

const rateLimitBuckets = new Map()
const responseCache = new Map()

function readHeader(headers, name) {
  if (!headers) return ''

  if (typeof headers.get === 'function') {
    return headers.get(name) ?? ''
  }

  return headers[name] ?? headers[name.toLowerCase()] ?? ''
}

function createHttpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function sanitizeUserLocation(input) {
  if (!input || typeof input !== 'object') return null

  const lat = Number(input.lat)
  const lng = Number(input.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  }
}

function normalizeRequestPayload(body) {
  const payload = body && typeof body === 'object' ? body : {}
  const placeId = typeof payload.placeId === 'string' ? payload.placeId.trim() : ''

  if (!placeId) {
    throw createHttpError(400, 'Missing placeId.')
  }

  const seedPlace = getPlaceById(placeId)

  if (!seedPlace) {
    throw createHttpError(400, 'Unknown placeId.')
  }

  return {
    placeId: seedPlace.id,
    userLocation: sanitizeUserLocation(payload.userLocation),
    seedPlace,
  }
}

function getClientKey(requestLike) {
  const forwardedFor = readHeader(requestLike.headers, 'x-forwarded-for')
  const candidate = forwardedFor.split(',')[0]?.trim()

  if (candidate) {
    return candidate
  }

  return requestLike.socket?.remoteAddress ?? 'unknown-client'
}

function isRateLimited(clientKey) {
  const now = Date.now()
  const bucket = rateLimitBuckets.get(clientKey)

  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(clientKey, { startedAt: now, count: 1 })
    return false
  }

  bucket.count += 1

  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  return false
}

function buildCacheKey({ placeId, userLocation }) {
  return JSON.stringify([
    placeId,
    userLocation?.lat ?? 0,
    userLocation?.lng ?? 0,
  ])
}

function getCachedDetails(cacheKey) {
  const cachedEntry = responseCache.get(cacheKey)

  if (!cachedEntry) return null

  if (cachedEntry.expiresAt <= Date.now()) {
    responseCache.delete(cacheKey)
    return null
  }

  return cachedEntry.value
}

function setCachedDetails(cacheKey, value) {
  responseCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
  })
}

function sendJson(response, statusCode, payload, headers = {}) {
  if (typeof response.status === 'function' && typeof response.json === 'function') {
    Object.entries(headers).forEach(([name, value]) => {
      response.setHeader?.(name, value)
    })

    response.status(statusCode).json(payload)
    return
  }

  response.statusCode = statusCode

  Object.entries(headers).forEach(([name, value]) => {
    response.setHeader(name, value)
  })

  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

export async function handlePlaceDetailsRequest(requestLike, response, env) {
  if (requestLike.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' }, { Allow: 'POST' })
    return
  }

  const clientKey = getClientKey(requestLike)

  if (isRateLimited(clientKey)) {
    sendJson(response, 429, { error: 'Too many place detail requests. Try again shortly.' })
    return
  }

  try {
    const payload = normalizeRequestPayload(requestLike.body)
    const cacheKey = buildCacheKey(payload)
    const cachedDetails = getCachedDetails(cacheKey)

    if (cachedDetails) {
      sendJson(
        response,
        200,
        cachedDetails,
        { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' }
      )
      return
    }

    const details = await resolvePlaceDetails(payload, {
      apiKey: env.apiKey,
      allowedReferer: env.allowedReferer,
    })

    setCachedDetails(cacheKey, details)

    sendJson(
      response,
      200,
      details,
      { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' }
    )
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500

    if (statusCode >= 500) {
      console.error('Place details API failed.', error)
    }

    sendJson(
      response,
      statusCode,
      {
        error: statusCode >= 500
          ? 'Failed to load place details.'
          : (error instanceof Error ? error.message : 'Invalid request.'),
      }
    )
  }
}
