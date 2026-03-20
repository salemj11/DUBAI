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
const SEARCH_PLACE_FIELD_MASK = PLACE_FIELD_MASK
  .split(',')
  .map((field) => `places.${field}`)
  .join(',')

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

function buildFallbackMapsUri(seedPlace, resolvedPlace = null) {
  const query = seedPlace?.googleQuery
    ?? [seedPlace?.name, seedPlace?.area, 'Dubai'].filter(Boolean).join(' ')

  if (!query) {
    return undefined
  }

  const params = new URLSearchParams({
    api: '1',
    query,
  })
  const rawPlaceId = resolvedPlace?.id ?? seedPlace?.googlePlaceId
  const normalizedPlaceId = typeof rawPlaceId === 'string' && rawPlaceId.includes('/')
    ? rawPlaceId.split('/').pop()
    : rawPlaceId

  if (typeof normalizedPlaceId === 'string' && normalizedPlaceId.startsWith('ChI')) {
    params.set('query_place_id', normalizedPlaceId)
  }

  return `https://www.google.com/maps/search/?${params.toString()}`
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
    photoUrls: [],
    formattedAddress: undefined,
    editorialSummary: seedPlace?.vibe,
    googleMapsUri: buildFallbackMapsUri(seedPlace),
    lat: seedPlace?.lat ?? null,
    lng: seedPlace?.lng ?? null,
    openingHoursSummary: seedPlace?.openingHoursSummary ?? null,
  }
}

async function searchGooglePlaces(searchText, apiKey, allowedReferer, maxResultCount = 5) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: buildGoogleHeaders(apiKey, allowedReferer, SEARCH_PLACE_FIELD_MASK),
    body: JSON.stringify({
      textQuery: searchText,
      maxResultCount,
      languageCode: 'en',
      regionCode: 'AE',
    }),
  })

  if (!response.ok) {
    throw new Error(`Google Places search failed with ${response.status}: ${(await response.text()).slice(0, 500)}`)
  }

  const data = await response.json()

  return Array.isArray(data.places) ? data.places : []
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

async function resolvePhotoUris(photos, apiKey, allowedReferer) {
  if (!Array.isArray(photos) || photos.length === 0) {
    return []
  }

  const results = await Promise.all(
    photos
      .slice(0, 6)
      .map((photo) => resolvePhotoUri(photo?.name, apiKey, allowedReferer))
  )

  return Array.from(new Set(results.filter(Boolean)))
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

function getPlaceScore(place) {
  return (
    (Array.isArray(place?.photos) && place.photos.length > 0 ? 8 : 0)
    + (typeof place?.googleMapsUri === 'string' ? 3 : 0)
    + (typeof place?.formattedAddress === 'string' ? 2 : 0)
    + (typeof place?.rating === 'number' ? 2 : 0)
    + (place?.location ? 1 : 0)
  )
}

function normalizeVenueName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSimilarPlaceName(seedPlace, candidatePlace) {
  const seedName = normalizeVenueName(seedPlace?.name)
  const candidateName = normalizeVenueName(
    candidatePlace?.displayName?.text
      ?? candidatePlace?.displayName
      ?? candidatePlace?.name
  )

  if (!seedName || !candidateName) {
    return true
  }

  if (seedName.includes(candidateName) || candidateName.includes(seedName)) {
    return true
  }

  const seedTokens = new Set(seedName.split(' ').filter(Boolean))
  const candidateTokens = new Set(candidateName.split(' ').filter(Boolean))
  const overlap = Array.from(seedTokens).filter((token) => candidateTokens.has(token)).length
  const minimumOverlap = Math.max(1, Math.ceil(seedTokens.size * 0.6))

  return overlap >= minimumOverlap
}

function mergePlaces(primaryPlace, secondaryPlace) {
  if (!primaryPlace) return secondaryPlace
  if (!secondaryPlace) return primaryPlace

  return {
    ...secondaryPlace,
    ...primaryPlace,
    id: primaryPlace.id ?? secondaryPlace.id,
    displayName: primaryPlace.displayName ?? secondaryPlace.displayName,
    editorialSummary: primaryPlace.editorialSummary ?? secondaryPlace.editorialSummary,
    formattedAddress: primaryPlace.formattedAddress ?? secondaryPlace.formattedAddress,
    googleMapsUri: primaryPlace.googleMapsUri ?? secondaryPlace.googleMapsUri,
    location: primaryPlace.location ?? secondaryPlace.location,
    photos: Array.isArray(primaryPlace.photos) && primaryPlace.photos.length > 0
      ? primaryPlace.photos
      : secondaryPlace.photos,
    userRatingCount: primaryPlace.userRatingCount ?? secondaryPlace.userRatingCount,
    rating: typeof primaryPlace.rating === 'number' ? primaryPlace.rating : secondaryPlace.rating,
    priceLevel: primaryPlace.priceLevel ?? secondaryPlace.priceLevel,
    regularOpeningHours: primaryPlace.regularOpeningHours ?? secondaryPlace.regularOpeningHours,
  }
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
    let searchCandidates = []

    if (seedPlace?.googlePlaceId) {
      try {
        place = await fetchGooglePlace(seedPlace.googlePlaceId, apiKey, allowedReferer)
      } catch (error) {
        console.warn(`Google place-id lookup failed for ${seedPlace.name}. Falling back to search.`, error)
      }
    }

    if (!place || !Array.isArray(place.photos) || place.photos.length === 0 || !place.googleMapsUri) {
      const searchText = seedPlace.googleQuery ?? `${seedPlace.name} Dubai`
      searchCandidates = await searchGooglePlaces(searchText, apiKey, allowedReferer, 5)
      const comparableCandidates = searchCandidates.filter((candidate) => isSimilarPlaceName(seedPlace, candidate))
      const strongestCandidate = [...comparableCandidates].sort((left, right) => getPlaceScore(right) - getPlaceScore(left))[0] ?? null

      if (!place) {
        place = strongestCandidate
      } else if (strongestCandidate && getPlaceScore(strongestCandidate) > getPlaceScore(place)) {
        place = mergePlaces(strongestCandidate, place)
      } else if (strongestCandidate) {
        place = mergePlaces(place, strongestCandidate)
      }
    }

    if (!place) {
      return fallback
    }

    const photoSource = Array.isArray(place.photos) && place.photos.length > 0
      ? place.photos
      : (searchCandidates.find((candidate) => Array.isArray(candidate.photos) && candidate.photos.length > 0)?.photos ?? [])
    const photoUrls = await resolvePhotoUris(photoSource, apiKey, allowedReferer)
    const photoUrl = photoUrls[0] ?? fallback.photoUrl

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
      photoUrl,
      photoUrls: photoUrls.length > 0 ? photoUrls : fallback.photoUrls,
      formattedAddress: place.formattedAddress ?? fallback.formattedAddress,
      editorialSummary: place.editorialSummary?.text ?? fallback.editorialSummary,
      googleMapsUri: place.googleMapsUri ?? buildFallbackMapsUri(seedPlace, place) ?? fallback.googleMapsUri,
      lat: place.location?.latitude ?? fallback.lat,
      lng: place.location?.longitude ?? fallback.lng,
      openingHoursSummary: extractOpeningHoursSummary(place) ?? fallback.openingHoursSummary,
    }
  } catch (error) {
    console.warn(`Falling back to mock place details for ${seedPlace.name}.`, error)
    return fallback
  }
}
