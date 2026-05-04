"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import NavBar from "@/components/NavBar"
import { useTheme } from "@/components/ThemeContext"
import { EyeIcon, EyeOffIcon } from "@/components/Icons"

export default function ProfilePage() {
  const { t, bg, bgCard, border, text, textMuted, accent, accentGlow, dark, toggleDark, lang, setLang } = useTheme()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("account")
  const [profileData, setProfileData] = useState(null)
  const [receiptModal, setReceiptModal] = useState(null)
  const [settingsTab, setSettingsTab] = useState("public")
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editGender, setEditGender] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null
  const [saveMessage, setSaveMessage] = useState("")
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const pendingColor = "#d97706"
  const confirmedColor = "#16a34a"
  const cancelledColor = "#dc2626"

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/login"); return }
    setUser(session.user)
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()
    
    let activeProfile = profile
    
    // SAFETY NET: If profile is missing, create it now
    if (!profile || profileError) {
      console.log("Profile missing, creating fallback...")
      const { data: newProfile } = await supabase.from("profiles").upsert({
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.email.split("@")[0],
        full_name: session.user.email.split("@")[0],
        role: "user"
      }).select().single()
      activeProfile = newProfile
    }

    setIsAdmin(activeProfile?.role === "admin")
    setProfileData(activeProfile)
    setEditDisplayName(activeProfile?.display_name || activeProfile?.full_name || "")
    setEditUsername(activeProfile?.username || "")
    setEditLocation(activeProfile?.user_location || activeProfile?.location || activeProfile?.city || "")
    setEditGender(activeProfile?.gender || "")
    const { data: bookingsData, error } = await supabase
      .from("bookings")
      .select("id, user_id, venue_id, start_date, end_date, total_price, status, file_url, payment_receipt_url")
      .eq("user_id", session.user.id)
    if (error) { console.error(error.message); setLoading(false); return }
    if (!bookingsData?.length) { setBookings([]); setLoading(false); return }
    const enriched = await Promise.all(bookingsData.map(async (b) => {
      const { data: venue } = await supabase.from("venues").select("name, brand, price_per_day").eq("id", b.venue_id).single()
      let receiptUrl = null
      if (b.payment_receipt_url) {
        const { data: urlData } = supabase.storage.from("payment receipt").getPublicUrl(b.payment_receipt_url)
        receiptUrl = urlData?.publicUrl || null
      }
      return { ...b, venue: venue || {}, receiptUrl }
    }))
    setBookings(enriched)
    setLoading(false)
  }

  async function logout() { await supabase.auth.signOut(); router.push("/") }

  async function handleSaveProfile() {
    setSaving(true)
    const updates = {}
    
    // Dynamically filter updates based on which columns actually exist in the database
    const existingKeys = Object.keys(profileData || {})
    
    // Check name columns
    if (existingKeys.includes('display_name')) updates.display_name = editDisplayName
    if (existingKeys.includes('full_name')) updates.full_name = editDisplayName
    
    // Check location columns
    if (existingKeys.includes('location')) updates.location = editLocation
    if (existingKeys.includes('user_location')) updates.user_location = editLocation
    if (existingKeys.includes('city')) updates.city = editLocation
    
    // Always include these basic ones
    if (existingKeys.includes('username')) updates.username = editUsername
    if (existingKeys.includes('gender')) updates.gender = editGender
    
    // Final safety: Remove any keys that aren't in the database to prevent crashes
    Object.keys(updates).forEach(key => {
      if (!existingKeys.includes(key) && key !== 'id') delete updates[key]
    })

    const { error, count } = await supabase
      .from("profiles")
      .update(updates, { count: 'exact' })
      .eq("id", user.id)
    
    setSaving(false)
    if (error) {
      setSaveStatus("error")
      setSaveMessage("Error: " + error.message)
    } else if (count === 0) {
      setSaveStatus("error")
      setSaveMessage("No profile row found to update. Try refreshing.")
    } else {
      setProfileData(prev => ({ ...prev, ...updates }))
      setSaveStatus("success")
      setSaveMessage("Profile updated successfully!")
      setTimeout(() => { setSaveStatus(null); setSaveMessage("") }, 3000)
    }
  }

  async function handleUpdatePassword() {
    if (!newPassword || !confirmPassword) {
      setSaveStatus("error")
      setSaveMessage("Please fill in all fields")
      return
    }
    if (newPassword !== confirmPassword) {
      setSaveStatus("error")
      setSaveMessage("Passwords do not match")
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) {
      setSaveStatus("error")
      setSaveMessage(error.message)
    } else {
      setSaveStatus("success")
      setSaveMessage("Password updated successfully!")
      setNewPassword("")
      setConfirmPassword("")
      setCurrentPassword("")
      setTimeout(() => { setSaveStatus(null); setSaveMessage("") }, 3000)
    }
  }

  function statusColor(s) {
    if (s === "confirmed") return confirmedColor
    if (s === "cancelled") return cancelledColor
    return pendingColor
  }
  function statusLabel(s) {
    if (s === "confirmed") return t.confirmed
    if (s === "cancelled") return t.cancelled
    return t.pending
  }
  function isImage(url) {
    if (!url) return false
    const ext = url.split("?")[0].split(".").pop().toLowerCase()
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
  }

  const totalBookings = bookings.length
  const pendingCount = bookings.filter(b => b.status === "pending").length
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length
  const memberSince = user ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : ""
  const displayName = profileData?.display_name || profileData?.full_name || user?.user_metadata?.first_name || user?.email?.split("@")[0] || ""
  const userLocation = profileData?.user_location || profileData?.location || profileData?.city || profileData?.address || ""
  const initials = (displayName || user?.email || "?").slice(0, 2).toUpperCase()

  const navItems = [
    { key: "account", icon: "👤", label: t.navitem_account },
    { key: "bookings", icon: "📅", label: t.my_bookings },
    { key: "receipts", icon: "🧾", label: t.navitem_receipts },
    { key: "settings", icon: "⚙️", label: t.navitem_settings },
  ]

  if (loading) return (
    <div style={{ minHeight: "100vh", background: bg }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
        <p style={{ color: textMuted }}>{t.loading}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: bg }}>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          width: 260, flexShrink: 0,
          background: bgCard, borderRadius: 20,
          borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
          borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
          padding: "24px 16px", position: "sticky", top: 80,
        }}>
          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px 20px", borderBottom: `1px solid ${border}`, marginBottom: 12 }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 12px ${accent}44`,
              overflow: "hidden", border: `2px solid #fff`
            }}>
              <img 
                src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${user?.email}${editGender === 'female' ? '_f' : '_m'}&mood[]=happy`} 
                alt="Avatar" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayName}
              </p>
              <p style={{ fontSize: 11, color: textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ color: accent, fontSize: 10 }}>📍</span>
                {userLocation || t.location_not_set || "Location not set"}
              </p>
            </div>
          </div>



          {/* Nav items */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)} 
                className={activeTab === item.key ? "btn-glow" : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 12,
                  background: activeTab === item.key ? `linear-gradient(135deg, ${accent}, #b8943c)` : "transparent",
                  color: activeTab === item.key ? "#fff" : textMuted,
                  fontSize: 14, fontWeight: activeTab === item.key ? 600 : 400,
                  border: "none", cursor: "pointer", textAlign: "left",
                  transition: "all 0.28s ease",
                  boxShadow: activeTab === item.key ? `0 4px 15px ${accentGlow}` : "none",
                }}
                onMouseEnter={e => { if (activeTab !== item.key) e.currentTarget.style.color = text }}
                onMouseLeave={e => { if (activeTab !== item.key) e.currentTarget.style.color = textMuted }}
              >
                <span style={{ fontSize: 16, filter: activeTab === item.key ? "brightness(0) invert(1)" : "none" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            {/* Admin Panel button */}
            {isAdmin && (
              <button onClick={() => router.push("/admin")} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 12,
                background: accent + "15",
                borderTop: `1px solid ${accent}33`, borderRight: `1px solid ${accent}33`,
                borderBottom: `1px solid ${accent}33`, borderLeft: `1px solid ${accent}33`,
                color: accent, fontSize: 14, fontWeight: 600,
                cursor: "pointer", textAlign: "left", marginTop: 4,
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = accent + "25" }}
                onMouseLeave={e => { e.currentTarget.style.background = accent + "15" }}
              >
                <span style={{ fontSize: 16 }}>🛡</span>
                {t.admin_panel_btn}
                <span style={{
                  marginLeft: "auto", background: accent, color: "#fff",
                  borderRadius: 999, padding: "2px 8px", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.05em",
                }}>ADMIN</span>
              </button>
            )}

            {/* Logout */}
            <button onClick={logout} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 14px", borderRadius: 12, marginTop: 8,
              background: "transparent", color: textMuted,
              fontSize: 14, fontWeight: 400,
              border: "none", cursor: "pointer", textAlign: "left",
              borderTop: `1px solid ${border}`,
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { 
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"
                e.currentTarget.style.color = "#ef4444"
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = textMuted
              }}
            >
              <span style={{ fontSize: 16 }}>🚪</span>
              {t.logout}
            </button>
          </nav>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── ACCOUNT TAB ── */}
          {activeTab === "account" && (
            <div style={{ background: bgCard, borderRadius: 20, borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, padding: "32px 36px" }}>
              {/* Welcome */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, color: text, marginBottom: 6 }}>
                    {t.welcome_back_msg}, <em style={{ color: accent, fontStyle: "normal" }}>{displayName}</em>
                  </h1>
                  <p style={{ fontSize: 14, color: textMuted }}>{t.account_overview}</p>
                </div>
                <button onClick={() => setActiveTab("bookings")} style={{
                  padding: "10px 22px", borderRadius: 999,
                  background: accent, color: "#fff",
                  fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  boxShadow: `0 4px 16px ${accent}44`, whiteSpace: "nowrap",
                }}>{t.browse}</button>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  { icon: "📋", value: totalBookings, label: t.total_bookings, color: accent },
                  { icon: "✅", value: confirmedCount, label: t.confirmed, color: confirmedColor },
                  { icon: "⏳", value: pendingCount, label: t.pending, color: pendingColor },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: "20px 24px", borderRadius: 16,
                    borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
                    borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
                    background: s.color + "0a",
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Upcoming bookings */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Upcoming */}
                <div style={{ borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: text }}>{t.booking_history}</p>
                    <button onClick={() => setActiveTab("bookings")} style={{ fontSize: 12, color: accent, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>{t.view_all_link}</button>
                  </div>
                  {bookings.slice(0, 3).map((b, i) => (
                    <div key={b.id} style={{ padding: "14px 20px", borderBottom: i < Math.min(bookings.length, 3) - 1 ? `1px solid ${border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: text, marginBottom: 3 }}>{b.venue?.name}</p>
                        <p style={{ fontSize: 12, color: textMuted }}>📍 {b.venue?.brand}</p>
                      </div>
                      {b.start_date && <p style={{ fontSize: 12, color: textMuted, whiteSpace: "nowrap" }}>{new Date(b.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
                    </div>
                  ))}
                  {bookings.length === 0 && <p style={{ padding: "20px", color: textMuted, fontSize: 13 }}>{t.no_bookings}</p>}
                </div>

                {/* Member info */}
                <div style={{ borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, borderRadius: 16, padding: "20px" }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 16 }}>{t.account_info}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t.display_name}</p>
                      <p style={{ fontSize: 13, color: text }}>{displayName}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t.location_label || "Location"}</p>
                      <p style={{ fontSize: 13, color: text }}>{userLocation || "Not set"}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t.email}</p>
                      <p style={{ fontSize: 13, color: text }}>{user?.email}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t.member_since}</p>
                      <p style={{ fontSize: 13, color: accent, fontWeight: 600 }}>{memberSince}</p>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t.role_label}</p>
                      <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: isAdmin ? accent : accent + "18", color: isAdmin ? "#fff" : accent }}>{isAdmin ? "ADMIN" : "USER"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BOOKINGS TAB ── */}
          {activeTab === "bookings" && (
            <div style={{ background: bgCard, borderRadius: 20, borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, overflow: "hidden" }}>
              <div style={{ padding: "24px 32px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: text, marginBottom: 4 }}>{t.my_bookings}</h2>
                  <p style={{ fontSize: 13, color: textMuted }}>{t.bookings_sub}</p>
                </div>
                <span style={{ fontSize: 12, color: textMuted }}>{totalBookings} {t.total_label}</span>
              </div>
              {bookings.length === 0 ? (
                <div style={{ padding: "60px 32px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 12 }}>📋</div>
                  <p style={{ color: textMuted }}>{t.no_bookings} <a href="/venues" style={{ color: accent, textDecoration: "none", fontWeight: 600 }}>{t.browse_venues_link}</a></p>
                </div>
              ) : bookings.map((b, i) => {
                const color = statusColor(b.status)
                return (
                  <div key={b.id} style={{ padding: "18px 32px", borderBottom: i < bookings.length - 1 ? `1px solid ${border}` : "none", borderLeft: `4px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}66` }} />
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 3 }}>{b.venue?.name}</p>
                        <p style={{ fontSize: 12, color: textMuted }}>📍 {b.venue?.brand}</p>
                        {b.start_date && (
                          <p style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                            📅 {new Date(b.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                            {b.end_date && b.end_date !== b.start_date && ` - ${new Date(b.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, textTransform: "uppercase", background: color + "18", color }}>{b.status === "pending" ? t.awaiting : statusLabel(b.status)}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>{(b.total_price || b.venue?.price_per_day)?.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: textMuted }}>DA</span></span>
                      {b.receiptUrl && <button onClick={() => setReceiptModal({ url: b.receiptUrl, name: b.venue?.name })} style={{ padding: "5px 12px", borderRadius: 999, background: accent + "18", color: accent, fontSize: 11, fontWeight: 600, borderTop: `1px solid ${accent}44`, borderRight: `1px solid ${accent}44`, borderBottom: `1px solid ${accent}44`, borderLeft: `1px solid ${accent}44`, cursor: "pointer" }}>{t.view_receipt}</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── RECEIPTS TAB ── */}
          {activeTab === "receipts" && (
            <div style={{ background: bgCard, borderRadius: 20, borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, overflow: "hidden" }}>
              <div style={{ padding: "24px 32px", borderBottom: `1px solid ${border}` }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: text, marginBottom: 4 }}>{t.navitem_receipts}</h2>
                <p style={{ fontSize: 13, color: textMuted }}>{t.receipts_sub}</p>
              </div>
              {bookings.filter(b => b.receiptUrl).length === 0 ? (
                <div style={{ padding: "60px 32px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 12 }}>🧾</div>
                  <p style={{ color: textMuted }}>{t.no_receipts}</p>
                </div>
              ) : bookings.filter(b => b.receiptUrl).map((b, i, arr) => (
                <div key={b.id} style={{ padding: "18px 32px", borderBottom: i < arr.length - 1 ? `1px solid ${border}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 3 }}>{b.venue?.name}</p>
                    {b.start_date && (
                      <p style={{ fontSize: 12, color: textMuted }}>
                        📅 {new Date(b.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        {b.end_date && b.end_date !== b.start_date && ` - ${new Date(b.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setReceiptModal({ url: b.receiptUrl, name: b.venue?.name })} style={{ padding: "8px 18px", borderRadius: 999, background: accent + "18", color: accent, fontSize: 12, fontWeight: 600, borderTop: `1px solid ${accent}44`, borderRight: `1px solid ${accent}44`, borderBottom: `1px solid ${accent}44`, borderLeft: `1px solid ${accent}44`, cursor: "pointer" }}>📄 {t.view_receipt}</button>
                </div>
              ))}
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === "settings" && (
            <div style={{ background: bgCard, borderRadius: 20, borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, padding: "32px 36px" }}>
              {/* Header */}
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, color: text, marginBottom: 4 }}>{t.settings_heading}</h2>
              <p style={{ fontSize: 13, color: textMuted, marginBottom: 28 }}>{t.settings_sub}</p>

              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
                {[
                  { key: "public", label: t.public_info_tab },
                  { key: "security", label: t.security_tab },
                  { key: "preferences", label: t.preferences_tab },
                ].map(st => (
                  <button key={st.key} onClick={() => setSettingsTab(st.key)} 
                    className={settingsTab === st.key ? "btn-glow" : ""}
                    style={{
                      padding: "9px 20px", borderRadius: 999,
                      background: settingsTab === st.key ? `linear-gradient(135deg, ${accent}, #b8943c)` : "transparent",
                      color: settingsTab === st.key ? "#fff" : textMuted,
                      fontSize: 13, fontWeight: settingsTab === st.key ? 600 : 400,
                      border: "none", cursor: "pointer", transition: "all 0.18s",
                      boxShadow: settingsTab === st.key ? `0 2px 10px ${accentGlow}` : "none",
                    }}
                    onMouseEnter={e => { if (settingsTab !== st.key) e.currentTarget.style.color = text }}
                    onMouseLeave={e => { if (settingsTab !== st.key) e.currentTarget.style.color = textMuted }}
                  >{st.label}</button>
                ))}
              </div>

              {/* ── PUBLIC INFORMATION ── */}
              {settingsTab === "public" && (
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: text, marginBottom: 4 }}>{t.public_info}</h3>
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 6, letterSpacing: "0.04em" }}>{t.display_name}</label>
                      <input value={editDisplayName || ""} onChange={e => setEditDisplayName(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg, color: text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 6, letterSpacing: "0.04em" }}>{t.username_label}</label>
                      <input value={editUsername || ""} onChange={e => setEditUsername(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg, color: text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 6, letterSpacing: "0.04em" }}>{t.location_label}</label>
                      <input value={editLocation || ""} onChange={e => setEditLocation(e.target.value)} placeholder="Algiers, Algeria" style={{ width: "100%", padding: "11px 14px", borderRadius: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg, color: text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 6, letterSpacing: "0.04em" }}>{t.email}</label>
                      <input defaultValue={user?.email} disabled style={{ width: "100%", padding: "11px 14px", borderRadius: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg, color: textMuted, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none", opacity: 0.7 }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 8, letterSpacing: "0.04em" }}>{t.gender_label}</label>
                    <div style={{ display: "flex", gap: 12 }}>
                      {["male", "female"].map(g => (
                        <button key={g} type="button" onClick={() => setEditGender(g)} style={{
                          flex: 1, maxWidth: 160, padding: "12px 16px", borderRadius: 12,
                          border: editGender === g ? "2px solid #fff" : `1px solid ${border}`,
                          background: editGender === g ? "rgba(255,255,255,0.22)" : "transparent",
                          cursor: "pointer", fontSize: 14, fontWeight: editGender === g ? 700 : 400,
                          color: editGender === g ? "#fff" : text,
                          fontFamily: "inherit", transition: "all 0.25s",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          boxShadow: editGender === g ? "0 0 35px rgba(255,255,255,0.4), 0 0 15px rgba(255,255,255,0.15) inset" : "none",
                        }}>
                          <span style={{ fontSize: 18 }}>{g === "male" ? "♂" : "♀"}</span>
                          {g === "male" ? t.male : t.female}
                        </button>
                      ))}
                    </div>
                  </div>

                  {saveStatus && (
                    <div className="fade-up" style={{ 
                      fontSize: 13, 
                      color: saveStatus === "success" ? "#10b981" : "#ef4444", 
                      marginBottom: 16,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      {saveStatus === "success" ? "✓" : "✗"} {saveMessage}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button onClick={handleSaveProfile} disabled={saving} className="btn-glow" style={{ 
                      padding: "11px 24px", borderRadius: 999, 
                      background: `linear-gradient(135deg, ${accent}, #b8943c)`, 
                      color: "#fff", fontSize: 13, fontWeight: 600, border: "none", 
                      cursor: saving ? "default" : "pointer", boxShadow: `0 4px 14px ${accentGlow}`,
                      opacity: saving ? 0.7 : 1
                    }}>{saving ? t.saving || "Saving..." : t.save_changes}</button>
                    <button onClick={() => {
                      setEditDisplayName(profileData?.display_name || "")
                      setEditUsername(profileData?.username || "")
                      setEditLocation(profileData?.location || "")
                      setSettingsTab("public")
                    }} style={{ padding: "11px 24px", borderRadius: 999, background: "transparent", color: textMuted, fontSize: 13, fontWeight: 400, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, cursor: "pointer" }}>{t.cancel}</button>
                  </div>
                </div>
              )}

              {/* ── SECURITY ── */}
              {settingsTab === "security" && (
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: text, marginBottom: 4 }}>{t.security}</h3>
                  <p style={{ fontSize: 13, color: textMuted, marginBottom: 28 }}>{t.security_sub}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
                    <div>
                      <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 6 }}>{t.current_password}</label>
                      <div style={{ position: "relative", maxWidth: 340 }}>
                        <input type={showCurrentPass ? "text" : "password"} value={currentPassword || ""} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "11px 14px", paddingRight: 44, borderRadius: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg, color: text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                        <button type="button" onClick={() => setShowCurrentPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = text} onMouseLeave={e => e.currentTarget.style.color = textMuted}>{showCurrentPass ? <EyeOffIcon /> : <EyeIcon />}</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 680 }}>
                      <div>
                        <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 6 }}>{t.new_password}</label>
                        <div style={{ position: "relative" }}>
                          <input type={showNewPass ? "text" : "password"} value={newPassword || ""} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "11px 14px", paddingRight: 44, borderRadius: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg, color: text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                          <button type="button" onClick={() => setShowNewPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = text} onMouseLeave={e => e.currentTarget.style.color = textMuted}>{showNewPass ? <EyeOffIcon /> : <EyeIcon />}</button>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 6 }}>{t.confirm_new_password}</label>
                        <div style={{ position: "relative" }}>
                          <input type={showConfirmPass ? "text" : "password"} value={confirmPassword || ""} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "11px 14px", paddingRight: 44, borderRadius: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg, color: text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                          <button type="button" onClick={() => setShowConfirmPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = text} onMouseLeave={e => e.currentTarget.style.color = textMuted}>{showConfirmPass ? <EyeOffIcon /> : <EyeIcon />}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {saveStatus && (
                    <div className="fade-up" style={{ 
                      fontSize: 13, 
                      color: saveStatus === "success" ? "#10b981" : "#ef4444", 
                      marginBottom: 16,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      {saveStatus === "success" ? "✓" : "✗"} {saveMessage}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                    <button onClick={handleUpdatePassword} disabled={saving} className="btn-glow" style={{ 
                      padding: "11px 24px", borderRadius: 999, 
                      background: `linear-gradient(135deg, ${accent}, #b8943c)`, 
                      color: "#fff", fontSize: 13, fontWeight: 600, border: "none", 
                      cursor: saving ? "default" : "pointer", boxShadow: `0 4px 14px ${accentGlow}`,
                      opacity: saving ? 0.7 : 1
                    }}>{saving ? t.saving || "Saving..." : t.save_changes}</button>
                    <button onClick={() => {
                      setCurrentPassword("")
                      setNewPassword("")
                      setConfirmPassword("")
                      setSettingsTab("public")
                    }} style={{ padding: "11px 24px", borderRadius: 999, background: "transparent", color: textMuted, fontSize: 13, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, cursor: "pointer" }}>{t.cancel}</button>
                  </div>

                </div>
              )}

              {/* ── PREFERENCES ── */}
              {settingsTab === "preferences" && (
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: text, marginBottom: 4 }}>{t.preferences_heading}</h3>
                  <p style={{ fontSize: 13, color: textMuted, marginBottom: 28 }}>{t.preferences_sub}</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 14, border: `1px solid ${border}` }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 2 }}>{t.dark_mode || "Dark Mode"}</p>
                        <p style={{ fontSize: 12, color: textMuted }}>Toggle the high-contrast dark interface</p>
                      </div>
                      <button onClick={toggleDark} style={{ width: 44, height: 24, borderRadius: 999, background: dark ? accent : border, position: "relative", border: "none", cursor: "pointer", transition: "0.3s" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: dark ? 23 : 3, transition: "0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 14, border: `1px solid ${border}` }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 2 }}>{t.language || "Language"}</p>
                        <p style={{ fontSize: 12, color: textMuted }}>Select your preferred browsing language</p>
                      </div>
                      <select value={lang} onChange={e => setLang(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, background: bg, color: text, border: `1px solid ${border}`, fontSize: 13, outline: "none" }}>
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                        <option value="ar">العربية</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div onClick={() => setReceiptModal(null)} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bgCard, borderRadius: 20, borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{t.payment_receipt}</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: text }}>{receiptModal.name}</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <a href={receiptModal.url} download style={{ padding: "7px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: accent + "18", color: accent, textDecoration: "none", borderTop: `1px solid ${accent}44`, borderRight: `1px solid ${accent}44`, borderBottom: `1px solid ${accent}44`, borderLeft: `1px solid ${accent}44` }}>{t.download_btn}</a>
                <button onClick={() => setReceiptModal(null)} style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, color: textMuted, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {isImage(receiptModal.url)
                ? <img src={receiptModal.url} alt="Receipt" style={{ width: "100%", borderRadius: 12, display: "block" }} />
                : <iframe src={receiptModal.url} title="Receipt" style={{ width: "100%", height: 500, border: "none", borderRadius: 12 }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}