import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'

let customPlacesBackendAvailable = true

function normalizeCategory(category) {
  return ['food', 'chill', 'activity'].includes(category) ? category : 'food'
}

function trimString(value, maxLength = 200) {
  if (typeof value !== 'string') return ''

  return value.trim().slice(0, maxLength)
}

function isMissingCustomPlacesBackend(error) {
  const code = String(error?.code ?? '')
  const status = Number(error?.status ?? error?.statusCode ?? 0)
  const message = String(error?.message ?? '').toLowerCase()
  const details = String(error?.details ?? '').toLowerCase()
  const hint = String(error?.hint ?? '').toLowerCase()
  const combined = `${message} ${details} ${hint}`

  return (
    code === 'PGRST205'
    || status === 404
    || combined.includes('custom_places')
    || combined.includes('schema cache')
  )
}

function disableCustomPlacesBackend(error) {
  if (!isMissingCustomPlacesBackend(error)) {
    return false
  }

  customPlacesBackendAvailable = false
  return true
}

export async function listCustomPlaces() {
  if (!customPlacesBackendAvailable) {
    return []
  }

  await ensureAnonymousSupabaseSession()

  const { data, error } = await supabase
    .from('custom_places')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    if (disableCustomPlacesBackend(error)) {
      return []
    }

    throw error
  }

  return data ?? []
}

export async function submitCustomPlaceSuggestion(input) {
  if (!customPlacesBackendAvailable) {
    throw new Error('Custom place submissions are not available right now.')
  }

  const name = trimString(input?.name, 120)
  const area = trimString(input?.area, 120)
  const notes = trimString(input?.notes, 400)
  const submittedBy = trimString(input?.submittedBy, 80) || 'unknown'

  if (!name) {
    throw new Error('Place name is required.')
  }

  await ensureAnonymousSupabaseSession()

  const { data, error } = await supabase
    .from('custom_places')
    .insert({
      name,
      category: normalizeCategory(input?.category),
      area: area || null,
      notes: notes || null,
      submitted_by: submittedBy,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) {
    if (disableCustomPlacesBackend(error)) {
      throw new Error('Custom place submissions are not available right now.')
    }

    throw error
  }

  return data
}
