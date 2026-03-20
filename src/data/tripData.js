/**
 * @typedef {'food' | 'chill' | 'activity'} PlaceCategory
 * @typedef {'open' | 'booked'} BookingStatus
 * @typedef {'confirmed' | 'curated' | 'needs_review'} SourceConfidence
 *
 * @typedef {Object} TripPlace
 * @property {string} id
 * @property {string} slug
 * @property {string} name
 * @property {string} emoji
 * @property {PlaceCategory} category
 * @property {string | null} subcategory
 * @property {string} area
 * @property {string} description
 * @property {string[]} tags
 * @property {string[]} vibeTags
 * @property {number} priceLevel
 * @property {BookingStatus} bookingStatus
 * @property {SourceConfidence} sourceConfidence
 * @property {number} rating
 * @property {string | null} googlePlaceId
 * @property {string | null} googleQuery
 * @property {number | null} lat
 * @property {number | null} lng
 * @property {string | null} openingHoursSummary
 * @property {string[]} branchOptions
 * @property {string | null} notes
 * @property {boolean} swipeEligible
 * @property {boolean} locked
 * @property {boolean} featured
 */

function definePlace(place) {
  return {
    subcategory: null,
    tags: [],
    vibeTags: [],
    priceLevel: 2,
    bookingStatus: 'open',
    sourceConfidence: 'curated',
    rating: 4.5,
    googlePlaceId: null,
    googleQuery: null,
    lat: null,
    lng: null,
    openingHoursSummary: null,
    branchOptions: [],
    notes: null,
    swipeEligible: true,
    locked: false,
    featured: false,
    ...place,
  }
}

function defineLockedEvent(event) {
  return {
    status: 'confirmed',
    locked: true,
    bookingStatus: 'booked',
    ...event,
  }
}

export const TRIP_DAYS = [
  { day: '2026-03-20', label: 'Friday 20 Mar', shortLabel: 'Fri 20' },
  { day: '2026-03-21', label: 'Saturday 21 Mar', shortLabel: 'Sat 21' },
  { day: '2026-03-22', label: 'Sunday 22 Mar', shortLabel: 'Sun 22' },
]

export const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍽️', color: '#F0A830', gradient: 'linear-gradient(135deg, #F0A830, #E8832A)' },
  { id: 'chill', label: 'Chill', emoji: '🌊', color: '#3ECFCF', gradient: 'linear-gradient(135deg, #3ECFCF, #2A9FD6)' },
  { id: 'activity', label: 'Activity', emoji: '⚡', color: '#C76BFF', gradient: 'linear-gradient(135deg, #C76BFF, #8B5CF6)' },
]

export const SUBCATEGORIES = {
  food: {
    cuisine: [
      { id: 'mexican', label: 'Mexican', emoji: '🌮' },
      { id: 'american', label: 'American', emoji: '🍔' },
      { id: 'italian', label: 'Italian', emoji: '🍝' },
      { id: 'japanese', label: 'Japanese', emoji: '🍣' },
      { id: 'middle-eastern', label: 'Middle Eastern', emoji: '🥙' },
      { id: 'contemporary', label: 'Contemporary', emoji: '🔥' },
    ],
    location: [
      { id: 'alserkal', label: 'Alserkal / Al Quoz', emoji: '🎨' },
      { id: 'difc', label: 'DIFC', emoji: '💼' },
      { id: 'jbr', label: 'JBR', emoji: '🌴' },
      { id: 'palm', label: 'Palm', emoji: '🌊' },
      { id: 'jlt', label: 'JLT', emoji: '🏙️' },
      { id: 'jumeirah', label: 'Jumeirah', emoji: '🏖️' },
    ],
    vibe: [
      { id: 'casual', label: 'Casual', emoji: '🍟' },
      { id: 'destination', label: 'Destination', emoji: '✨' },
      { id: 'late-night', label: 'Late Night', emoji: '🌙' },
      { id: 'design-forward', label: 'Design Forward', emoji: '🪩' },
    ],
  },
  chill: {
    type: [
      { id: 'coffee', label: 'Coffee', emoji: '☕' },
      { id: 'design', label: 'Design Scene', emoji: '🖼️' },
      { id: 'beach-club', label: 'Beach Club', emoji: '🏖️' },
      { id: 'nightlife', label: 'Nightlife', emoji: '🎶' },
      { id: 'rooftop', label: 'Rooftop', emoji: '🌃' },
      { id: 'lounge', label: 'Lounge', emoji: '🥂' },
    ],
    location: [
      { id: 'alserkal', label: 'Alserkal / Al Quoz', emoji: '🎨' },
      { id: 'jbr', label: 'JBR', emoji: '🌴' },
      { id: 'palm', label: 'Palm', emoji: '🌊' },
      { id: 'marina', label: 'Marina', emoji: '⛵' },
      { id: 'jumeirah', label: 'Jumeirah', emoji: '🏖️' },
      { id: 'difc', label: 'DIFC', emoji: '💼' },
    ],
  },
}

