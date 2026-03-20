import { useCallback, useEffect, useState } from 'react'

import {
  isEventsBackendAvailable,
  listEventsForDay,
  seedLockedTimelineEvents,
  subscribeToEventFeed,
} from '../backend/events.js'
import {
  TRIP_DAYS,
  getLockedTimelineEvents,
  getLockedTimelineSeedInputs,
  getTimelineDays,
  mergeTimelineEvents,
} from '../data/tripData.js'

const FALLBACK_EVENTS = getLockedTimelineEvents()

export function useTimeline(enabled = true) {
  const [timelineEvents, setTimelineEvents] = useState(FALLBACK_EVENTS)
  const [timelineSource, setTimelineSource] = useState('fallback')

  const refreshTimeline = useCallback(async () => {
    const results = await Promise.allSettled(
      TRIP_DAYS.map(({ day }) => listEventsForDay(day))
    )

    const rejected = results.find((result) => result.status === 'rejected')

    if (rejected) {
      throw rejected.reason
    }

    if (!isEventsBackendAvailable()) {
      setTimelineEvents(FALLBACK_EVENTS)
      setTimelineSource('fallback')
      return FALLBACK_EVENTS
    }

    const remoteEvents = results.flatMap((result) => result.value ?? [])
    const mergedEvents = mergeTimelineEvents(remoteEvents)

    setTimelineEvents(mergedEvents)
    setTimelineSource('live')

    return mergedEvents
  }, [])

  useEffect(() => {
    let isMounted = true
    let unsubscribe = null

    if (!enabled) {
      return () => {
        isMounted = false
      }
    }

    async function boot() {
      setTimelineEvents(FALLBACK_EVENTS)

      try {
        await seedLockedTimelineEvents(getLockedTimelineSeedInputs())

        if (!isMounted) return

        await refreshTimeline()

        unsubscribe = await subscribeToEventFeed({
          onEventChange: () => {
            if (!isMounted) return

            void refreshTimeline().catch((error) => {
              console.warn('Failed to refresh the live timeline after an event update.', error)
            })
          },
          onVoteChange: () => {
            if (!isMounted) return

            void refreshTimeline().catch((error) => {
              console.warn('Failed to refresh the live timeline after a vote update.', error)
            })
          },
        })
      } catch (error) {
        if (!isMounted) return

        setTimelineSource('fallback')
        setTimelineEvents(FALLBACK_EVENTS)
        console.warn('Falling back to local locked timeline data.', error)
      }
    }

    void boot()

    return () => {
      isMounted = false

      if (typeof unsubscribe === 'function') {
        void unsubscribe()
      }
    }
  }, [enabled, refreshTimeline])

  const resolvedTimelineEvents = enabled ? timelineEvents : FALLBACK_EVENTS
  const resolvedTimelineSource = enabled ? timelineSource : 'fallback'

  return {
    timelineEvents: resolvedTimelineEvents,
    timelineDays: getTimelineDays(resolvedTimelineEvents),
    timelineSource: resolvedTimelineSource,
  }
}
