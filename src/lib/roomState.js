import { getPlaceById } from '../data/tripData.js'

export const MAX_PLAYERS = 5
export const MAX_PLACE_SWIPES = 5
export const FINAL_VOTE_SECONDS = 60
export const TIMELINE_CONFIRMATION_THRESHOLD = 3
export const TIMELINE_VOTE_TARGET = 5

function nextId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function buildStartTimestamp(day, time) {
  return `${day}T${time}:00+04:00`
}

export function addOneHour(timestamp) {
  return new Date(new Date(timestamp).getTime() + 60 * 60 * 1000).toISOString()
}

export function createNewRoom() {
  return {
    players: [],
    phase: 'lobby',
    round: 1,
    isTestMode: false,
    testPlayers: [],
    categoryOptions: ['food', 'chill', 'activity'],
    categoryVotes: {},
    categoryShowResults: false,
    winningCategory: null,
    subcatSwipes: {},
    placeSwipes: {},
    finalOptions: [],
    finalVotes: {},
    finalMaxSelections: 4,
    finalVoteEndTime: null,
    finalRound: 1,
    finalShowResults: false,
    rouletteVotes: {},
    rouletteOptions: [],
    rouletteWinner: null,
    rouletteStartedAt: null,
    decidedPlace: null,
    timelineEvents: [],
  }
}

export function normalizeTimelineEvent(event) {
  const place = event?.place ?? getPlaceById(event?.placeId ?? event?.place_id)

  return {
    id: typeof event?.id === 'string' ? event.id : nextId('timeline'),
    externalKey: typeof event?.externalKey === 'string'
      ? event.externalKey
      : (typeof event?.external_key === 'string' ? event.external_key : nextId('timeline-external')),
    title: typeof event?.title === 'string'
      ? event.title
      : (typeof event?.placeName === 'string' ? event.placeName : (typeof event?.place_name === 'string' ? event.place_name : 'Untitled event')),
    day: typeof event?.day === 'string' ? event.day : '',
    startTime: typeof event?.startTime === 'string'
      ? event.startTime
      : (typeof event?.start_time === 'string' ? event.start_time : ''),
    endTime: typeof event?.endTime === 'string'
      ? event.endTime
      : (typeof event?.end_time === 'string' ? event.end_time : ''),
    category: typeof event?.category === 'string' ? event.category : 'activity',
    subcategory: typeof event?.subcategory === 'string'
      ? event.subcategory
      : (typeof event?.subcategory === 'string' ? event.subcategory : null),
    placeId: typeof event?.placeId === 'string'
      ? event.placeId
      : (typeof event?.place_id === 'string' ? event.place_id : null),
    placeName: typeof event?.placeName === 'string'
      ? event.placeName
      : (typeof event?.place_name === 'string' ? event.place_name : (place?.name ?? 'Untitled event')),
    createdBy: typeof event?.createdBy === 'string'
      ? event.createdBy
      : (typeof event?.created_by === 'string' ? event.created_by : 'unknown'),
    createdAt: typeof event?.createdAt === 'string'
      ? event.createdAt
      : (typeof event?.created_at === 'string' ? event.created_at : new Date().toISOString()),
    status: typeof event?.status === 'string' ? event.status : 'pending',
    locked: event?.locked === true,
    bookingStatus: typeof event?.bookingStatus === 'string'
      ? event.bookingStatus
      : (event?.locked === true ? 'booked' : 'open'),
    notes: typeof event?.notes === 'string' ? event.notes : null,
    votes: ensureObject(event?.votes),
    place,
  }
}

export function normalizeRoomState(room) {
  const defaults = createNewRoom()
  const nextRoom = {
    ...defaults,
    ...ensureObject(room),
  }

  nextRoom.players = ensureArray(nextRoom.players)
  nextRoom.testPlayers = ensureArray(nextRoom.testPlayers)
  nextRoom.categoryOptions = ensureArray(nextRoom.categoryOptions).filter(Boolean)
  nextRoom.categoryVotes = ensureObject(nextRoom.categoryVotes)
  nextRoom.subcatSwipes = ensureObject(nextRoom.subcatSwipes)
  nextRoom.placeSwipes = ensureObject(nextRoom.placeSwipes)
  nextRoom.finalOptions = ensureArray(nextRoom.finalOptions).filter(Boolean)
  nextRoom.finalVotes = ensureObject(nextRoom.finalVotes)
  nextRoom.rouletteVotes = ensureObject(nextRoom.rouletteVotes)
  nextRoom.rouletteOptions = ensureArray(nextRoom.rouletteOptions).filter(Boolean)
  nextRoom.timelineEvents = ensureArray(nextRoom.timelineEvents).map(normalizeTimelineEvent)

  return nextRoom
}

export function getMajorityCount(playerCount) {
  return Math.max(1, Math.floor(playerCount / 2) + 1)
}

