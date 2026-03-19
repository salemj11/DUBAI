import { createClient } from '@supabase/supabase-js'

const isBrowser = typeof window !== 'undefined'

function readRequiredEnv(key) {
  const value = import.meta.env[key]

  if (!value) {
    throw new Error(
      `Missing ${key}. Add it to your local .env file and to your Vercel environment settings.`
    )
  }

  return value
}

export const supabase = createClient(
  readRequiredEnv('VITE_SUPABASE_URL'),
  readRequiredEnv('VITE_SUPABASE_ANON_KEY'),
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      storageKey: 'dubai-weekend-trip.supabase.auth',
    },
    global: {
      headers: {
        'x-client-info': 'dubai-weekend-trip-web',
      },
    },
  }
)

let anonymousSessionPromise = null

export async function ensureAnonymousSupabaseSession() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (session) return

  if (!anonymousSessionPromise) {
    anonymousSessionPromise = supabase.auth
      .signInAnonymously()
      .then(({ error }) => {
        if (error) {
          throw new Error(
            'Supabase anonymous sign-ins must be enabled because this app expects authenticated browser sessions for RLS-protected tables.'
          )
        }
      })
      .finally(() => {
        anonymousSessionPromise = null
      })
  }

  await anonymousSessionPromise
}