const PLACE_CATALOG = [
  definePlace({
    id: 'battlekart-dubai',
    slug: 'battlekart-dubai',
    name: 'BattleKart Dubai',
    emoji: '🏎️',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'Dubai Investment Park',
    description: 'AR karting with full chaos energy for five guys who want instant rematches, shouting, and bragging rights.',
    tags: ['competitive-social', 'high-energy', 'late-night'],
    vibeTags: ['competitive', 'group-ready', 'adrenaline'],
    priceLevel: 3,
    sourceConfidence: 'confirmed',
    rating: 4.8,
    googlePlaceId: 'ChIJ1XmrUwBzXz4R35him3yTpz0',
    googleQuery: 'BattleKart Dubai',
    featured: true,
  }),
  definePlace({
    id: 'chaos-karts-uae',
    slug: 'chaos-karts-uae',
    name: 'Chaos Karts UAE',
    emoji: '🎮',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'Al Quoz',
    description: 'Gamified karting that feels built for this app: score-chasing, group banter, and clean late-night momentum.',
    tags: ['competitive-social', 'alserkal', 'high-energy'],
    vibeTags: ['immersive', 'competitive', 'high-energy'],
    priceLevel: 3,
    sourceConfidence: 'confirmed',
    rating: 4.6,
    googlePlaceId: 'ChIJh3irSAJrXz4RCy4mKO0kPKY',
    googleQuery: 'Chaos Karts Dubai',
    featured: true,
  }),
  definePlace({
    id: 'quiz-room-dubai',
    slug: 'quiz-room-dubai',
    name: 'Quiz Room Dubai',
    emoji: '🎤',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'Al Quoz',
    description: 'Fast, funny, TV-show-style trivia that works when the group wants competition without needing athletic buy-in.',
    tags: ['competitive-social', 'alserkal', 'group'],
    vibeTags: ['interactive', 'funny', 'team-play'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 5,
    googlePlaceId: 'ChIJ7xjqPathXz4RdsfSMsLuVuo',
    googleQuery: 'Quiz Room Dubai',
    featured: true,
  }),
  definePlace({
    id: 'boom-battle-bar-dubai',
    slug: 'boom-battle-bar-dubai',
    name: 'Boom Battle Bar Dubai',
    emoji: '🪓',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'JBR',
    description: 'Arcade-bar energy with a big social crowd, good for drinks plus competition when nobody wants a quiet night.',
    tags: ['competitive-social', 'jbr', 'late-night'],
    vibeTags: ['games', 'crowd', 'pre-party'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.9,
    googlePlaceId: 'ChIJVQeagHFrXz4RNCxZC6O8gUw',
    googleQuery: 'Boom Battle Bar Dubai',
  }),
  definePlace({
    id: 'brass-monkey-bluewaters',
    slug: 'brass-monkey-bluewaters',
    name: 'Brass Monkey - Bluewaters',
    emoji: '🎳',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'Bluewaters',
    description: 'Bowling, arcade, and a crowd that keeps the mood social without tipping all the way into club mode.',
    tags: ['competitive-social', 'late-night', 'bluewaters'],
    vibeTags: ['social', 'arcade', 'easy-win'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.4,
    googlePlaceId: 'ChIJHYONX-cVXz4RfYACXb5DVs8',
    googleQuery: 'Brass Monkey Dubai',
  }),
  definePlace({
    id: 'wavehouse-dubai',
    slug: 'wavehouse-dubai',
    name: 'Wavehouse Dubai',
    emoji: '🌊',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'Palm Jumeirah',
    description: 'Atlantis-side bowling and arcade energy with just enough polish to still feel like a Dubai weekend move.',
    tags: ['competitive-social', 'palm', 'group'],
    vibeTags: ['arcade', 'resort-energy', 'group-ready'],
    priceLevel: 3,
    rating: 4.3,
    googlePlaceId: 'ChIJjfoqHBFpXz4RbCka3iOs3pE',
    googleQuery: 'Wavehouse Atlantis Dubai',
  }),
  definePlace({
    id: 'adventure-island-jbr',
    slug: 'adventure-island-jbr',
    name: 'Adventure Island JBR',
    emoji: '🧩',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'JBR',
    description: 'Escape-room style team competition with a strong group dynamic and easy access if the weekend stays near the beach.',
    tags: ['competitive-social', 'jbr', 'group'],
    vibeTags: ['puzzles', 'team-play', 'easy-plan'],
    priceLevel: 2,
    rating: 4.9,
    googlePlaceId: 'ChIJueUFvksVXz4R6m29javtjdQ',
    googleQuery: 'Adventure Island JBR Dubai',
  }),
  definePlace({
    id: 'house-of-hype-dubai',
    slug: 'house-of-hype-dubai',
    name: 'House of Hype',
    emoji: '🪩',
    category: 'activity',
    subcategory: 'immersive-social',
    area: 'Downtown',
    description: 'Immersive spectacle with strong visual payoff and enough playful nonsense to work as a group-memory stop.',
    tags: ['immersive-social', 'downtown', 'design-forward'],
    vibeTags: ['visual', 'playful', 'content-ready'],
    priceLevel: 3,
    rating: 4.8,
    googlePlaceId: 'ChIJx3SlGJ9pXz4RbyEYiIKTnOM',
    googleQuery: 'House of Hype Dubai',
  }),
  definePlace({
    id: 'the-smash-room',
    slug: 'the-smash-room',
    name: 'The Smash Room',
    emoji: '💥',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'Al Quoz',
    description: 'Pure chaos-release energy for when the group wants something funny, loud, and very not-boring.',
    tags: ['competitive-social', 'alserkal', 'high-energy'],
    vibeTags: ['chaotic', 'funny', 'stress-release'],
    priceLevel: 2,
    rating: 4.8,
    googlePlaceId: 'ChIJnU3TMuNrXz4RGhd4Pi_IuTc',
    googleQuery: 'The Smash Room Dubai',
  }),
  definePlace({
    id: 'topgolf-dubai',
    slug: 'topgolf-dubai',
    name: 'Topgolf Dubai',
    emoji: '⛳',
    category: 'activity',
    subcategory: 'competitive-social',
    area: 'Emirates Hills',
    description: 'Already booked and already perfect for the group, so it lives on the timeline instead of the swipe deck.',
    tags: ['competitive-social', 'late-night', 'group'],
    vibeTags: ['booked', 'crowd-pleaser', 'night-session'],
    priceLevel: 2,
    bookingStatus: 'booked',
    sourceConfidence: 'confirmed',
    rating: 4.7,
    googlePlaceId: 'ChIJ9-MKzS9tXz4RtK_l0uXBuIc',
    googleQuery: 'Topgolf Dubai',
    swipeEligible: false,
    locked: true,
    featured: true,
  }),
  definePlace({
    id: 'barrys-dubai-difc',
    slug: 'barrys-dubai-difc',
    name: "Barry's Dubai DIFC",
    emoji: '🏃',
    category: 'activity',
    subcategory: 'fitness',
    area: 'DIFC',
    description: 'Locked in as the polished daytime reset: premium, disciplined, and still very on-brand for the weekend.',
    tags: ['fitness', 'difc', 'premium'],
    vibeTags: ['booked', 'fitness', 'high-intensity'],
    priceLevel: 3,
    bookingStatus: 'booked',
    sourceConfidence: 'confirmed',
    rating: 4.5,
    googlePlaceId: 'ChIJAVficIZCXz4ROESrtaC5Vyo',
    googleQuery: "Barry's Dubai DIFC",
    swipeEligible: false,
    locked: true,
  }),
  definePlace({
    id: 'maiz-tacos-jlt',
    slug: 'maiz-tacos-jlt',
    name: 'Maiz Tacos JLT',
    emoji: '🌮',
    category: 'food',
    subcategory: 'casual-hype',
    area: 'JLT',
    description: 'Exactly the kind of easy, current, hype-casual taco spot that fits the group without feeling like filler.',
    tags: ['mexican', 'jlt', 'casual'],
    vibeTags: ['casual', 'current', 'group-easy'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.7,
    googlePlaceId: 'ChIJ1clUFlNDXz4RILtbmbG2smQ',
    googleQuery: 'Maiz Tacos Dubai',
    featured: true,
  }),
  definePlace({
    id: 'taqueria-el-primo',
    slug: 'taqueria-el-primo',
    name: 'Taqueria El Primo',
    emoji: '🌯',
    category: 'food',
    subcategory: 'casual-hype',
    area: 'Al Wasl',
    description: 'A sharper taco move when the deck needs something that still feels cool, social, and worth the trip.',
    tags: ['mexican', 'jumeirah', 'casual'],
    vibeTags: ['punchy', 'current', 'easy-win'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.7,
    googlePlaceId: 'ChIJyYIlcZ1DXz4RrPYzUHfuUsI',
    googleQuery: 'Taqueria El Primo Dubai',
    featured: true,
  }),
  definePlace({
    id: 'junk-burgers-dubai',
    slug: 'junk-burgers-dubai',
    name: 'JUNK BURGERS DUBAI',
    emoji: '🍔',
    category: 'food',
    subcategory: 'casual-hype',
    area: 'One Central',
    description: 'Big-flavor burger stop that lands right in the hype-comfort-food lane Salem described.',
    tags: ['american', 'difc', 'casual'],
    vibeTags: ['burger-run', 'comfort-hit', 'messy-good'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.5,
    googlePlaceId: 'ChIJ4dh1EwBDXz4ROzTN5vqbYdA',
    googleQuery: 'Junk Burger 25 Jump Street Dubai',
    notes: 'Canonical entry for Junk Burger / 25 Jump Street food reference.',
    branchOptions: ['One Central / 25 Jump Street'],
  }),
  definePlace({
    id: 'middle-child',
    slug: 'middle-child',
    name: 'Middle Child',
    emoji: '🥪',
    category: 'food',
    subcategory: 'design-forward-casual',
    area: 'Alserkal Avenue',
    description: 'Creative, current, and comfortably Alserkal-coded without becoming a boring cafe recommendation.',
    tags: ['american', 'alserkal', 'design-forward'],
    vibeTags: ['design-forward', 'creative', 'cool-crowd'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.3,
    googlePlaceId: 'ChIJ04uKl2ZpXz4RZI1sUyoIA1c',
    googleQuery: 'Middle Child Alserkal Dubai',
  }),
  definePlace({
    id: 'window-live-fire-cuisine',
    slug: 'window-live-fire-cuisine',
    name: 'Window Live Fire Cuisine',
    emoji: '🔥',
    category: 'food',
    subcategory: 'design-forward-casual',
    area: 'Alserkal Avenue',
    description: 'A stronger food-led pick in the Alserkal lane with personality, style, and a proper destination feel.',
    tags: ['contemporary', 'alserkal', 'design-forward'],
    vibeTags: ['live-fire', 'design-forward', 'cool-crowd'],
    priceLevel: 3,
    sourceConfidence: 'confirmed',
    rating: 4.9,
    googlePlaceId: 'ChIJB3xYiFZrXz4R9kpImGuWWA0',
    googleQuery: 'WINDOW Alserkal Dubai',
  }),
  definePlace({
    id: 'pepperoni-comedy-club',
    slug: 'pepperoni-comedy-club',
    name: 'Pepperoni Comedy Club',
    emoji: '🎭',
    category: 'food',
    subcategory: 'late-night-dinner',
    area: 'One Central',
    description: 'Dinner plus comedy fits the social lane without turning into generic bar food or bland filler.',
    tags: ['contemporary', 'difc', 'late-night'],
    vibeTags: ['social', 'show-night', 'late-night'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.7,
    googlePlaceId: 'ChIJt55uGNxDXz4Rb9sbYUt-yuU',
    googleQuery: 'Pepperoni Comedy Club Restaurant Dubai',
  }),
  definePlace({
    id: 'lila-wood-fired-taqueria',
    slug: 'lila-wood-fired-taqueria',
    name: 'LILA Wood-Fired Taqueria',
    emoji: '🌶️',
    category: 'food',
    subcategory: 'casual-hype',
    area: 'Jumeirah',
    description: 'More polished than a random taco stop, but still fun enough to fit the trip without feeling overly formal.',
    tags: ['mexican', 'jumeirah', 'design-forward'],
    vibeTags: ['stylish', 'wood-fired', 'current'],
    priceLevel: 3,
    rating: 4.5,
    googlePlaceId: 'ChIJC6v_wzxrXz4RxGE-GoL_NEA',
    googleQuery: 'Lila Taqueria Dubai',
  }),
  definePlace({
    id: 'reif-japanese-kushiyaki',
    slug: 'reif-japanese-kushiyaki',
    name: 'REIF Japanese Kushiyaki',
    emoji: '🍢',
    category: 'food',
    subcategory: 'destination-dinner',
    area: 'Dar Wasl',
    description: 'Still current, still food-forward, but a bit sharper when the group wants something more locked-in than burgers and tacos.',
    tags: ['japanese', 'jumeirah', 'destination'],
    vibeTags: ['chef-led', 'current', 'destination'],
    priceLevel: 3,
    rating: 4.6,
    googlePlaceId: 'ChIJW-9LMolDXz4Rz_y2JIdb8JQ',
    googleQuery: 'Reif Japanese Kushiyaki Dubai',
  }),
  definePlace({
    id: 'mimi-kakushi',
    slug: 'mimi-kakushi',
    name: 'Mimi Kakushi',
    emoji: '🥢',
    category: 'food',
    subcategory: 'destination-dinner',
    area: 'Jumeirah',
    description: 'A polished destination dinner that still has proper atmosphere and crowd appeal instead of stiff fine-dining energy.',
    tags: ['japanese', 'jumeirah', 'destination'],
    vibeTags: ['polished', 'crowd', 'destination'],
    priceLevel: 4,
    rating: 4.5,
    googlePlaceId: 'ChIJj-ySLalDXz4RLvs4jx1IGfo',
    googleQuery: 'Mimi Kakushi Dubai',
    featured: true,
  }),
  definePlace({
    id: '11-woodfire',
    slug: '11-woodfire',
    name: '11 Woodfire',
    emoji: '🥩',
    category: 'food',
    subcategory: 'destination-dinner',
    area: 'Jumeirah',
    description: 'Serious food credibility, but the open-fire angle keeps it feeling more alive than a boring formal reservation.',
    tags: ['contemporary', 'jumeirah', 'destination'],
    vibeTags: ['fire-cooking', 'destination', 'proper-dinner'],
    priceLevel: 4,
    rating: 4.4,
    googlePlaceId: 'ChIJ0XAHzFhDXz4RWB0pNY1dpuU',
    googleQuery: '11 Woodfire Dubai',
  }),
  definePlace({
    id: 'bb-social-dining',
    slug: 'bb-social-dining',
    name: 'BB Social Dining',
    emoji: '🥟',
    category: 'food',
    subcategory: 'smart-casual',
    area: 'DIFC',
    description: 'An easy DIFC option that still feels current and social instead of default business-district dinner energy.',
    tags: ['contemporary', 'difc', 'casual'],
    vibeTags: ['social', 'dining-room', 'easy-plan'],
    priceLevel: 3,
    rating: 4.4,
    googlePlaceId: 'ChIJ332-8ZFCXz4RvC6gwTnedUk',
    googleQuery: 'BB Social Dubai',
  }),
  definePlace({
    id: 'kinoya',
    slug: 'kinoya',
    name: 'Kinoya',
    emoji: '🍜',
    category: 'food',
    subcategory: 'destination-dinner',
    area: 'The Greens',
    description: 'A heavier food-first move that still feels buzzy and worth rallying for if the group wants a serious dinner pick.',
    tags: ['japanese', 'destination', 'late-night'],
    vibeTags: ['ramen-house', 'food-led', 'buzzy'],
    priceLevel: 3,
    rating: 4.5,
    googlePlaceId: 'ChIJo_aEw_JtXz4RIrHIsLk_ab0',
    googleQuery: 'Kinoya Dubai',
  }),
  definePlace({
    id: 'carbone-dubai',
    slug: 'carbone-dubai',
    name: 'Carbone Dubai',
    emoji: '🥂',
    category: 'food',
    subcategory: 'destination-dinner',
    area: 'Atlantis The Royal',
    description: 'A locked premium dinner anchor. It is part of the plan, not something the group needs to debate.',
    tags: ['italian', 'palm', 'destination'],
    vibeTags: ['booked', 'premium', 'anchor-plan'],
    priceLevel: 4,
    bookingStatus: 'booked',
    sourceConfidence: 'confirmed',
    rating: 4.1,
    googlePlaceId: 'ChIJteswUawVXz4RGQbBpEMwUYA',
    googleQuery: 'Carbone Atlantis Dubai',
    swipeEligible: false,
    locked: true,
    featured: true,
  }),
  definePlace({
    id: 'gooder',
    slug: 'gooder',
    name: 'gooder',
    emoji: '☕',
    category: 'chill',
    subcategory: 'design-cafe',
    area: 'Alserkal Avenue',
    description: 'Quietly cool Alserkal energy with a design-forward crowd, better for a sharp coffee stop than a generic mall cafe.',
    tags: ['coffee', 'design', 'alserkal'],
    vibeTags: ['creative', 'design-forward', 'cool-crowd'],
    priceLevel: 2,
    sourceConfidence: 'confirmed',
    rating: 4.7,
    googlePlaceId: 'ChIJDf8AOQBpXz4R_v89QRy0rus',
    googleQuery: 'Gooder Alserkal Dubai',
    featured: true,
  }),
  definePlace({
    id: 'gitano-dubai',
    slug: 'gitano-dubai',
    name: 'GITANO Dubai',
    emoji: '🌴',
    category: 'chill',
    subcategory: 'nightlife-lounge',
    area: 'J1 Beach',
    description: 'Stylish, buzzy, and clearly on the fashionable-crowd lane without feeling like a random club recommendation.',
    tags: ['nightlife', 'jumeirah', 'lounge'],
    vibeTags: ['fashion-crowd', 'stylish', 'late-evening'],
    priceLevel: 4,
    rating: 4.8,
    googlePlaceId: 'ChIJGQgZw4NDXz4RMBuYmeJ0WJM',
    googleQuery: 'Gitano Dubai',
  }),
  definePlace({
    id: 'tagomago',
    slug: 'tagomago',
    name: 'Tagomago',
    emoji: '🌺',
    category: 'chill',
    subcategory: 'beach-lounge',
    area: 'Palm Jumeirah',
    description: 'Good Palm-side social energy when the group wants views, music, and a crowd without max-pressure nightlife.',
    tags: ['beach-club', 'palm', 'lounge'],
    vibeTags: ['sunset', 'social', 'Palm'],
    priceLevel: 3,
    rating: 4.4,
    googlePlaceId: 'ChIJp7naVllrXz4R96sBFe1CHNk',
    googleQuery: 'Tagomago Dubai',
  }),
  definePlace({
    id: 'be-beach-dxb',
    slug: 'be-beach-dxb',
    name: 'Be Beach DXB',
    emoji: '🏖️',
    category: 'chill',
    subcategory: 'beach-lounge',
    area: 'Dubai Marina',
    description: 'A high-energy beach club option when the weekend wants daytime flex with easy transition into music and drinks.',
    tags: ['beach-club', 'marina', 'nightlife'],
    vibeTags: ['beach-club', 'music', 'social'],
    priceLevel: 4,
    rating: 4.4,
    googlePlaceId: 'ChIJUxiddNMVXz4RsyNDycWMWDo',
    googleQuery: 'Be Beach Dubai',
    featured: true,
  }),
  definePlace({
    id: 'aura-skypool-dubai',
    slug: 'aura-skypool-dubai',
    name: 'AURA SKYPOOL Dubai',
    emoji: '🏊',
    category: 'chill',
    subcategory: 'rooftop-pool',
    area: 'Palm Jumeirah',
    description: 'A premium flex move with views that feel worth the trip, best when the group wants a polished daytime statement.',
    tags: ['rooftop', 'palm', 'beach-club'],
    vibeTags: ['views', 'premium', 'sunset'],
    priceLevel: 4,
    rating: 4.9,
    googlePlaceId: 'ChIJydxhFctrXz4RJzAWespntrE',
    googleQuery: 'AURA Skypool Dubai',
    featured: true,
  }),
  definePlace({
    id: 'cloud-22-dubai',
    slug: 'cloud-22-dubai',
    name: 'Cloud 22 Dubai',
    emoji: '☁️',
    category: 'chill',
    subcategory: 'rooftop-pool',
    area: 'Palm Jumeirah',
    description: 'Flashier than AURA and better when the group wants a louder Palm pool scene with more big-weekend energy.',
    tags: ['rooftop', 'palm', 'nightlife'],
    vibeTags: ['flashy', 'Palm', 'big-weekend'],
    priceLevel: 4,
    rating: 4.3,
    googlePlaceId: 'ChIJb3RczncVXz4R2B9nby2174M',
    googleQuery: 'Cloud 22 Dubai',
  }),
  definePlace({
    id: 'ninive-beach-dubai',
    slug: 'ninive-beach-dubai',
    name: 'Ninive Beach Dubai',
    emoji: '🌅',
    category: 'chill',
    subcategory: 'beach-lounge',
    area: 'J1 Beach',
    description: 'A more design-conscious beach dinner-and-drinks option that still feels current and crowd-relevant.',
    tags: ['beach-club', 'jumeirah', 'design'],
    vibeTags: ['design-forward', 'sunset', 'crowd'],
    priceLevel: 4,
    rating: 4.6,
    googlePlaceId: 'ChIJPeLxSKdDXz4RTlOLTy-r5o4',
    googleQuery: 'Ninive Beach Dubai',
  }),
  definePlace({
    id: 'ce-la-vi-dubai',
    slug: 'ce-la-vi-dubai',
    name: 'CÉ LA VI',
    emoji: '🌃',
    category: 'chill',
    subcategory: 'rooftop-lounge',
    area: 'Downtown',
    description: 'A classic big-view Dubai rooftop that still works if the group wants dressed-up energy without a full club commitment.',
    tags: ['rooftop', 'nightlife', 'downtown'],
    vibeTags: ['skyline', 'dressed-up', 'night-start'],
    priceLevel: 4,
    rating: 4.5,
    googlePlaceId: 'ChIJfQZqMTJDXz4RAzXhbWHDkYE',
    googleQuery: 'CÉ LA VI Dubai',
  }),
  definePlace({
    id: 'zero-gravity-dubai',
    slug: 'zero-gravity-dubai',
    name: 'Zero Gravity Dubai',
    emoji: '🌊',
    category: 'chill',
    subcategory: 'beach-lounge',
    area: 'Dubai Marina',
    description: 'Still one of the easiest day-to-night social moves if the group wants music, beach, and a bigger crowd.',
    tags: ['beach-club', 'marina', 'nightlife'],
    vibeTags: ['day-to-night', 'music', 'crowd'],
    priceLevel: 3,
    rating: 4.5,
    googlePlaceId: 'ChIJgSOrzbIUXz4R-n3fz7DlWwY',
    googleQuery: 'Zero Gravity Dubai',
  }),
  definePlace({
    id: 'bla-bla-dubai',
    slug: 'bla-bla-dubai',
    name: 'Bla Bla Dubai',
    emoji: '🍹',
    category: 'chill',
    subcategory: 'nightlife-lounge',
    area: 'JBR',
    description: 'JBR social chaos in the best way when the group wants options, noise, and the ability to stay longer if the mood builds.',
    tags: ['nightlife', 'jbr', 'lounge'],
    vibeTags: ['JBR', 'social', 'all-night'],
    priceLevel: 3,
    rating: 4.3,
    googlePlaceId: 'ChIJycAqE8QTXz4R4G-7pQT9n0k',
    googleQuery: 'Bla Bla Dubai',
  }),
  definePlace({
    id: 'pacha-icons',
    slug: 'pacha-icons',
    name: 'Pacha Icons',
    emoji: '🎧',
    category: 'chill',
    subcategory: 'nightlife-lounge',
    area: 'FIVE LUXE, JBR',
    description: 'A locked late-night anchor for the weekend. It belongs on the plan, not in a swipe tiebreak.',
    tags: ['nightlife', 'jbr', 'lounge'],
    vibeTags: ['booked', 'music-led', 'late-night'],
    priceLevel: 4,
    bookingStatus: 'booked',
    sourceConfidence: 'confirmed',
    rating: 3.8,
    googlePlaceId: 'ChIJe1IjpLoVXz4RffunlN_1AaU',
    googleQuery: 'Pacha Icons Dubai',
    swipeEligible: false,
    locked: true,
    featured: true,
  }),
  definePlace({
    id: 'helipad-house-of-yanos',
    slug: 'helipad-house-of-yanos',
    name: 'Helipad House Of Yanos X Jerk X Jollof',
    emoji: '🛸',
    category: 'chill',
    subcategory: 'nightlife-lounge',
    area: 'Dubai',
    description: 'User-confirmed nightlife plan. The naming looks like an event collab, so it stays locked and marked for review rather than guessed at.',
    tags: ['nightlife', 'late-night', 'lounge'],
    vibeTags: ['booked', 'music-led', 'event-night'],
    priceLevel: 3,
    bookingStatus: 'booked',
    sourceConfidence: 'needs_review',
    rating: 4.5,
    googleQuery: 'Helipad House of Yanos Jerk Jollof Dubai',
    swipeEligible: false,
    locked: true,
    notes: 'Kept hidden from swipe mode because this looks like a one-off event title rather than a stable venue listing.',
  }),
]

const LOCKED_TIMELINE_EVENTS = [
  defineLockedEvent({
    id: 'locked-helipad-20260320-2000',
    title: 'Helipad House Of Yanos X Jerk X Jollof',
    day: '2026-03-20',
    startTime: '2026-03-20T20:00:00+04:00',
    endTime: '2026-03-20T22:00:00+04:00',
    category: 'chill',
    subcategory: 'nightlife-lounge',
    placeId: 'helipad-house-of-yanos',
    notes: 'User-confirmed Friday night plan.',
  }),
  defineLockedEvent({
    id: 'locked-topgolf-20260320-2215',
    title: 'Topgolf Dubai',
    day: '2026-03-20',
    startTime: '2026-03-20T22:15:00+04:00',
    endTime: '2026-03-21T00:30:00+04:00',
    category: 'activity',
    subcategory: 'competitive-social',
    placeId: 'topgolf-dubai',
    notes: 'User-confirmed Friday night booking.',
  }),
  defineLockedEvent({
    id: 'locked-barrys-20260321-1215',
    title: "Barry's workout class",
    day: '2026-03-21',
    startTime: '2026-03-21T12:15:00+04:00',
    endTime: '2026-03-21T13:15:00+04:00',
    category: 'activity',
    subcategory: 'fitness',
    placeId: 'barrys-dubai-difc',
    notes: 'Treat as locked and 100 percent confirmed.',
  }),
  defineLockedEvent({
    id: 'locked-carbone-20260321-2115',
    title: 'Carbone Dubai',
    day: '2026-03-21',
    startTime: '2026-03-21T21:15:00+04:00',
    endTime: '2026-03-21T23:15:00+04:00',
    category: 'food',
    subcategory: 'destination-dinner',
    placeId: 'carbone-dubai',
    notes: 'User-confirmed Saturday dinner booking.',
  }),
  defineLockedEvent({
    id: 'locked-pacha-20260321-2330',
    title: 'Pacha Icons',
    day: '2026-03-21',
    startTime: '2026-03-21T23:30:00+04:00',
    endTime: '2026-03-22T03:00:00+04:00',
    category: 'chill',
    subcategory: 'nightlife-lounge',
    placeId: 'pacha-icons',
    notes: 'Late-night arrival after Carbone.',
  }),
]

function sortByFeaturedThenRating(left, right) {
  if (left.featured !== right.featured) {
    return left.featured ? -1 : 1
  }

  return right.rating - left.rating
}

function sortTimeline(left, right) {
  return new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
}

function toCardPlace(place) {
  return {
    ...place,
    cat: place.category,
    cost: place.priceLevel,
    vibe: place.description,
    img: place.emoji,
    displayTags: [place.area, ...place.vibeTags].filter(Boolean).slice(0, 3),
  }
}

const CARD_PLACE_CATALOG = PLACE_CATALOG.map(toCardPlace)
const PLACE_BY_ID = new Map(CARD_PLACE_CATALOG.map((place) => [place.id, place]))

export function getAllPlaces() {
  return CARD_PLACE_CATALOG.slice()
}

export function getPlaceById(placeId) {
  return PLACE_BY_ID.get(placeId) ?? null
}

export function getPlacesByCategory(category, { includeLocked = true } = {}) {
  return CARD_PLACE_CATALOG
    .filter((place) => place.category === category && (includeLocked || !place.locked))
    .sort(sortByFeaturedThenRating)
}

export function getSwipeablePlaces(category, activeTags = []) {
  const basePlaces = getPlacesByCategory(category, { includeLocked: false })
    .filter((place) => place.swipeEligible)

  if (!Array.isArray(activeTags) || activeTags.length === 0) {
    return basePlaces
  }

  const activeTagSet = new Set(activeTags)
  const filtered = basePlaces.filter((place) => place.tags.some((tag) => activeTagSet.has(tag)))

  return filtered.length > 0 ? filtered : basePlaces
}

export function getFeaturedPlaces(category = null) {
  const featured = CARD_PLACE_CATALOG.filter((place) => place.featured && place.swipeEligible)

  return (category ? featured.filter((place) => place.category === category) : featured)
    .sort(sortByFeaturedThenRating)
}

export function getLockedTimelineEvents() {
  return LOCKED_TIMELINE_EVENTS
    .map((event) => {
      const place = getPlaceById(event.placeId)

      return {
        ...event,
        externalKey: event.id,
        placeName: event.title,
        place,
      }
    })
    .sort(sortTimeline)
}

export function getLockedTimelineSeedInputs() {
  return LOCKED_TIMELINE_EVENTS.map((event) => ({
    externalKey: event.id,
    day: event.day,
    startTime: event.startTime,
    endTime: event.endTime,
    category: event.category,
    subcategory: event.subcategory,
    placeId: event.placeId,
    placeName: event.title,
    createdBy: 'system:locked',
    status: event.status,
    locked: event.locked,
    notes: event.notes,
  }))
}

export function mapEventRecordToTimelineEvent(eventRecord) {
  const place = getPlaceById(eventRecord.place_id)

  return {
    id: eventRecord.id,
    externalKey: eventRecord.external_key ?? eventRecord.id,
    title: eventRecord.place_name,
    day: eventRecord.day,
    startTime: eventRecord.start_time,
    endTime: eventRecord.end_time,
    category: eventRecord.category,
    subcategory: eventRecord.subcategory,
    placeId: eventRecord.place_id,
    placeName: eventRecord.place_name,
    status: eventRecord.status,
    locked: eventRecord.locked === true,
    bookingStatus: eventRecord.locked === true ? 'booked' : 'open',
    notes: eventRecord.notes ?? null,
    place,
  }
}

export function mergeTimelineEvents(remoteEventRecords = []) {
  const merged = new Map()

  getLockedTimelineEvents().forEach((event) => {
    merged.set(event.externalKey, event)
  })

  remoteEventRecords
    .map(mapEventRecordToTimelineEvent)
    .forEach((event) => {
      merged.set(event.externalKey, event)
    })

  return Array.from(merged.values()).sort(sortTimeline)
}

export function getTimelineDays(events = getLockedTimelineEvents()) {
  return TRIP_DAYS.map((day) => ({
    ...day,
    events: events.filter((event) => event.day === day.day),
  }))
}
