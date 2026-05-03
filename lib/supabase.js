import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  "https://csjqzacwtonljgoptxjj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzanF6YWN3dG9ubGpnb3B0eGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5Nzc3NjMsImV4cCI6MjA5MTU1Mzc2M30.0g2Y623QPrN8fLG4Q6k8XIzYb7DD31B-fCDMFPsXoVw",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Prevents the "Lock broken by another request with the 'steal' option"
      // AbortError caused by competing browser tabs / fast reloads
      storageKey: "saha-events-auth",
      lock: (name, acquireTimeout, fn) => fn(),
    },
  }
)