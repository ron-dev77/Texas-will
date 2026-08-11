import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  const missing = [
    ...(!supabaseUrl ? ['VITE_SUPABASE_URL'] : []),
    ...(!supabasePublishableKey ? ['VITE_SUPABASE_PUBLISHABLE_KEY'] : []),
  ]
  throw new Error(
    `Missing Supabase environment variable(s): ${missing.join(', ')}. Copy .env.example to .env.local and fill in your project keys.`,
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
})
