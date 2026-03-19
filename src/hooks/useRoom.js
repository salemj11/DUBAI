import { useEffect, useState, useCallback } from 'react'
import {
  joinRoom as joinLobby,
  leaveRoom as leaveLobby,
  resetRoom as resetLobby,
  subscribeToLobby,
} from '../backend/presence.js'
import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'

const ROOM_ID = 'main'

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

export function useRoom() {
  const [room, setRoom] = useState(null)
  const [lobby, setLobby] = useState(EMPTY_LOBBY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const unsubscribeLobby = subscribeToLobby((snapshot) => {
      if (isMounted) setLobby(snapshot)
    })
    let channel = null

    async function boot() {
      try {
        await ensureAnonymousSupabaseSession()

        const { data, error } = await supabase
          .from('rooms')
          .select('state')
          .eq('id', ROOM_ID)
          .maybeSingle()

        if (error) throw error

        const initialState = validState(data?.state) ? data.state : newRoom()

        const { error: upsertError } = await supabase
          .from('rooms')
          .upsert({ id: ROOM_ID, state: initialState }, { onConflict: 'id' })

        if (upsertError) throw upsertError

        if (isMounted) {
          setRoom(initialState)
          setLoading(false)
        }

        channel = supabase
          .channel('rooms:main')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${ROOM_ID}` },
            (payload) => {
              const state = payload.new?.state

              if (isMounted) {
                setRoom(validState(state) ? state : newRoom())
              }
            }
          )
          .subscribe()
      } catch (error) {
        console.error('Failed to load room state.', error)

        if (isMounted) {
          setRoom(newRoom())
          setLoading(false)
        }
      }
    }

    void boot()

    return () => {
      isMounted = false
      unsubscribeLobby()

      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [])

  const updateRoom = useCallback(async (fn) => {
    await ensureAnonymousSupabaseSession()

    const { data, error } = await supabase
      .from('rooms')
      .select('state')
      .eq('id', ROOM_ID)
      .maybeSingle()

    if (error) throw error

    const current = validState(data?.state) ? data.state : newRoom()
    const nextState = fn(current)

    const { error: upsertError } = await supabase
      .from('rooms')
      .upsert({ id: ROOM_ID, state: nextState }, { onConflict: 'id' })

    if (upsertError) throw upsertError
  }, [])

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
