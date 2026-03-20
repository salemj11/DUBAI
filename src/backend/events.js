import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'

function assertDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('day must be a YYYY-MM-DD string.')
  }
}

export async function createEvent(input) {
  assertDay(input.day)
  await ensureAnonymousSupabaseSession()

  const { data, error } = await supabase
    .from('events')
    .insert({
      external_key: input.externalKey ?? null,
      day: input.day,
      start_time: input.startTime,
      end_time: input.endTime,
      category: input.category,
      subcategory: input.subcategory ?? null,
      place_id: input.placeId ?? null,
      place_name: input.placeName,
      created_by: input.createdBy,
      status: input.status ?? 'pending',
      locked: input.locked ?? false,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) throw error

  return data
}

export async function seedLockedTimelineEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return []
  }

  await ensureAnonymousSupabaseSession()

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

  if (error) throw error

  return data ?? []
}

export async function listEventsForDay(day) {
  assertDay(day)
  await ensureAnonymousSupabaseSession()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('day', day)
    .order('start_time', { ascending: true })

  if (error) throw error

  return data ?? []
}

export async function voteOnEvent(eventId, userId, vote) {
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

  if (error) throw error

  return data
}

export async function subscribeToEventFeed({ day, onEventChange, onVoteChange }) {
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
