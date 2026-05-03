import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://csjqzacwtonljgoptxjj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzanF6YWN3dG9ubGpnb3B0eGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5Nzc3NjMsImV4cCI6MjA5MTU1Mzc2M30.0g2Y623QPrN8fLG4Q6k8XIzYb7DD31B-fCDMFPsXoVw"
)

async function run() {
  // Check if gender column exists by trying to read it
  const { data, error } = await supabase.from("profiles").select("gender").limit(1)
  if (error) {
    console.log("gender column does not exist yet. Please add it via Supabase dashboard:")
    console.log("1. Go to Table Editor > profiles")
    console.log("2. Click 'New Column'")
    console.log("3. Name: gender, Type: text, Default: null, Allow Nullable: yes")
    console.log("")
    console.log("Also add these columns if missing:")
    console.log("  - display_name (text, nullable)")
    console.log("  - username (text, nullable)")  
    console.log("  - user_location (text, nullable)")
  } else {
    console.log("gender column exists! Current data:", data)
  }

  // Also check display_name
  const { error: e2 } = await supabase.from("profiles").select("display_name").limit(1)
  if (e2) console.log("display_name column missing - please add it")
  else console.log("display_name column exists")

  const { error: e3 } = await supabase.from("profiles").select("username").limit(1)
  if (e3) console.log("username column missing - please add it")
  else console.log("username column exists")

  const { error: e4 } = await supabase.from("profiles").select("user_location").limit(1)
  if (e4) console.log("user_location column missing - please add it")
  else console.log("user_location column exists")
}

run()
