import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'

let eventsBackendAvailable = true

export function isEventsBackendAvailable() {
  return eventsBackendAvailable
}

function assertDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('day must be a YYYY-MM-DD string.')
  }
}

function trimString(value, maxLength = 160) {
  if (typeof value !== 'string') return ''

  return value.trim().slice(0, maxLength)
}

function isMissingEventsBackend(error) {
  const code = String(error?.code ?? '')
  const status = Number(error?.status ?? error?.statusCode ?? 0)
  const message = String(error?.message ?? '').toLowerCase()
  const details = String(error?.details ?? '').toLowerCase()
  const hint = String(error?.hint ?? '').toLowerCase()
  const combined = `${message} ${details} ${hint}`

  return (
    code === 'PGRST205'
    || status === 404
    || combined.includes('events')
    || combined.includes('event_votes')
    || combined.includes('schema cache')
  )
}

function disableEventsBackend(error) {
  if (!isMissingEventsBackend(error)) {
    return false
  }

  eventsBackendAvailable = false
  return true
}

export async function createEvent(input) {
  if (!eventsBackendAvailable) {
    return null
  }

  assertDay(input.day)
  await ensureAnonymousSupabaseSession()

  const placeName = trimString(input.placeName)
  const createdBy = trimString(input.createdBy, 80)

  if (!placeName) {
    throw new Error('placeName is required.')
  }

  if (!createdBy) {
    throw new Error('createdBy is required.')
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      external_key: trimString(input.externalKey, 120) || null,
      day: input.day,
      start_time: input.startTime,
      end_time: input.endTime,
      category: trimString(input.category, 40) || 'activity',
      subcategory: trimString(input.subcategory, 80) || null,
      place_id: trimString(input.placeId, 120) || null,
      place_name: placeName,
      created_by: createdBy,
      status: 'pending',
      locked: false,
      notes: trimString(input.notes, 320) || null,
    })
    .select('*')
    .single()

  if (error) {
    if (disableEventsBackend(error)) {
      return null
    }

    throw error
  }

  return data
}

export async function seedLockedTimelineEvents(events) {
  if (!eventsBackendAvailable) {
    return []
  }

  await ensureAnonymousSupabaseSession()

  if (!Array.isArray(events) || events.length === 0) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('created_by', 'system:locked')
      .eq('locked', true)

    if (error) {
      if (disableEventsBackend(error)) {
        return []
      }

      throw error
    }

    return []
  }

  const payload = events.map((event) => ({
    external_key: event.externalKey,
    day: event.day,
    start_time: event.startTime,
    end_time: event.endTime,
    category: event.category,
    subcategory: event.subcategory ?? null,
    place_id: event.placeId ?? null,
    place_name: event.placeName,
    created_by: event.createdBy ?? 'system:locked',
    status: event.status ?? 'confirmed',
    locked: event.locked ?? true,
    notes: event.notes ?? null,
  }))

  const { data, error } = await supabase
    .from('events')
    .upsert(payload, {
      onConflict: 'external_key',
    })
    .select('*')

  if (error) {
    if (disableEventsBackend(error)) {
      return []
    }

    throw error
  }

  const lockedKeys = new Set(payload.map((event) => event.external_key))
  const { data: existingLocked, error: existingError } = await supabase
    .from('events')
    .select('id, external_key')
    .eq('created_by', 'system:locked')
    .eq('locked', true)

  if (existingError) {
    if (disableEventsBackend(existingError)) {
      return data ?? []
    }

    throw existingError
  }

  const staleIds = (existingLocked ?? [])
    .filter((event) => !lockedKeys.has(event.external_key))
    .map((event) => event.id)

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .in('id', staleIds)

    if (deleteError) {
      if (disableEventsBackend(deleteError)) {
        return data ?? []
      }

      throw deleteError
    }
  }

  return data ?? []
}

export async function listEventsForDay(day) {
  if (!eventsBackendAvailable) {
    return []
  }

  assertDay(day)
  await ensureAnonymousSupabaseSession()

  const { data: eventRows, error } = await supabase
    .from('events')
    .select('*')
    .eq('day', day)
    .order('start_time', { ascending: true })

  if (error) {
    if (disableEventsBackend(error)) {
      return []
    }

    throw error
  }

  const eventIds = (eventRows ?? []).map((event) => event.id).filter(Boolean)

  if (eventIds.length === 0) {
    return []
  }

  const { data: voteRows, error: voteError } = await supabase
    .from('event_votes')
    .select('event_id, user_id, vote')
    .in('event_id', eventIds)

  if (voteError) {
    if (disableEventsBackend(voteError)) {
      return (eventRows ?? []).map((event) => ({
        ...event,
        votes: {},
      }))
    }

    throw voteError
  }

  const votesByEventId = new Map()

  ;(voteRows ?? []).forEach((row) => {
    const currentVotes = votesByEventId.get(row.event_id) ?? {}
    currentVotes[row.user_id] = row.vote
    votesByEventId.set(row.event_id, currentVotes)
  })

  return (eventRows ?? []).map((event) => ({
    ...event,
    votes: votesByEventId.get(event.id) ?? {},
  }))
}

export async function voteOnEvent(eventId, userId, vote) {
  if (!eventsBackendAvailable) {
    return null
  }

  await ensureAnonymousSupabaseSession()

  const { data, error } = await supabase
    .from('event_votes')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        vote,
      },
      {
        onConflict: 'event_id,user_id',
      }
    )
    .select('*')
    .single()

  if (error) {
    if (disableEventsBackend(error)) {
      return null
    }

    throw error
  }

  return data
}

export async function deleteEvent(eventId) {
  if (!eventsBackendAvailable) {
    return false
  }

  await ensureAnonymousSupabaseSession()

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    if (disableEventsBackend(error)) {
      return false
    }

    throw error
  }

  return true
}

export async function subscribeToEventFeed({ day, onEventChange, onVoteChange }) {
  if (!eventsBackendAvailable) {
    return async () => {}
  }

  if (day) assertDay(day)

  await ensureAnonymousSupabaseSession()

  const channel = supabase.channel(day ? `trip:events:${day}` : 'trip:events:all')

  if (onEventChange) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        ...(day ? { filter: `day=eq.${day}` } : {}),
      },
      onEventChange
    )
  }

  if (onVoteChange) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'event_votes',
      },
      onVoteChange
    )
  }

  await new Promise((resolve, reject) => {
    let settled = false
    const timeoutId = globalThis.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('Timed out while subscribing to event updates.'))
    }, 10000)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (settled) return
        settled = true
        globalThis.clearTimeout(timeoutId)
        resolve()
        return
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (settled) return
        settled = true
        globalThis.clearTimeout(timeoutId)
        reject(new Error(`Event feed channel failed with status: ${status}.`))
      }
    })
  })

  return async () => {
    await supabase.removeChannel(channel)
  }
}

/*
Realtime usage:
- events INSERT payloads can drive a "User X added a new event" banner.
- event_votes changes can update live yes/no counts either by folding the
  payload into local state or by refetching the currently visible event list.

Scheduler sketch:
- Run a Supabase Edge Function or external cron every 5 minutes.
- Aggregate yes votes per event_id from public.event_votes.
- Mark pending events confirmed when yes_count >= 3.
- Mark pending events cancelled when start_time is within 1 hour and yes_count < 3.
*/
