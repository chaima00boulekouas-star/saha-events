"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import NavBar from "@/components/NavBar"
import { useTheme } from "@/components/ThemeContext"

const VENUE_PHOTOS = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80",
  "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1600&q=80",
  "https://images.unsplash.com/photo-1561912774-79769a0a0a7a?w=1600&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80",
]

const ALGERIAN_CITIES = [
  "Alger Centre, Alger", "Sidi Yahia, Alger", "Oran",
  "Constantine", "Tlemcen", "Annaba", "Blida", "Sétif",
]

export default function VenueDetailsPage({ params }) {
  const unwrappedParams = use(params)
  const id = unwrappedParams.id
  const router = useRouter()
  const { t, bg, bgCard, border, text, textMuted, accent, accentGlow, dark, isRTL, glassCard, glassBorder, glassFilter, cardShadow, lang } = useTheme()
  const headingFont = lang === "ar" ? "'Amiri','Tajawal',serif" : "'Playfair Display',serif"
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [date, setDate] = useState("")
  const [file, setFile] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const today = new Date().toISOString().split("T")[0]
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    getVenue()
  }, [id])

  async function getVenue() {
    const { data, error } = await supabase.from("venues").select("*").eq("id", id).single()
    if (error) {
      console.error(error)
      router.push("/venues")
      return
    }
    setVenue(data)
    setLoading(false)
  }

  async function handleBook() {
    setErrorMsg("")
    setSuccessMsg("")

    if (!user) {
      router.push("/login")
      return
    }

    if (!date) {
      setErrorMsg(t.select_date_alert || "Please select a date.")
      return
    }

    if (!file) {
      setErrorMsg(t.receipt_label || "Please upload a payment receipt.")
      return
    }

    setBookingLoading(true)

    // Check availability
    const { data: existingBookings, error: checkError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("venue_id", id)
      .eq("date", date)
      .neq("status", "cancelled")

    if (checkError) {
      setErrorMsg("Error checking availability: " + checkError.message)
      setBookingLoading(false)
      return
    }

    if (existingBookings && existingBookings.length > 0) {
      setErrorMsg(t.date_taken)
      setBookingLoading(false)
      return
    }

    // Upload receipt
    const fileName = `${user.id}-${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase
      .storage.from("payment receipt").upload(fileName, file)

    if (uploadError) {
      setErrorMsg("Upload failed: " + uploadError.message)
      setBookingLoading(false)
      return
    }

    // Insert booking
    const { error: insertError } = await supabase.from("bookings").insert({
      user_id: user.id,
      venue_id: id,
      status: "pending",
      date: date,
      payment_receipt_url: uploadData.path,
    })

    setBookingLoading(false)

    if (insertError) {
      setErrorMsg("Booking failed: " + insertError.message)
    } else {
      setSuccessMsg(t.booked_success)
      setDate("")
      setFile(null)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg }}>
        <NavBar />
        <div style={{ padding: "100px", textAlign: "center", color: textMuted }}>{t.loading || "Loading..."}</div>
      </div>
    )
  }

  const photo = VENUE_PHOTOS[(venue.id || 0) % VENUE_PHOTOS.length]
  const city = venue.location || ALGERIAN_CITIES[(venue.id || 0) % ALGERIAN_CITIES.length]

  return (
    <div style={{ minHeight: "100vh", background: bg, paddingBottom: 100 }}>
      <NavBar />

      {/* Hero Header */}
      <div style={{ position: "relative", height: "55vh", overflow: "hidden", marginTop: -12 }}>
        <img src={photo} alt={venue.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div className="venue-img-overlay" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 52px", maxWidth: 1200, margin: "0 auto" }}>
          <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", padding: "4px 12px", borderRadius: 999, fontSize: 12, color: "#fff", fontWeight: 600 }}>
              {city}
            </span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{venue.brand}</span>
          </div>
          <h1 className="fade-up fade-up-delay-1" style={{ fontSize: 48, fontWeight: 500, color: "#fff", fontFamily: headingFont, textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
            {venue.name}
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 52px", display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Main Details */}
        <div className="fade-up fade-up-delay-2" style={{ flex: "1 1 600px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: text, marginBottom: 20 }}>{t.description}</h2>
          <p style={{ fontSize: 15, color: textMuted, lineHeight: 1.8, marginBottom: 30 }}>
            {venue.description || t.premium_desc}
          </p>

          <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
            {["VIP Lounge", "Catering", "Parking", "Sound System"].map(amenity => (
              <div key={amenity} style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                padding: "8px 16px", borderRadius: 999, fontSize: 13, color: text,
                display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ color: accent }}>✦</span> {t[amenity.toLowerCase().replace(/ /g, "_")] || amenity}
              </div>
            ))}
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className={`fade-up fade-up-delay-3 glass-card${dark ? " glass-card-dark" : ""}`} style={{ flex: "1 1 350px", position: "sticky", top: 100, padding: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: text }}>{venue.price_per_day?.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: textMuted }}> {t.da_day || "DA / day"}</span>
            </div>

            {errorMsg && <div style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 20 }}>{errorMsg}</div>}
            {successMsg && <div style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 20 }}>{successMsg}</div>}

            {!user ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 14, color: textMuted, marginBottom: 16 }}>{t.login_to_book}</p>
                <button onClick={() => router.push("/login")} className="btn-glow" style={{
                  width: "100%", padding: "14px 0", borderRadius: 999, background: accent, color: "#fff",
                  fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", boxShadow: `0 4px 20px ${accentGlow}`
                }}>
                  {t.signin_btn_cta}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.select_date}</label>
                  <input type="date" className={`input-glass${dark ? " input-glass-dark" : ""}`} min={today} value={date} onChange={e => setDate(e.target.value)} style={{
                    width: "100%", padding: "12px 16px",
                    color: text, outline: "none", transition: "border-color 0.2s"
                  }} />
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.receipt_label}</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} style={{
                    width: "100%", padding: "10px", fontSize: 13, color: textMuted
                  }} />
                </div>

                <button onClick={handleBook} disabled={bookingLoading} className="btn-glow" style={{
                  width: "100%", padding: "14px 0", borderRadius: 999, background: accent, color: "#fff",
                  fontSize: 14, fontWeight: 600, border: "none", cursor: bookingLoading ? "default" : "pointer",
                  opacity: bookingLoading ? 0.7 : 1, boxShadow: `0 4px 20px ${accentGlow}`
                }}>
                  {bookingLoading ? t.confirm_loading : t.confirm_btn}
                </button>
              </div>
            )}
        </div>

      </div>
    </div>
  )
}
