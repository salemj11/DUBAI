import { ensureAnonymousSupabaseSession, supabase } from '../supabase.js'

function normalizeCategory(category) {
  return ['food', 'chill', 'activity'].includes(category) ? category : 'food'
}

export async function listCustomPlaces() {
  await ensureAnonymousSupabaseSession()

  const { data, error } = await supabase
    .from('custom_places')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    const message = String(error.message || '')

    if (message.includes('schema cache') || message.includes('custom_places')) {
      return []
    }

    throw error
  }

  return data ?? []
}

export async function submitCustomPlaceSuggestion(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''
  const area = typeof input?.area === 'string' ? input.area.trim() : ''
  const notes = typeof input?.notes === 'string' ? input.notes.trim() : ''
  const submittedBy = typeof input?.submittedBy === 'string' ? input.submittedBy.trim() : 'unknown'

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

  if (error) throw error

  return data
}
