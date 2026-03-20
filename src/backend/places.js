/**
 * @typedef {Object} PlaceDetails
 * @property {string} id
 * @property {string} name
 * @property {number} rating
 * @property {number} userRatingsTotal
 * @property {number} distanceMeters
 * @property {number | undefined} currentBusyness
 * @property {number | undefined} priceLevel
 * @property {string[] | undefined} topDishes
 * @property {string | undefined} photoUrl
 * @property {string | undefined} formattedAddress
 * @property {string | undefined} editorialSummary
 * @property {string | undefined} googleMapsUri
 * @property {string | null | undefined} googlePlaceId
 * @property {number | null | undefined} lat
 * @property {number | null | undefined} lng
 * @property {string | null | undefined} openingHoursSummary
 */

const detailsCache = new Map()
const inflightRequests = new Map()

function hashString(value) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function mockDistanceMeters(placeId, userLocation) {
  if (!userLocation) return 0

  return 400 + (hashString(`${placeId}:${userLocation.lat}:${userLocation.lng}`) % 3200)
}

function deriveBusyness(placeId) {
  const hour = new Date().getHours()
  const seed = hashString(`${placeId}:${hour}`)

  return 25 + (seed % 70)
}

function createFallbackPlaceDetails(placeId, userLocation, seedPlace) {
  const seed = hashString(placeId)

  return {
    id: placeId,
    googlePlaceId: seedPlace?.googlePlaceId ?? null,
    name: seedPlace?.name ?? `Mock Place ${placeId.slice(0, 6).toUpperCase()}`,
    rating: seedPlace?.rating ?? 3.8 + (seed % 12) / 10,
    userRatingsTotal: 120 + (seed % 2400),
    distanceMeters: mockDistanceMeters(placeId, userLocation),
    currentBusyness: deriveBusyness(placeId),
    priceLevel: seedPlace?.cost ?? (1 + (seed % 4)),
    topDishes: seedPlace?.cat === 'food' ? ['chef special', 'house favorite', 'sharing plate'] : undefined,
    photoUrl: undefined,
    formattedAddress: undefined,
    editorialSummary: seedPlace?.vibe,
    googleMapsUri: undefined,
    lat: seedPlace?.lat ?? null,
    lng: seedPlace?.lng ?? null,
    openingHoursSummary: seedPlace?.openingHoursSummary ?? null,
  }
}

export async function fetchPlaceDetails(placeId, userLocation, seedPlace) {
  const cacheKey = JSON.stringify([
    placeId,
    Math.round(userLocation?.lat ?? 0),
    Math.round(userLocation?.lng ?? 0),
  ])

  if (detailsCache.has(cacheKey)) {
    return detailsCache.get(cacheKey)
  }

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)
  }

  const fallback = createFallbackPlaceDetails(placeId, userLocation, seedPlace)

  const request = (async () => {
    try {
      const response = await fetch('/api/place-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeId,
          userLocation,
          seedPlace,
        }),
      })

      if (!response.ok) {
        throw new Error(`Place details request failed with ${response.status}`)
      }

      const data = await response.json()
      const details = {
        ...fallback,
        ...data,
      }

      detailsCache.set(cacheKey, details)
      return details
    } catch (error) {
      console.error('Failed to fetch live place details, using fallback data.', error)
      detailsCache.set(cacheKey, fallback)
      return fallback
    } finally {
      inflightRequests.delete(cacheKey)
    }
  })()

  inflightRequests.set(cacheKey, request)

  return request
}
