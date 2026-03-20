import { useEffect, useState, useCallback, useRef } from 'react'
import {
  joinRoom as joinLobby,
  leaveRoom as leaveLobby,
  resetRoom as resetLobby,
  subscribeToLobby,
} from '../backend/presence.js'
import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'

const ROOM_STORAGE_KEY = 'dubai-weekend-trip.room-state'
const ROOM_SYNC_TOPIC = 'room:state'
const ROOM_SYNC_EVENT = 'room_state_sync'
const ROOM_SYNC_REQUEST_EVENT = 'room_state_request'
const CLIENT_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `room-client-${Date.now()}`

const EMPTY_LOBBY = {
  players: [],
  currentCount: 0,
  resetVersion: 0,
  wasReset: false,
}

function newRoom() {
  return {
    players: [], phase: 'lobby', round: 1,
    isTestMode: false, testPlayers: [],
    categoryOptions: ['food', 'chill', 'activity'],
    categoryVotes: {}, categoryShowResults: false, winningCategory: null,
    subcatSwipes: {}, placeSwipes: {},
    finalOptions: [], finalVotes: {}, finalMaxSelections: 4,
    finalVoteEndTime: null, finalRound: 1, finalShowResults: false,
    decidedPlace: null,
  }
}

function validState(state) {
  return state && typeof state === 'object' && Array.isArray(state.players)
}

function readStoredRoom() {
  if (typeof window === 'undefined') {
    return { room: newRoom(), version: 0 }
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ROOM_STORAGE_KEY) || 'null')

    if (validState(parsed?.room)) {
      return {
        room: parsed.room,
        version: Number.isFinite(parsed.version) ? parsed.version : 0,
      }
    }

    if (validState(parsed)) {
      return { room: parsed, version: 0 }
    }
  } catch {
    // Ignore corrupt local cache and start fresh.
  }

  return { room: newRoom(), version: 0 }
}

function writeStoredRoom(room, version) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    ROOM_STORAGE_KEY,
    JSON.stringify({
      room,
      version,
    })
  )
}

function parseSyncPayload(payload) {
  if (!payload || typeof payload !== 'object' || !validState(payload.room)) {
    return null
  }

  return {
    room: payload.room,
    senderId: typeof payload.senderId === 'string' ? payload.senderId : null,
    version: Number.isFinite(payload.version) ? payload.version : 0,
  }
}

export function useRoom() {
  const [room, setRoom] = useState(null)
  const [lobby, setLobby] = useState(EMPTY_LOBBY)
  const [loading, setLoading] = useState(true)
  const roomRef = useRef(newRoom())
  const roomVersionRef = useRef(0)
  const roomChannelRef = useRef(null)

  const applyRoomState = useCallback((nextRoom, version = Date.now()) => {
    if (!validState(nextRoom) || version < roomVersionRef.current) {
      return
    }

    roomRef.current = nextRoom
    roomVersionRef.current = version
    writeStoredRoom(nextRoom, version)
    setRoom(nextRoom)
  }, [])

  const broadcastRoomState = useCallback(async (nextRoom = roomRef.current, version = roomVersionRef.current) => {
    const channel = roomChannelRef.current

    if (!channel || !validState(nextRoom)) {
      return
    }

    const status = await channel.send({
      type: 'broadcast',
      event: ROOM_SYNC_EVENT,
      payload: {
        room: nextRoom,
        senderId: CLIENT_ID,
        version,
      },
    })

    if (status !== 'ok') {
      console.error(`Room state broadcast failed with status: ${status}.`)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const unsubscribeLobby = subscribeToLobby((snapshot) => {
      if (isMounted) setLobby(snapshot)
    })
    const stored = readStoredRoom()
    let channel = null

    async function boot() {
      try {
        await ensureAnonymousSupabaseSession()
      } catch (error) {
        console.error('Failed to bootstrap Supabase auth for room sync.', error)
      }

      if (!isMounted) return

      applyRoomState(stored.room, stored.version)
      setLoading(false)

      channel = supabase.channel(ROOM_SYNC_TOPIC, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })

      roomChannelRef.current = channel

      channel
        .on('broadcast', { event: ROOM_SYNC_EVENT }, ({ payload }) => {
          const parsed = parseSyncPayload(payload)

          if (!parsed || parsed.senderId === CLIENT_ID) {
            return
          }

          if (isMounted) {
            applyRoomState(parsed.room, parsed.version)
          }
        })
        .on('broadcast', { event: ROOM_SYNC_REQUEST_EVENT }, ({ payload }) => {
          const senderId = typeof payload?.senderId === 'string' ? payload.senderId : null

          if (senderId === CLIENT_ID || !validState(roomRef.current)) {
            return
          }

          void broadcastRoomState(roomRef.current, roomVersionRef.current)
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            return
          }

          void channel.send({
            type: 'broadcast',
            event: ROOM_SYNC_REQUEST_EVENT,
            payload: {
              senderId: CLIENT_ID,
              requestedAt: Date.now(),
            },
          })
        })
    }

    void boot()

    return () => {
      isMounted = false
      unsubscribeLobby()

      if (channel) {
        roomChannelRef.current = null
        void supabase.removeChannel(channel)
      }
    }
  }, [applyRoomState, broadcastRoomState])

  const updateRoom = useCallback(async (fn) => {
    const current = validState(roomRef.current) ? roomRef.current : readStoredRoom().room
    const nextState = fn(current)
    const version = Date.now()

    applyRoomState(nextState, version)
    await broadcastRoomState(nextState, version)

    return nextState
  }, [applyRoomState, broadcastRoomState])

  return {
    room,
    lobby,
    loading,
    updateRoom,
    joinLobby,
    leaveLobby,
    resetLobby,
  }
}
