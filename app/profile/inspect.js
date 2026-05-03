import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.log("No session found")
    return
  }
  console.log("Current User ID:", session.user.id)
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  
  if (error) {
    console.error("Error fetching profile:", error)
  } else {
    console.log("Profile Data:", profile)
  }
}

inspect()
