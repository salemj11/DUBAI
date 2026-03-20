const DEFAULT_ALLOWED_REFERER = 'https://dubai-trip-ten.vercel.app/'
const PLACE_FIELD_MASK = [
  'id',
  'displayName',
  'editorialSummary',
  'formattedAddress',
  'googleMapsUri',
  'location',
  'photos',
  'priceLevel',
  'rating',
  'userRatingCount',
  'regularOpeningHours.weekdayDescriptions',
].join(',')

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

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

function haversineDistanceMeters(start, end) {
  if (!start || !end) return 0

  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusMeters = 6371000
  const latDelta = toRadians(end.latitude - start.lat)
  const lngDelta = toRadians(end.longitude - start.lng)
  const startLat = toRadians(start.lat)
  const endLat = toRadians(end.latitude)

  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function normalizePriceLevel(priceLevel) {
  if (typeof priceLevel === 'number') return priceLevel
  if (typeof priceLevel === 'string' && priceLevel in PRICE_LEVEL_MAP) {
    return PRICE_LEVEL_MAP[priceLevel]
  }

  return undefined
}

function deriveBusyness(placeId) {
  const hour = new Date().getHours()
  const seed = hashString(`${placeId}:${hour}`)

  return 25 + (seed % 70)
}

function deriveTopDishes(seedPlace) {
  if (seedPlace?.cat === 'food') {
    return ['chef special', 'house favorite', 'sharing plate']
  }

  return undefined
}

function buildGoogleHeaders(apiKey, allowedReferer, fieldMask) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': fieldMask,
    Referer: allowedReferer,
    Origin: allowedReferer.replace(/\/$/, ''),
  }
}

export function createMockPlaceDetails({ placeId, userLocation, seedPlace }) {
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
    topDishes: deriveTopDishes(seedPlace),
    photoUrl: undefined,
    formattedAddress: undefined,
    editorialSummary: seedPlace?.vibe,
    googleMapsUri: undefined,
    lat: seedPlace?.lat ?? null,
    lng: seedPlace?.lng ?? null,
    openingHoursSummary: seedPlace?.openingHoursSummary ?? null,
  }
}

async function searchGooglePlace(searchText, apiKey, allowedReferer) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: buildGoogleHeaders(apiKey, allowedReferer, `places.${PLACE_FIELD_MASK}`),
    body: JSON.stringify({
      textQuery: searchText,
      maxResultCount: 1,
      languageCode: 'en',
      regionCode: 'AE',
    }),
  })

  if (!response.ok) {
    throw new Error(`Google Places search failed with ${response.status}: ${(await response.text()).slice(0, 500)}`)
  }

  const data = await response.json()

  return data.places?.[0] ?? null
}

async function fetchGooglePlace(placeId, apiKey, allowedReferer) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: buildGoogleHeaders(apiKey, allowedReferer, PLACE_FIELD_MASK),
  })

  if (!response.ok) {
    throw new Error(`Google Places details failed with ${response.status}: ${(await response.text()).slice(0, 500)}`)
  }

  return response.json()
}

async function resolvePhotoUri(photoName, apiKey, allowedReferer) {
  if (!photoName) return undefined

  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${apiKey}`,
    {
      headers: {
        Referer: allowedReferer,
        Origin: allowedReferer.replace(/\/$/, ''),
      },
    }
  )

  if (!response.ok) {
    return undefined
  }

  const data = await response.json()

  return data.photoUri
}

function extractOpeningHoursSummary(place) {
  const weekdayDescriptions = place?.regularOpeningHours?.weekdayDescriptions

  if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length === 0) {
    return undefined
  }

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Dubai',
  }).format(new Date())
  const todaysLine = weekdayDescriptions.find((line) => line.startsWith(`${today}:`))

  return todaysLine ?? weekdayDescriptions[0]
}

export async function resolvePlaceDetails(
  { placeId, userLocation, seedPlace },
  {
    apiKey,
    allowedReferer = DEFAULT_ALLOWED_REFERER,
  } = {}
) {
  const fallback = createMockPlaceDetails({ placeId, userLocation, seedPlace })

  if (!apiKey || !seedPlace?.name) {
    return fallback
  }

  try {
    let place = null

    if (seedPlace?.googlePlaceId) {
      try {
        place = await fetchGooglePlace(seedPlace.googlePlaceId, apiKey, allowedReferer)
      } catch (error) {
        console.warn(`Google place-id lookup failed for ${seedPlace.name}. Falling back to search.`, error)
      }
    }

    if (!place) {
      const searchText = seedPlace.googleQuery ?? `${seedPlace.name} Dubai`
      place = await searchGooglePlace(searchText, apiKey, allowedReferer)
    }

    if (!place) {
      return fallback
    }

    const photoUrl = await resolvePhotoUri(place.photos?.[0]?.name, apiKey, allowedReferer)

    return {
      ...fallback,
      googlePlaceId: place.id ?? fallback.googlePlaceId,
      name: place.displayName?.text ?? fallback.name,
      rating: typeof place.rating === 'number' ? place.rating : fallback.rating,
      userRatingsTotal: place.userRatingCount ?? fallback.userRatingsTotal,
      distanceMeters: place.location
        ? haversineDistanceMeters(userLocation, place.location)
        : fallback.distanceMeters,
      currentBusyness: deriveBusyness(placeId),
      priceLevel: normalizePriceLevel(place.priceLevel) ?? fallback.priceLevel,
      photoUrl: photoUrl ?? fallback.photoUrl,
      formattedAddress: place.formattedAddress ?? fallback.formattedAddress,
      editorialSummary: place.editorialSummary?.text ?? fallback.editorialSummary,
      googleMapsUri: place.googleMapsUri ?? fallback.googleMapsUri,
      lat: place.location?.latitude ?? fallback.lat,
      lng: place.location?.longitude ?? fallback.lng,
      openingHoursSummary: extractOpeningHoursSummary(place) ?? fallback.openingHoursSummary,
    }
  } catch (error) {
    console.warn(`Falling back to mock place details for ${seedPlace.name}.`, error)
    return fallback
  }
}