export function getUnanimousCount(playerCount) {
  return Math.max(1, playerCount)
}

export function filterMapByPlayers(record, players) {
  const playerSet = new Set(players)

  return Object.fromEntries(
    Object.entries(ensureObject(record)).filter(([player]) => playerSet.has(player))
  )
}

export function pruneRoomStateForPlayers(room, players) {
  const nextRoom = normalizeRoomState(room)
  const safePlayers = ensureArray(players)
  const playerSet = new Set(safePlayers)

  nextRoom.players = safePlayers
  nextRoom.categoryVotes = filterMapByPlayers(nextRoom.categoryVotes, safePlayers)
  nextRoom.subcatSwipes = filterMapByPlayers(nextRoom.subcatSwipes, safePlayers)
  nextRoom.placeSwipes = filterMapByPlayers(nextRoom.placeSwipes, safePlayers)
  nextRoom.finalVotes = Object.fromEntries(
    Object.entries(nextRoom.finalVotes)
      .filter(([player]) => playerSet.has(player))
      .map(([player, selections]) => [player, ensureArray(selections).filter((placeId) => nextRoom.finalOptions.includes(placeId))])
  )
  nextRoom.rouletteVotes = filterMapByPlayers(nextRoom.rouletteVotes, safePlayers)

  return nextRoom
}

export function createTimelineEventDraft({ day, time, category, subcategory, placeId, createdBy }) {
  const place = getPlaceById(placeId)
  const startTime = buildStartTimestamp(day, time)

  return normalizeTimelineEvent({
    id: nextId('timeline'),
    externalKey: nextId('timeline-event'),
    title: place?.name ?? 'Untitled event',
    day,
    startTime,
    endTime: addOneHour(startTime),
    category: category ?? place?.cat ?? 'activity',
    subcategory: subcategory ?? place?.subcategory ?? null,
    placeId,
    placeName: place?.name ?? 'Untitled event',
    createdBy,
    createdAt: new Date().toISOString(),
    status: 'pending',
    locked: false,
    bookingStatus: 'open',
    notes: 'Needs 3/5 yes votes before it is confirmed. If it is still under 3 yes votes within 1 hour of the start time, it auto-cancels.',
    votes: createdBy ? { [createdBy]: 'yes' } : {},
    place,
  })
}

export function getTimelineVoteSummary(event, playerCount = TIMELINE_VOTE_TARGET) {
  const votes = ensureObject(event?.votes)
  const values = Object.values(votes)
  const yesCount = values.filter((vote) => vote === 'yes').length
  const noCount = values.filter((vote) => vote === 'no').length
  const submittedCount = values.length
  const targetCount = Math.max(playerCount, TIMELINE_VOTE_TARGET)

  return {
    yesCount,
    noCount,
    submittedCount,
    requiredYesCount: TIMELINE_CONFIRMATION_THRESHOLD,
    targetCount,
  }
}

export function resolveTimelineEventState(event, playerCount = TIMELINE_VOTE_TARGET, now = Date.now()) {
  const nextEvent = normalizeTimelineEvent(event)

  if (nextEvent.locked) {
    return nextEvent
  }

  const summary = getTimelineVoteSummary(nextEvent, playerCount)
  const startTimeMs = new Date(nextEvent.startTime).getTime()

  if (summary.yesCount >= TIMELINE_CONFIRMATION_THRESHOLD) {
    nextEvent.status = 'confirmed'
    return nextEvent
  }

  if (Number.isFinite(startTimeMs) && startTimeMs - now <= 60 * 60 * 1000) {
    nextEvent.status = 'cancelled'
    return nextEvent
  }

  nextEvent.status = 'pending'
  return nextEvent
}

export function normalizeTimelineEvents(events, playerCount = TIMELINE_VOTE_TARGET, now = Date.now()) {
  return ensureArray(events)
    .map((event) => resolveTimelineEventState(event, playerCount, now))
    .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
}

export function mergeTimelineCollections(baseEvents = [], localEvents = [], playerCount = TIMELINE_VOTE_TARGET, now = Date.now()) {
  const merged = new Map()

  ensureArray(baseEvents).forEach((event) => {
    const normalizedEvent = normalizeTimelineEvent(event)
    merged.set(normalizedEvent.externalKey ?? normalizedEvent.id, normalizedEvent)
  })

  normalizeTimelineEvents(localEvents, playerCount, now).forEach((event) => {
    merged.set(event.externalKey ?? event.id, event)
  })

  return Array.from(merged.values()).sort((left, right) => (
    new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
  ))
}

export function createEmptyTimelineDraft(defaultDay) {
  return {
    step: 'time',
    day: defaultDay,
    time: '20:00',
    categories: [],
    subcategories: [],
    category: null,
    subcategory: null,
    placeId: null,
  }
}
