import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase.js'

const ROOM_ID = 'main'

function newRoom() {
  return {
    players: [], phase: 'lobby', round: 1,
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    supabase
      .from('rooms')
      .select('state')
      .eq('id', ROOM_ID)
      .single()
      .then(({ data }) => {
        setRoom(validState(data?.state) ? data.state : newRoom())
        setLoading(false)
      })

    // Realtime subscription
    const channel = supabase
      .channel('rooms:main')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${ROOM_ID}` },
        (payload) => {
          const s = payload.new?.state
          setRoom(validState(s) ? s : newRoom())
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateRoom = useCallback(async (fn) => {
    // Read latest state from DB to avoid race conditions
    const { data } = await supabase
      .from('rooms')
      .select('state')
      .eq('id', ROOM_ID)
      .single()

    const current = validState(data?.state) ? data.state : newRoom()
    const nextState = fn(current)

    const { error: upsertError } = await supabase
      .from('rooms')
      .upsert({ id: ROOM_ID, state: nextState })

    if (upsertError) throw upsertError
  }, [])

  return { room, loading, updateRoom }
}
