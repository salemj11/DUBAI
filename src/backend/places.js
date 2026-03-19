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
 */

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

export async function fetchPlaceDetails(placeId, userLocation) {
  const seed = hashString(placeId)

  return {
    id: placeId,
    name: `Mock Place ${placeId.slice(0, 6).toUpperCase()}`,
    rating: 3.8 + (seed % 12) / 10,
    userRatingsTotal: 120 + (seed % 2400),
    distanceMeters: mockDistanceMeters(placeId, userLocation),
    currentBusyness: seed % 101,
    priceLevel: 1 + (seed % 4),
    topDishes: ['grilled kebab', 'mezze platter', 'saffron rice'],
  }
}

/*
Later integration:
- Google Places Details API: name, rating, user_ratings_total, price_level, photos.
- Routes / Distance Matrix or a local haversine fallback: distanceMeters.
- Popular-times / venue-footfall provider: map current occupancy to 0-100.
- If no busyness source exists for a place, keep currentBusyness undefined.
*/
