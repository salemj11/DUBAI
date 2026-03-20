import { useEffect, useState, useCallback, useRef } from 'react'
import {
  joinRoom as joinLobby,
  leaveRoom as leaveLobby,
  resetRoom as resetLobby,
  getCurrentRoomResetVersion,
  subscribeToLobby,
} from '../backend/presence.js'
import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'
import { createNewRoom, normalizeRoomState } from '../lib/roomState.js'

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

function validState(state) {
  return state && typeof state === 'object' && Array.isArray(state.players)
}

function readStoredRoom(currentResetVersion = 0) {
  if (typeof window === 'undefined') {
    return { room: createNewRoom(), version: 0, resetVersion: currentResetVersion }
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ROOM_STORAGE_KEY) || 'null')
    const parsedResetVersion = Number.isFinite(parsed?.resetVersion) ? parsed.resetVersion : 0

    if (validState(parsed?.room) && parsedResetVersion >= currentResetVersion) {
      return {
        room: normalizeRoomState(parsed.room),
        version: Number.isFinite(parsed.version) ? parsed.version : 0,
        resetVersion: parsedResetVersion,
      }
    }

    if (validState(parsed) && parsedResetVersion >= currentResetVersion) {
      return { room: normalizeRoomState(parsed), version: 0, resetVersion: parsedResetVersion }
    }
  } catch {
    // Ignore corrupt local cache and start fresh.
  }

  return { room: createNewRoom(), version: 0, resetVersion: currentResetVersion }
}

function writeStoredRoom(room, version, resetVersion) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    ROOM_STORAGE_KEY,
    JSON.stringify({
      room,
      version,
      resetVersion,
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
    resetVersion: Number.isFinite(payload.resetVersion) ? payload.resetVersion : 0,
  }
}

export function useRoom() {
  const [room, setRoom] = useState(null)
  const [lobby, setLobby] = useState(EMPTY_LOBBY)
  const [loading, setLoading] = useState(true)
  const roomRef = useRef(createNewRoom())
  const roomVersionRef = useRef(0)
  const roomResetVersionRef = useRef(getCurrentRoomResetVersion())
  const roomChannelRef = useRef(null)

  const applyRoomState = useCallback((nextRoom, version = Date.now(), resetVersion = roomResetVersionRef.current) => {
    if (
      !validState(nextRoom)
      || version < roomVersionRef.current
      || resetVersion < roomResetVersionRef.current
    ) {
      return
    }

    const normalizedRoom = normalizeRoomState(nextRoom)

    roomRef.current = normalizedRoom
    roomVersionRef.current = version
    roomResetVersionRef.current = resetVersion
    writeStoredRoom(normalizedRoom, version, resetVersion)
    setRoom(normalizedRoom)
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
        resetVersion: roomResetVersionRef.current,
      },
    })

    if (status !== 'ok') {
      console.error(`Room state broadcast failed with status: ${status}.`)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const unsubscribeLobby = subscribeToLobby((snapshot) => {
      if (!isMounted) return

      roomResetVersionRef.current = Math.max(roomResetVersionRef.current, snapshot.resetVersion ?? 0)
      setLobby(snapshot)

      if (snapshot.wasReset) {
        applyRoomState(createNewRoom(), Date.now(), snapshot.resetVersion ?? roomResetVersionRef.current)
      }
    })
    const stored = readStoredRoom(roomResetVersionRef.current)
    let channel = null

    async function boot() {
      try {
        await ensureAnonymousSupabaseSession()
      } catch (error) {
        console.error('Failed to bootstrap Supabase auth for room sync.', error)
      }

      if (!isMounted) return

      applyRoomState(stored.room, stored.version, stored.resetVersion)
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
            applyRoomState(parsed.room, parsed.version, parsed.resetVersion)
          }
        })
        .on('broadcast', { event: ROOM_SYNC_REQUEST_EVENT }, ({ payload }) => {
          const senderId = typeof payload?.senderId === 'string' ? payload.senderId : null
          const currentRoom = roomRef.current
          const hasMeaningfulState = validState(currentRoom) && (
            currentRoom.phase !== 'lobby'
            || currentRoom.players.length > 0
            || currentRoom.timelineEvents.length > 0
            || currentRoom.isTestMode === true
            || typeof currentRoom.hostName === 'string'
          )

          if (
            senderId === CLIENT_ID
            || !hasMeaningfulState
          ) {
            return
          }

          void broadcastRoomState(currentRoom, roomVersionRef.current)
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
    const current = validState(roomRef.current) ? roomRef.current : readStoredRoom(roomResetVersionRef.current).room
    const nextState = normalizeRoomState(fn(current))
    const version = Date.now()

    applyRoomState(nextState, version, roomResetVersionRef.current)
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
