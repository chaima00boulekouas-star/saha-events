"use client"
 
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/ThemeContext"
 
export default function AdminPage() {
  const { bg, bgCard, border, text, textMuted, accent, t } = useTheme()
  const router = useRouter()
 
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState("dashboard")
 
  const [stats, setStats] = useState({ users: 0, venues: 0, bookings: 0, pending: 0, confirmed: 0 })
  const [venues, setVenues] = useState([])
  const [bookings, setBookings] = useState([])
  const [venueStats, setVenueStats] = useState({}) // { venueId: { total, pending, confirmed } }
  const [newVenue, setNewVenue] = useState({ name: "", brand: "", price_per_day: "" })
  const [addingVenue, setAddingVenue] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
 
  const pendingColor = "#d97706"
  const confirmedColor = "#16a34a"
  const cancelledColor = "#dc2626"
 
  useEffect(() => { init() }, [])
 
  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/login"); return }
 
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", session.user.id).single()
 
    if (!profile || profile.role !== "admin") {
      setIsAdmin(false); setLoading(false); return
    }
 
    setIsAdmin(true)
    await Promise.all([loadStats(), loadVenues(), loadBookings()])
    setLoading(false)
  }
 
  async function loadStats() {
    const [
      { count: userCount },
      { count: venueCount },
      { count: bookingCount },
      { count: pendingCount },
      { count: confirmedCount },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("venues").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
    ])
    setStats({
      users: userCount || 0,
      venues: venueCount || 0,
      bookings: bookingCount || 0,
      pending: pendingCount || 0,
      confirmed: confirmedCount || 0,
    })
  }
 
  async function loadVenues() {
    const { data } = await supabase.from("venues").select("*")
    const venueList = data || []
    setVenues(venueList)
 
    // Load booking counts per venue
    const { data: allBookings } = await supabase
      .from("bookings").select("venue_id, status")
 
    const vStats = {}
    venueList.forEach(v => {
      const vb = (allBookings || []).filter(b => b.venue_id === v.id)
      vStats[v.id] = {
        total: vb.length,
        pending: vb.filter(b => b.status === "pending").length,
        confirmed: vb.filter(b => b.status === "confirmed").length,
      }
    })
    setVenueStats(vStats)
  }
 
  async function loadBookings() {
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, user_id, venue_id, date, status, payment_receipt_url")
 
    if (!bookingsData) return
 
    const enriched = await Promise.all(
      bookingsData.map(async (b) => {
        const [{ data: venue }, { data: profile }] = await Promise.all([
          supabase.from("venues").select("name, brand").eq("id", b.venue_id).single(),
          supabase.from("profiles").select("email").eq("id", b.user_id).single(),
        ])
 
        let receiptUrl = null
        if (b.payment_receipt_url) {
          const { data: urlData } = supabase.storage
            .from("payment receipt").getPublicUrl(b.payment_receipt_url)
          receiptUrl = urlData?.publicUrl || null
        }
 
        return { ...b, venue: venue || {}, userEmail: profile?.email || "Unknown", receiptUrl }
      })
    )
    setBookings(enriched)
  }
 
  async function addVenue() {
    if (!newVenue.name || !newVenue.brand || !newVenue.price_per_day) { alert("Fill all fields"); return }
    setAddingVenue(true)
    const { error } = await supabase.from("venues").insert({
      name: newVenue.name, brand: newVenue.brand,
      price_per_day: parseInt(newVenue.price_per_day),
    })
    setAddingVenue(false)
    if (error) { alert("Error: " + error.message); return }
    setNewVenue({ name: "", brand: "", price_per_day: "" })
    await loadVenues(); await loadStats()
  }
 
  async function deleteVenue(id) {
    if (!confirm("Delete this venue? Related bookings will be affected.")) return
    const { error } = await supabase.from("venues").delete().eq("id", id)
    if (error) { alert("Error: " + error.message); return }
    await loadVenues(); await loadStats()
  }
 
  async function updateBookingStatus(bookingId, status) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId)
    if (error) { alert("Error: " + error.message); return }
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    await loadStats()
  }
 
  function statusColor(s) {
    if (s === "confirmed") return confirmedColor
    if (s === "cancelled") return cancelledColor
    return pendingColor
  }
 
  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`,
    borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`,
    background: bg, color: text, fontSize: 14,
    boxSizing: "border-box", fontFamily: "inherit", outline: "none",
  }
 
  const sidebarItems = [
    { key: "dashboard", icon: "📊", label: t.dashboard_label },
    { key: "venues", icon: "🏛", label: t.manage_venues_label },
    { key: "bookings", icon: "📋", label: t.bookings_label },
  ]
 
  const filteredBookings = filterStatus === "all"
    ? bookings
    : bookings.filter(b => b.status === filterStatus)
 
  if (loading) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: textMuted }}>{t.checking_permissions}</p>
    </div>
  )
 
  if (!isAdmin) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: text, marginBottom: 8 }}>{t.access_denied}</h2>
      <p style={{ color: textMuted, fontSize: 14, marginBottom: 24 }}>{t.access_denied_sub}</p>
      <button onClick={() => router.push("/")} style={{ padding: "10px 28px", borderRadius: 999, background: accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
        {t.go_home}
      </button>
    </div>
  )
 
  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex" }}>
 
      {/* ── SIDEBAR ── */}
      <div style={{
        width: 240, flexShrink: 0,
        background: bgCard,
        borderRight: `1px solid ${border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${border}` }}>
          <img src="/logo.png" alt="Saha Events"
            style={{ height: 36, filter: "invert(1)", opacity: 0.7, marginBottom: 8 }} />
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
            {t.admin_title}
          </div>
        </div>
 
        {/* Nav items */}
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {sidebarItems.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 12, marginBottom: 4,
              background: tab === item.key ? accent + "18" : "transparent",
              color: tab === item.key ? accent : textMuted,
              fontSize: 14, fontWeight: tab === item.key ? 600 : 400,
              border: "none", cursor: "pointer", textAlign: "left",
              transition: "all 0.18s",
            }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
              {item.key === "bookings" && stats.pending > 0 && (
                <span style={{
                  marginLeft: "auto", background: pendingColor, color: "#fff",
                  borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                }}>
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </nav>
 
        {/* Back to site */}
        <div style={{ padding: "16px 12px", borderTop: `1px solid ${border}` }}>
          <button onClick={() => router.push("/profile")} style={{
            width: "100%", padding: "10px 14px", borderRadius: 12,
            background: "transparent", color: textMuted,
            fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
            textAlign: "left", display: "flex", alignItems: "center", gap: 10,
          }}>
            {t.back_to_profile}
          </button>
        </div>
      </div>
 
      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "40px 40px" }}>
 
        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, color: text, marginBottom: 8 }}>
              {t.dashboard_label}
            </h1>
            <p style={{ fontSize: 14, color: textMuted, marginBottom: 32 }}>{t.platform_overview}</p>
 
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 40 }}>
              {[
                { label: t.total_users, value: stats.users, icon: "👥", color: "#6366f1" },
                { label: t.active_venues, value: stats.venues, icon: "🏛", color: accent },
                { label: t.total_bookings, value: stats.bookings, icon: "📋", color: "#0ea5e9" },
                { label: t.pending, value: stats.pending, icon: "⏳", color: pendingColor },
                { label: t.confirmed, value: stats.confirmed, icon: "✅", color: confirmedColor },
              ].map((s, i) => (
                <div key={i} style={{
                  background: bgCard, borderRadius: 18, padding: "20px",
                  borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
                  borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
 
            {/* Venue bookings breakdown */}
            <h2 style={{ fontSize: 20, fontWeight: 600, color: text, marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>
              {t.bookings_per_venue_label}
            </h2>
            <div style={{
              background: bgCard, borderRadius: 20, overflow: "hidden",
              borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
              borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
            }}>
              {venues.length === 0 && <p style={{ padding: 24, color: textMuted }}>{t.no_venues_msg}</p>}
              {venues.map((venue, i) => {
                const vs = venueStats[venue.id] || { total: 0, pending: 0, confirmed: 0 }
                const pct = vs.total > 0 ? Math.round((vs.confirmed / vs.total) * 100) : 0
                return (
                  <div key={venue.id} style={{
                    padding: "18px 24px",
                    borderBottom: i < venues.length - 1 ? `1px solid ${border}` : "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 3 }}>{venue.name}</p>
                      <p style={{ fontSize: 12, color: textMuted }}>📍 {venue.brand}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: text }}>{vs.total}</div>
                        <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase" }}>{t.total_label}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: pendingColor }}>{vs.pending}</div>
                        <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase" }}>{t.pending}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: confirmedColor }}>{vs.confirmed}</div>
                        <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase" }}>{t.confirmed}</div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ width: 80 }}>
                        <div style={{ height: 6, background: border, borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: confirmedColor, borderRadius: 999 }} />
                        </div>
                        <div style={{ fontSize: 10, color: textMuted, marginTop: 3, textAlign: "center" }}>{pct}% {t.pct_confirmed_label}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
 
        {/* ── VENUES ── */}
        {tab === "venues" && (
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, color: text, marginBottom: 8 }}>{t.manage_venues_label}</h1>
            <p style={{ fontSize: 14, color: textMuted, marginBottom: 32 }}>{t.manage_venues_sub_label}</p>
 
            {/* Add form */}
            <div style={{
              background: bgCard, borderRadius: 20, padding: "28px", marginBottom: 24,
              borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
              borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: text, marginBottom: 20 }}>{t.add_new_venue_heading}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.venue_name_label}</label>
                  <input value={newVenue.name} placeholder="Golden Hall"
                    onChange={e => setNewVenue(v => ({ ...v, name: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.location_type_label}</label>
                  <input value={newVenue.brand} placeholder="Wedding Venue, Algiers"
                    onChange={e => setNewVenue(v => ({ ...v, brand: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.price_per_day}</label>
                  <input value={newVenue.price_per_day} placeholder="5000" type="number"
                    onChange={e => setNewVenue(v => ({ ...v, price_per_day: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <button onClick={addVenue} disabled={addingVenue} style={{
                padding: "11px 28px", borderRadius: 999, background: accent, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                boxShadow: `0 4px 16px ${accent}44`,
              }}>
                {addingVenue ? t.adding : t.add_venue_btn}
              </button>
            </div>
 
            {/* Venues list */}
            <div style={{
              background: bgCard, borderRadius: 20, overflow: "hidden",
              borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
              borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
            }}>
              <div style={{ padding: "18px 24px", borderBottom: `1px solid ${border}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: text }}>{t.all_venues_label} ({venues.length})</h3>
              </div>
              {venues.length === 0 && <p style={{ padding: 24, color: textMuted }}>{t.no_venues_msg}</p>}
              {venues.map((venue, i) => {
                const vs = venueStats[venue.id] || { total: 0, pending: 0, confirmed: 0 }
                return (
                  <div key={venue.id} style={{
                    padding: "18px 24px",
                    borderBottom: i < venues.length - 1 ? `1px solid ${border}` : "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 3 }}>{venue.name}</p>
                      <p style={{ fontSize: 12, color: textMuted }}>📍 {venue.brand}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ fontSize: 12, color: textMuted }}>
                        <span style={{ color: text, fontWeight: 600 }}>{vs.total}</span> {t.bookings_count}
                        &nbsp;·&nbsp;
                        <span style={{ color: pendingColor, fontWeight: 600 }}>{vs.pending}</span> {t.pending}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: accent }}>
                        {venue.price_per_day?.toLocaleString()} DA<span style={{ fontSize: 11, fontWeight: 400, color: textMuted }}>/day</span>
                      </span>
                      <button onClick={() => deleteVenue(venue.id)} style={{
                        padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: cancelledColor + "18", color: cancelledColor,
                        borderTop: `1px solid ${cancelledColor}44`, borderRight: `1px solid ${cancelledColor}44`,
                        borderBottom: `1px solid ${cancelledColor}44`, borderLeft: `1px solid ${cancelledColor}44`,
                        cursor: "pointer",
                      }}>🗑 {t.delete_btn}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
 
        {/* ── BOOKINGS ── */}
        {tab === "bookings" && (
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, color: text, marginBottom: 8 }}>{t.bookings_label}</h1>
            <p style={{ fontSize: 14, color: textMuted, marginBottom: 24 }}>{t.review_bookings_sub}</p>
 
            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {["all", "pending", "confirmed", "cancelled"].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)} style={{
                  padding: "7px 18px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: filterStatus === f ? accent : "transparent",
                  color: filterStatus === f ? "#fff" : textMuted,
                  borderTop: `1.5px solid ${filterStatus === f ? accent : border}`,
                  borderRight: `1.5px solid ${filterStatus === f ? accent : border}`,
                  borderBottom: `1.5px solid ${filterStatus === f ? accent : border}`,
                  borderLeft: `1.5px solid ${filterStatus === f ? accent : border}`,
                  cursor: "pointer", textTransform: "capitalize",
                }}>
                  {f === "all" ? `${t.all} (${bookings.length})` : `${t[f] || f} (${bookings.filter(b => b.status === f).length})`}
                </button>
              ))}
            </div>
 
            <div style={{
              background: bgCard, borderRadius: 20, overflow: "hidden",
              borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
              borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
            }}>
              {filteredBookings.length === 0 && (
                <div style={{ padding: "60px", textAlign: "center", color: textMuted }}>{t.no_bookings_found}</div>
              )}
              {filteredBookings.map((b, i) => {
                const color = statusColor(b.status)
                return (
                  <div key={b.id} style={{
                    padding: "18px 24px",
                    borderBottom: i < filteredBookings.length - 1 ? `1px solid ${border}` : "none",
                    borderLeft: `4px solid ${color}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 3 }}>
                        {b.venue?.name || "Unknown Venue"}
                      </p>
                      <p style={{ fontSize: 12, color: textMuted, marginBottom: 2 }}>📍 {b.venue?.brand}</p>
                      <p style={{ fontSize: 11, color: textMuted, marginBottom: 2 }}>👤 {b.userEmail}</p>
                      {b.date && (
                        <p style={{ fontSize: 11, color: textMuted }}>
                          📅 {new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
 
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        padding: "4px 14px", borderRadius: 999,
                        fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                        background: color + "18", color,
                      }}>{b.status}</span>
 
                      {b.receiptUrl && (
                        <a href={b.receiptUrl} target="_blank" rel="noreferrer" style={{
                          fontSize: 11, color: accent, fontWeight: 600, textDecoration: "none",
                          padding: "5px 12px", borderRadius: 999,
                          borderTop: `1px solid ${accent}44`, borderRight: `1px solid ${accent}44`,
                          borderBottom: `1px solid ${accent}44`, borderLeft: `1px solid ${accent}44`,
                        }}>{t.receipt_link}</a>
                      )}
 
                      {b.status !== "confirmed" && (
                        <button onClick={() => updateBookingStatus(b.id, "confirmed")} style={{
                          padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: confirmedColor + "18", color: confirmedColor,
                          borderTop: `1px solid ${confirmedColor}55`, borderRight: `1px solid ${confirmedColor}55`,
                          borderBottom: `1px solid ${confirmedColor}55`, borderLeft: `1px solid ${confirmedColor}55`,
                          cursor: "pointer",
                        }}>{t.approve_btn}</button>
                      )}
 
                      {b.status !== "cancelled" && (
                        <button onClick={() => updateBookingStatus(b.id, "cancelled")} style={{
                          padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: cancelledColor + "18", color: cancelledColor,
                          borderTop: `1px solid ${cancelledColor}55`, borderRight: `1px solid ${cancelledColor}55`,
                          borderBottom: `1px solid ${cancelledColor}55`, borderLeft: `1px solid ${cancelledColor}55`,
                          cursor: "pointer",
                        }}>{t.reject_btn}</button>
                      )}
 
                      {b.status !== "pending" && (
                        <button onClick={() => updateBookingStatus(b.id, "pending")} style={{
                          padding: "6px 14px", borderRadius: 999, fontSize: 12,
                          background: "transparent", color: textMuted,
                          borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`,
                          borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`,
                          cursor: "pointer",
                        }}>{t.reset_btn}</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
 