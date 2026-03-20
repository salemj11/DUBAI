import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'

const ROOM_TOPIC = 'room:lobby'
const RESET_EVENT = 'room_reset'
const RESET_VERSION_STORAGE_KEY = 'dubai-weekend-trip.room-reset-version'
const MAX_PLAYERS = 5
const CHANNEL_KEY =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `lobby-${Date.now()}`

let activeResetVersion = readResetVersion()
let activeChannel = null
let activeChannelPromise = null
let activePresence = null
let latestSnapshot = createSnapshot([], false)
const subscribers = new Set()
const suppressedUserIds = new Set()
let lifecycleHandlersInstalled = false

function readResetVersion() {
  if (typeof window === 'undefined') return 0

  const value = Number(window.localStorage.getItem(RESET_VERSION_STORAGE_KEY) || '0')

  return Number.isFinite(value) && value >= 0 ? value : 0
}

function writeResetVersion(value) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(RESET_VERSION_STORAGE_KEY, String(value))
}

export function getCurrentRoomResetVersion() {
  return activeResetVersion
}

function createSnapshot(players, wasReset, resetRequestedAt) {
  return {
    players,
    currentCount: players.length,
    resetVersion: activeResetVersion,
    wasReset,
    resetRequestedAt,
  }
}

function notifySubscribers(snapshot) {
  latestSnapshot = snapshot

  subscribers.forEach((subscriber) => {
    subscriber(snapshot)
  })
}

function flattenPresenceState(state) {
  return Object.values(state).flatMap((entry) => {
    if (Array.isArray(entry)) return entry
    if (entry && typeof entry === 'object' && Array.isArray(entry.metas)) return entry.metas
    return []
  })
}

function sanitizePresence(entry) {
  if (!entry || typeof entry !== 'object') return null

  const userId = typeof entry.userId === 'string' ? entry.userId : null
  const name = typeof entry.name === 'string' ? entry.name : null
  const pin = typeof entry.pin === 'string' ? entry.pin : null
  const joinedAt = typeof entry.joinedAt === 'string' ? entry.joinedAt : null
  const resetVersion = Number(entry.resetVersion)

  if (!userId || !name || !pin || !joinedAt || !Number.isFinite(resetVersion)) {
    return null
  }

  return { userId, name, pin, joinedAt, resetVersion }
}

function listPlayers() {
  if (!activeChannel) return []

  return flattenPresenceState(activeChannel.presenceState())
    .map(sanitizePresence)
    .filter(Boolean)
    .filter((presence) => presence.resetVersion === activeResetVersion)
    .filter((presence) => !suppressedUserIds.has(presence.userId))
    .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
}

function buildSnapshot(wasReset = false, resetRequestedAt) {
  return createSnapshot(listPlayers(), wasReset, resetRequestedAt)
}

function parseResetPayload(payload) {
  if (!payload || typeof payload !== 'object') return null

  const resetVersion = Number(payload.resetVersion)
  const requestedAt = typeof payload.requestedAt === 'string' ? payload.requestedAt : null
  const requestedBy = typeof payload.requestedBy === 'string' ? payload.requestedBy : null

  if (!Number.isFinite(resetVersion) || !requestedAt || !requestedBy) return null

  return { resetVersion, requestedAt, requestedBy }
}

async function cleanupChannelIfIdle() {
  if (subscribers.size > 0 || activePresence || !activeChannel) return

  const channel = activeChannel

  activeChannel = null
  activeChannelPromise = null
  await supabase.removeChannel(channel)
}

async function untrackActivePresence() {
  if (!activeChannel || !activePresence) return

  suppressedUserIds.add(activePresence.userId)
  activePresence = null

  try {
    await activeChannel.untrack()
  } catch {
    // Best effort during page close / network loss.
  }

  notifySubscribers(buildSnapshot())
}

function installLifecycleHandlers() {
  if (lifecycleHandlersInstalled || typeof window === 'undefined') return

  const bestEffortLeave = () => {
    if (!activeChannel || !activePresence) return

    suppressedUserIds.add(activePresence.userId)
    activePresence = null

    try {
      void activeChannel.untrack()
    } catch {
      // Best effort only during tab close / app backgrounding.
    }
  }

  window.addEventListener('pagehide', bestEffortLeave)
  window.addEventListener('beforeunload', bestEffortLeave)
  lifecycleHandlersInstalled = true
}

async function applyReset(payload) {
  if (payload.resetVersion <= activeResetVersion) return

  activeResetVersion = payload.resetVersion
  writeResetVersion(activeResetVersion)
  await untrackActivePresence()
  notifySubscribers(createSnapshot([], true, payload.requestedAt))
}

function bindChannelHandlers(channel) {
  channel
    .on('presence', { event: 'sync' }, () => {
      notifySubscribers(buildSnapshot())
    })
    .on('presence', { event: 'join' }, () => {
      notifySubscribers(buildSnapshot())
    })
    .on('presence', { event: 'leave' }, () => {
      notifySubscribers(buildSnapshot())
    })
    .on('broadcast', { event: RESET_EVENT }, ({ payload }) => {
      const parsedPayload = parseResetPayload(payload)

      if (!parsedPayload) return

      void applyReset(parsedPayload)
    })
}

async function ensureLobbyChannel() {
  await ensureAnonymousSupabaseSession()
  installLifecycleHandlers()

  if (activeChannel) return activeChannel
  if (activeChannelPromise) return activeChannelPromise

  const channel = supabase.channel(ROOM_TOPIC, {
    config: {
      presence: {
        key: CHANNEL_KEY,
      },
      broadcast: {
        self: false,
      },
    },
  })

  bindChannelHandlers(channel)

  activeChannelPromise = new Promise((resolve, reject) => {
    let settled = false
    const timeoutId = globalThis.setTimeout(() => {
      if (settled) return
      settled = true
      activeChannelPromise = null
      reject(new Error('Timed out while connecting to the lobby channel.'))
    }, 10000)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (settled) return
        settled = true
        globalThis.clearTimeout(timeoutId)
        activeChannel = channel
        resolve(channel)
        return
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (settled) return
        settled = true
        globalThis.clearTimeout(timeoutId)
        activeChannelPromise = null
        reject(new Error(`Lobby channel failed with status: ${status}.`))
      }
    })
  })

  try {
    return await activeChannelPromise
  } finally {
    if (activeChannel) {
      activeChannelPromise = null
    }
  }
}

export function subscribeToLobby(callback) {
  subscribers.add(callback)
  callback(latestSnapshot)

  void ensureLobbyChannel()
    .then(() => {
      notifySubscribers(buildSnapshot())
    })
    .catch((error) => {
      console.error('Failed to subscribe to lobby presence.', error)
    })

  return () => {
    subscribers.delete(callback)
    void cleanupChannelIfIdle()
  }
}

export async function joinRoom({ name, pin }) {
  const trimmedName = name.trim()
  const trimmedPin = pin.trim()

  if (!trimmedName) throw new Error('Name is required.')
  if (!/^\d{3}$/.test(trimmedPin)) throw new Error('PIN must be exactly 3 digits.')

  const channel = await ensureLobbyChannel()
  const players = listPlayers()

  if (players.length >= MAX_PLAYERS) {
    throw new Error(`Room is full. Only ${MAX_PLAYERS} active players are allowed.`)
  }

  if (players.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error('That name is already taken.')
  }

  if (players.length > 0 && players.some((player) => player.pin !== trimmedPin)) {
    throw new Error('PIN does not match the active room.')
  }

  await untrackActivePresence()

  const userId = crypto.randomUUID()
  const presence = {
    userId,
    name: trimmedName,
    pin: trimmedPin,
    joinedAt: new Date().toISOString(),
    resetVersion: activeResetVersion,
  }

  suppressedUserIds.delete(userId)

  const trackStatus = await channel.track(presence)

  if (trackStatus !== 'ok') {
    throw new Error(`Failed to publish lobby presence. Supabase returned: ${trackStatus}.`)
  }

  activePresence = presence
  notifySubscribers(buildSnapshot())

  return { userId }
}

export async function leaveRoom() {
  await untrackActivePresence()
  await cleanupChannelIfIdle()
}

export async function resetRoom() {
  const channel = await ensureLobbyChannel()
  const payload = {
    resetVersion: activeResetVersion + 1,
    requestedAt: new Date().toISOString(),
    requestedBy: activePresence?.userId ?? 'system:manual-reset',
  }

  const sendStatus = await channel.send({
    type: 'broadcast',
    event: RESET_EVENT,
    payload,
  })

  if (sendStatus !== 'ok') {
    throw new Error(`Room reset broadcast failed with status: ${sendStatus}.`)
  }

  await applyReset(payload)
}

/*
Frontend reset handling:
1. Subscribe once with subscribeToLobby(...) near app startup.
2. When snapshot.wasReset === true, clear local UI state, route back to login,
   and let everyone call joinRoom(...) again if they want back in.
3. Old presence entries are ignored immediately because every player is filtered
   by resetVersion, so stale sockets stop counting the moment reset fires.

Presence-only dead-tab detection:
- Realtime Presence will usually remove disconnected tabs, but cleanup timing
  is still best-effort.
- If you need a strict 5-player cap later, add a public.player_sessions table
  with heartbeat_at timestamps, update it every 15-30s, and expire rows where
  heartbeat_at is older than ~45s. Presence can stay in place for instant UI.
*/
