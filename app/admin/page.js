"use client"
 
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/ThemeContext"
 
export default function AdminPage() {
  const { bg, border, text, textMuted, accent, dark, accentGlow, lang, t, glassCard, glassFilter, glassBorder, cardShadow, toggleDark, setLang, isRTL } = useTheme()
  const twGlassCard = dark ? "glass-card glass-card-dark" : "glass-card"
  const twInput = dark ? "input-glass input-glass-dark" : "input-glass"
  const twBtn = "btn-glow"
  const headingFont = lang === "ar" ? "'Amiri','Tajawal',serif" : "'Playfair Display',serif"
  const router = useRouter()
 
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState("dashboard")
 
  const [stats, setStats] = useState({ users: 0, venues: 0, bookings: 0, pending: 0, confirmed: 0 })
  const [venues, setVenues] = useState([])
  const [bookings, setBookings] = useState([])
  const [venueStats, setVenueStats] = useState({})
  const [newVenue, setNewVenue] = useState({ name: "", brand: "", price_per_day: "", location: "", image_url: "" })
  const [imageFile, setImageFile] = useState(null)
  const [addImageMode, setAddImageMode] = useState("upload") // "upload" | "url"
  const [addingVenue, setAddingVenue] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [users, setUsers] = useState([])
  const [activities, setActivities] = useState([])
  const [viewReceipt, setViewReceipt] = useState(null)
  // Editing state
  const [editingVenue, setEditingVenue] = useState(null) // holds venue object being edited
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImageMode, setEditImageMode] = useState("upload") // "upload" | "url"
  const [savingVenue, setSavingVenue] = useState(false)
 
  const pendingColor = "#f59e0b"
  const confirmedColor = "#10b981"
  const cancelledColor = "#ef4444"
 
  useEffect(() => {
    let cleanup = () => {}
    init().then(res => {
      if (res) cleanup = res
    })
    return () => cleanup()
  }, [])
 
  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/login"); return }
 
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", session.user.id).single()
 
    if (!profile || profile.role !== "admin") {
      setIsAdmin(false); setLoading(false); return
    }
 
    setIsAdmin(true)
    await Promise.all([loadStats(), loadVenues(), loadBookings(), loadUsers()])
    setLoading(false)
 
    // Realtime subscriptions with unique channel and instant prepending
    const channelId = `admin-dashboard-${Date.now()}`
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, async (payload) => {
        // Instant prepend for new bookings
        const newBooking = await enrichBooking(payload.new);
        setBookings(prev => [newBooking, ...prev]);
        loadStats(); loadVenues();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.eventType !== 'INSERT') {
          loadBookings(); loadStats(); loadVenues();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { loadUsers(); loadStats() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () => { loadVenues(); loadStats() })
      .subscribe()
 
    return () => {
      supabase.removeChannel(channel)
    }
  }
 
  async function loadUsers() {
    const { data } = await supabase.from("profiles").select("*");
    setUsers(data || []);
  }
 
  useEffect(() => {
    const acts = [];
    users.forEach((u, i) => {
      const date = u.created_at ? new Date(u.created_at) : new Date(Date.now() - i * 86400000);
      acts.push({ type: "user", id: "u_"+u.id, title: t.new_user_joined, desc: u.email, date, icon: "👥" });
    });
    bookings.forEach((b, i) => {
      // Use creation timestamp for activity date
      const date = b.created_at ? new Date(b.created_at) : new Date();
      acts.push({ type: "booking", id: "b_"+b.id, title: t.new_booking_created, desc: `${b.userEmail} ${t.booked_text} ${b.venue?.name}`, date, icon: "📋" });
    });
    // Strict chronological sort for activities
    acts.sort((a, b) => b.date.getTime() - a.date.getTime());
    setActivities(acts.slice(0, 10));
  }, [users, bookings]);
  
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
    // 1. Fetch bookings perfectly sorted by the database
    let { data: rawData, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
 
    if (fetchError) {
      // Fallback 1: Try inserted_at if created_at is missing
      const { data: raw2, error: err2 } = await supabase
        .from("bookings")
        .select("*")
        .order("inserted_at", { ascending: false });
        
      if (err2) {
        // Fallback 2: Try database natural order and reverse it
        const { data: raw3 } = await supabase.from("bookings").select("*");
        rawData = raw3 ? [...raw3].reverse() : [];
      } else {
        rawData = raw2;
      }
    }

    if (!rawData) return;

    // 2. Enrich ALL bookings. Promise.all preserves the exact array order!
    const enriched = await Promise.all(rawData.map(b => enrichBooking(b)));
    
    // 3. Set state directly. NO Javascript sorting here!
    setBookings(enriched);
  }

  async function enrichBooking(b) {
    try {
      const [venueRes, profileRes] = await Promise.all([
        b.venue_id ? supabase.from("venues").select("name").eq("id", b.venue_id).single() : Promise.resolve({ data: null }),
        b.user_id ? supabase.from("profiles").select("email").eq("id", b.user_id).single() : Promise.resolve({ data: null })
      ]);

      let receiptUrl = null;
      if (b.payment_receipt_url) {
        const { data: urlData } = supabase.storage
          .from("payment-receipts")
          .getPublicUrl(b.payment_receipt_url);
        receiptUrl = urlData?.publicUrl || null;
      }

      return { 
        ...b, 
        venue: venueRes?.data || { name: t.unknown_venue || "Unknown Venue" }, 
        userEmail: profileRes?.data?.email || "Unknown User", 
        receiptUrl 
      };
    } catch (err) {
      return { ...b, venue: { name: "Error Loading" }, userEmail: "Error Loading", receiptUrl: null };
    }
  }

  async function addVenue() {
    if (!newVenue.name || !newVenue.brand || !newVenue.price_per_day || !newVenue.location || (!newVenue.image_url && !imageFile)) { alert(t.fill_all_fields); return }
    setAddingVenue(true)
    
    let finalImageUrl = newVenue.image_url

    if (imageFile) {
      const fileName = `venue-${Date.now()}-${imageFile.name}`
      const { data: uploadData, error: uploadError } = await supabase
        .storage.from("venue images").upload(fileName, imageFile)

      if (uploadError) { 
        alert(t.error_uploading + ": " + uploadError.message)
        setAddingVenue(false)
        return 
      }
      const { data: publicUrlData } = supabase.storage.from("venue images").getPublicUrl(uploadData.path)
      finalImageUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.from("venues").insert({
      name: newVenue.name, brand: newVenue.brand,
      price_per_day: parseInt(newVenue.price_per_day),
      location: newVenue.location,
      image_url: finalImageUrl
    })
    setAddingVenue(false)
    if (error) { alert("Error: " + error.message); return }
    setNewVenue({ name: "", brand: "", price_per_day: "", location: "", image_url: "" })
    setImageFile(null)
    setAddImageMode("upload")
    await loadVenues(); await loadStats()
  }

  async function updateVenue() {
    if (!editingVenue) return
    setSavingVenue(true)
    let finalImageUrl = editingVenue.image_url // default: keep current or URL field

    if (editImageMode === "upload" && editImageFile) {
      const fileName = `venue-${Date.now()}-${editImageFile.name}`
      const { data: uploadData, error: uploadError } = await supabase
        .storage.from("venue images").upload(fileName, editImageFile)
      if (uploadError) {
        alert(t.error_uploading + ": " + uploadError.message)
        setSavingVenue(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from("venue images").getPublicUrl(uploadData.path)
      finalImageUrl = publicUrlData.publicUrl
    }
    // if editImageMode === "keep" or "url", finalImageUrl is already set from editingVenue.image_url

    const { error } = await supabase.from("venues").update({
      name: editingVenue.name,
      brand: editingVenue.brand,
      price_per_day: parseInt(editingVenue.price_per_day),
      location: editingVenue.location,
      image_url: finalImageUrl,
    }).eq("id", editingVenue.id)

    setSavingVenue(false)
    if (error) { alert("Error: " + error.message); return }
    setEditingVenue(null)
    setEditImageFile(null)
    setEditImageMode("upload")
    await loadVenues()
  }
 
  async function deleteVenue(id) {
    if (!confirm(t.delete_venue_confirm)) return
    const { error } = await supabase.from("venues").delete().eq("id", id)
    if (error) { alert("Error: " + error.message); return }
    await loadVenues(); await loadStats()
  }
 
  async function updateBookingStatus(bookingId, status) {
    const booking = bookings.find(b => b.id === bookingId)
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId)
    if (error) { alert("Error: " + error.message); return }

    // Create notification
    if (booking) {
      const venueName = booking.venue?.name || "the venue"
      const msg = status === "confirmed" 
        ? t.booking_approved_msg.replace("{venue}", venueName)
        : t.booking_declined_msg.replace("{venue}", venueName)
        
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        booking_id: booking.id,
        message: msg,
        type: "booking_status"
      })
    }

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    await Promise.all([loadStats(), loadVenues()])
  }
 
  function statusColor(s) {
    if (s === "confirmed") return confirmedColor
    if (s === "cancelled") return cancelledColor
    return pendingColor
  }
 
  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12,
    color: text, fontSize: 14,
    boxSizing: "border-box", fontFamily: "inherit", outline: "none",
  }
 
  const sidebarItems = [
    { key: "dashboard", icon: "📊", label: t.dashboard_label },
    { key: "venues", icon: "🏛", label: t.manage_venues_label },
    { key: "bookings", icon: "📋", label: t.bookings_label },
    { key: "users", icon: "👥", label: t.users_label },
  ]
 
  const filteredBookings = filterStatus === "all"
    ? bookings
    : bookings.filter(b => b.status === filterStatus);
 
  if (loading) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: textMuted }}>{t.authenticating_admin || "Authenticating Admin..."}</p>
    </div>
  )
 
  if (!isAdmin) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
      <h2 style={{ fontFamily: headingFont, fontSize: 32, color: text, marginBottom: 8 }}>{t.access_denied || "Access Denied"}</h2>
      <p style={{ color: textMuted, fontSize: 15, marginBottom: 32 }}>{t.no_admin_privileges || "You do not have administrative privileges."}</p>
      <button onClick={() => router.push("/")} className="btn-glow" style={{ padding: "12px 32px", borderRadius: 999, background: accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: `0 4px 16px ${accentGlow}` }}>
        {t.return_home || "Return Home"}
      </button>
    </div>
  )
 
  return (
    <div className={`ambient-bg${dark ? " ambient-bg-dark" : ""}`} style={{ minHeight: "100vh", background: bg, display: "flex" }}>
  
      {/* ── FLOATING CONTROLS ── */}
      <div style={{
        position: "absolute", top: 24, [isRTL ? "left" : "right"]: 24, zIndex: 1000,
        display: "flex", alignItems: "center", gap: 16,
        padding: "8px 12px", borderRadius: 999,
        background: glassCard, border: `1px solid ${glassBorder}`,
        backdropFilter: glassFilter, WebkitBackdropFilter: glassFilter,
        boxShadow: cardShadow
      }}>
        {/* Language */}
        <div style={{ display: "flex", gap: 4 }}>
          {["en", "fr", "ar"].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              width: 32, height: 32, borderRadius: "50%", fontSize: 10, fontWeight: 700,
              background: lang === l ? accent : "transparent",
              color: lang === l ? "#fff" : textMuted, border: "none", cursor: "pointer",
              textTransform: "uppercase", transition: "all 0.2s"
            }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: border }} />
        {/* Theme */}
        <button onClick={toggleDark} style={{
          width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          color: dark ? "#fbbf24" : text, border: "none", cursor: "pointer", fontSize: 18
        }}>
          {dark ? "🌙" : "☀️"}
        </button>
      </div>
 
      {/* ── SIDEBAR ── */}
      <div style={{
        width: 250,
        background: glassCard,
        backdropFilter: glassFilter, WebkitBackdropFilter: glassFilter,
        border: `1px solid ${glassBorder}`,
        borderRadius: 24,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 16, [isRTL ? "right" : "left"]: 16, bottom: 16,
        overflow: "hidden", zIndex: 100,
        boxShadow: dark
          ? "0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset"
          : "0 8px 40px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
      }}>
        <div style={{ padding: "40px 24px 32px", borderBottom: `1px solid ${border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <img src="/logo.png" alt="Saha Events"
            style={{ height: 42, filter: dark ? "invert(1) brightness(0.9)" : "none", marginBottom: 16, display: "block" }} />
          <div style={{ fontSize: 12, letterSpacing: "0.25em", textTransform: "uppercase", color: accent, fontWeight: 700, width: "100%" }}>
            {t.admin_console || "Admin Console"}
          </div>
        </div>
 
        {/* Nav items */}
        <nav style={{ flex: 1, padding: "24px 16px", overflowY: "auto" }}>
          {sidebarItems.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 16, marginBottom: 8,
              background: tab === item.key ? (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") : "transparent",
              color: tab === item.key ? text : textMuted,
              fontSize: 14, fontWeight: tab === item.key ? 600 : 500,
              border: "none", cursor: "pointer", textAlign: isRTL ? "right" : "left",
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
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
        <div style={{ padding: "24px 16px", borderTop: `1px solid ${border}` }}>
          <button onClick={() => router.push("/profile")} style={{
            width: "100%", padding: "12px 16px", borderRadius: 16,
            background: "transparent", color: textMuted,
            fontSize: 14, fontWeight: 500, border: `1px solid ${border}`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "background 0.2s"
          }} onMouseEnter={(e) => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            {t.exit_admin || "← Exit Admin Console"}
          </button>
        </div>
      </div>
 
      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, marginLeft: isRTL ? 32 : 266, marginRight: isRTL ? 266 : 32, minHeight: "100vh", padding: "48px 32px", overflowX: "hidden" }}>
 
        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="fade-up">
            <h1 style={{ fontFamily: headingFont, fontSize: 36, fontWeight: 400, color: text, marginBottom: 8 }}>
              {t.dashboard}
            </h1>
            <p style={{ fontSize: 15, color: textMuted, marginBottom: 40 }}>{t.dashboard_sub}</p>
 
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20, marginBottom: 48 }}>
              {[
                { label: t.total_users, value: stats.users, icon: "👥", color: text },
                { label: t.active_venues, value: stats.venues, icon: "🏛", color: accent },
                { label: t.total_bookings_label, value: stats.bookings, icon: "📋", color: text },
                { label: t.pending, value: stats.pending, icon: "⏳", color: pendingColor },
                { label: t.confirmed, value: stats.confirmed, icon: "✅", color: confirmedColor },
              ].map((s, i) => (
                <div key={i} className={twGlassCard} style={{
                  padding: "24px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 36, fontWeight: 600, color: s.color, fontFamily: headingFont }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: textMuted, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
 
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
            
            {/* Bookings per Venue */}
            <div className={twGlassCard} style={{ padding: "24px 28px", borderRadius: 24, border: `1px solid ${glassBorder}`, height: "fit-content", minWidth: 0 }}>
              <h3 style={{ fontSize: 24, fontWeight: 500, color: text, marginBottom: 24, fontFamily: headingFont, letterSpacing: "-0.01em" }}>{t.bookings_per_venue_label}</h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {venues.map((v, i) => {
                  const vs = venueStats[v.id] || { total: 0, pending: 0, confirmed: 0 }
                  const pct = vs.total > 0 ? Math.round((vs.confirmed / vs.total) * 100) : 0
                  return (
                    <div key={v.id} style={{ 
                      padding: "16px 0", 
                      borderBottom: i === venues.length - 1 ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: text, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</p>
                        <p style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>📍 {v.location}</p>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
                        <div style={{ textAlign: "center", minWidth: 30 }}>
                          <p style={{ fontSize: 20, fontWeight: 700, color: text }}>{vs.total}</p>
                        </div>
                        
                        <div style={{ textAlign: "center", minWidth: 55 }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: pendingColor }}>{vs.pending}</p>
                          <p style={{ fontSize: 7, color: textMuted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>{t.pending_l}</p>
                        </div>
                        
                        <div style={{ textAlign: "center", minWidth: 60 }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: confirmedColor }}>{vs.confirmed}</p>
                          <p style={{ fontSize: 7, color: textMuted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>{t.confirmed}</p>
                        </div>
                        
                        <div style={{ width: 90, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <div style={{ width: "100%", height: 4, background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: confirmedColor, borderRadius: 2 }} />
                          </div>
                          <p style={{ fontSize: 9, color: textMuted }}>{pct}% {t.confirmed || "confirmed"}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className={twGlassCard} style={{ padding: "24px 28px", borderRadius: 24, border: `1px solid ${glassBorder}`, display: "flex", flexDirection: "column", height: "fit-content", minWidth: 0 }}>
              <h3 style={{ fontSize: 24, fontWeight: 500, color: text, marginBottom: 24, fontFamily: headingFont, letterSpacing: "-0.01em" }}>{t.recent_activities}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
                {activities.length === 0 ? (
                  <p style={{ color: textMuted, fontSize: 14, padding: 32, textAlign: "center" }}>{t.no_recent_activities}</p>
                ) : (
                  activities.map((act, i) => (
                    <div key={act.id} style={{ 
                      display: "flex", alignItems: "center", gap: 16, padding: "16px 0",
                      borderBottom: i === activities.length - 1 ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`
                    }}>
                      <div style={{ 
                        width: 40, height: 40, borderRadius: 12, 
                        background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0
                      }}>
                        {act.type === "booking" ? "📋" : "👥"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: text, fontSize: 14 }}>{act.title}</p>
                        <p style={{ fontSize: 12, color: textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{act.desc}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>{act.date.toLocaleDateString()}</p>
                        <p style={{ fontSize: 10, color: textMuted, opacity: 0.8 }}>{act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            </div>
          </div>
        )}
 
        {/* ── VENUES ── */}
        {tab === "venues" && (
          <div className="fade-up">
            <h1 style={{ fontFamily: headingFont, fontSize: 36, fontWeight: 400, color: text, marginBottom: 8 }}>{t.manage_venues_label}</h1>
            <p style={{ fontSize: 15, color: textMuted, marginBottom: 40 }}>{t.manage_venues_sub_label}</p>

            {/* Add form */}
            <div className={`fade-up ${twGlassCard}`} style={{ padding: "32px", marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 400, color: text, marginBottom: 24, fontFamily: headingFont }}>{t.add_new_venue_heading}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.venue_name_label}</label>
                  <input className={dark ? "input-glass-dark" : "input-glass"} value={newVenue.name || ""} placeholder="e.g. The Grand Ballroom"
                    onChange={e => setNewVenue(v => ({ ...v, name: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.category_type}</label>
                  <input className={dark ? "input-glass-dark" : "input-glass"} value={newVenue.brand || ""} placeholder="e.g. Wedding, Corporate"
                    onChange={e => setNewVenue(v => ({ ...v, brand: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.price_per_day}</label>
                  <input className={dark ? "input-glass-dark" : "input-glass"} value={newVenue.price_per_day || ""} placeholder="e.g. 50000" type="number"
                    onChange={e => setNewVenue(v => ({ ...v, price_per_day: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.location_label}</label>
                  <input className={dark ? "input-glass-dark" : "input-glass"} value={newVenue.location || ""} placeholder={t.location_ph}
                    onChange={e => setNewVenue(v => ({ ...v, location: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12, color: textMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.photo_url}</label>
                  {/* Mode Toggle */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button onClick={() => { setAddImageMode("upload"); setNewVenue(v => ({ ...v, image_url: "" })) }} style={{
                      padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                      background: addImageMode === "upload" ? accent : "transparent",
                      color: addImageMode === "upload" ? "#fff" : textMuted,
                      border: `1px solid ${addImageMode === "upload" ? accent : border}`,
                    }}> {t.upload_photo}</button>
                    <button onClick={() => { setAddImageMode("url"); setImageFile(null) }} style={{
                      padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                      background: addImageMode === "url" ? accent : "transparent",
                      color: addImageMode === "url" ? "#fff" : textMuted,
                      border: `1px solid ${addImageMode === "url" ? accent : border}`,
                    }}> {t.paste_url}</button>
                  </div>
                  {addImageMode === "upload" ? (
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{
                      width: "100%", padding: "10px", fontSize: 13, color: textMuted,
                      border: `1px solid ${border}`, borderRadius: 12,
                      background: dark ? "rgba(255,255,255,0.05)" : "transparent",
                      boxSizing: "border-box",
                    }} />
                  ) : (
                    <input className={dark ? "input-glass-dark" : "input-glass"} value={newVenue.image_url || ""} placeholder="https://example.com/photo.jpg"
                      onChange={e => setNewVenue(v => ({ ...v, image_url: e.target.value }))} style={inputStyle} />
                  )}
                </div>
              </div>
              <button onClick={addVenue} disabled={addingVenue} className="btn-glow" style={{
                padding: "12px 32px", borderRadius: 999, background: accent, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                boxShadow: `0 4px 16px ${accentGlow}`,
              }}>
                {addingVenue ? t.adding : t.add_venue_btn}
              </button>
            </div>

            {/* Venues list */}
            <div className={`fade-up ${twGlassCard}`} style={{ overflow: "hidden" }}>
              <div style={{ padding: "24px 32px", borderBottom: `1px solid ${border}` }}>
                <h3 style={{ fontSize: 18, fontWeight: 400, color: text, fontFamily: headingFont }}>{t.all_venues_label} ({venues.length})</h3>
              </div>
              {venues.length === 0 && <p style={{ padding: 40, color: textMuted, textAlign: "center" }}>{t.no_venues_yet}</p>}
              {venues.map((venue, i) => {
                const vs = venueStats[venue.id] || { total: 0, pending: 0, confirmed: 0 }
                const isEditing = editingVenue?.id === venue.id
                return (
                  <div key={venue.id} style={{
                    borderBottom: i < venues.length - 1 ? `1px solid ${border}` : "none",
                  }}>
                    {/* Row */}
                    <div style={{
                      padding: "20px 32px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {venue.image_url && (
                          <img src={venue.image_url} alt={venue.name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                        )}
                        <div>
                          <p style={{ fontSize: 16, fontWeight: 600, color: text, marginBottom: 4, fontFamily: headingFont }}>{venue.name}</p>
                          <p style={{ fontSize: 13, color: textMuted }}>📍 {venue.location || venue.brand} · {venue.brand}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ fontSize: 13, color: textMuted }}>
                          <span style={{ color: text, fontWeight: 600 }}>{vs.total}</span> {t.bookings_l}
                          &nbsp;·&nbsp;
                          <span style={{ color: pendingColor, fontWeight: 600 }}>{vs.pending}</span> {t.pending_l}
                        </div>
                        <span style={{ fontSize: 17, fontWeight: 600, color: accent }}>
                          {venue.price_per_day?.toLocaleString()} DA<span style={{ fontSize: 12, fontWeight: 400, color: textMuted }}>/day</span>
                        </span>
                        <button onClick={() => { setEditingVenue({ ...venue }); setEditImageFile(null); setEditImageMode("upload") }} style={{
                          padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                          background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                          color: text, border: `1px solid ${border}`,
                          cursor: "pointer", transition: "all 0.2s"
                        }} onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}
                           onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}>
                          {t.edit}
                        </button>
                        <button onClick={() => deleteVenue(venue.id)} style={{
                          padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                          background: cancelledColor + "15", color: cancelledColor,
                          border: "none", cursor: "pointer", transition: "background 0.2s"
                        }} onMouseEnter={e => e.currentTarget.style.background = cancelledColor + "25"}
                           onMouseLeave={e => e.currentTarget.style.background = cancelledColor + "15"}>{t.delete_btn}</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
 
        {/* ── BOOKINGS ── */}
        {tab === "bookings" && (
          <div className="fade-up">
            <h1 style={{ fontFamily: headingFont, fontSize: 36, fontWeight: 400, color: text, marginBottom: 8 }}>{t.bookings_label}</h1>
            <p style={{ fontSize: 15, color: textMuted, marginBottom: 32 }}>{t.bookings_admin_sub}</p>
 
            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
              {["all", "pending", "confirmed", "cancelled"].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)} style={{
                  padding: "10px 24px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: filterStatus === f ? accent : (dark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)"),
                  color: filterStatus === f ? "#fff" : textMuted,
                  border: `1px solid ${filterStatus === f ? accent : border}`,
                  cursor: "pointer", textTransform: "capitalize", transition: "all 0.2s",
                  boxShadow: filterStatus === f ? `0 4px 12px ${accentGlow}` : "none"
                }}>
                  {f === "all" ? `${t.all} (${bookings.length})` : `${t[f] || f} (${bookings.filter(b => b.status === f).length})`}
                </button>
              ))}
            </div>
 
            <div className={`fade-up ${twGlassCard}`} style={{ overflow: "hidden" }}>
              {filteredBookings.length === 0 && (
                <div style={{ padding: "80px", textAlign: "center", color: textMuted }}>
                  <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 16 }}>📋</div>
                  <p style={{ fontSize: 16 }}>{t.no_bookings_found}</p>
                </div>
              )}
              {filteredBookings.map((b, i) => {
                const color = statusColor(b.status)
                return (
                  <div key={b.id} style={{
                    padding: "24px 32px",
                    borderBottom: i < filteredBookings.length - 1 ? `1px solid ${glassBorder}` : "none",
                    borderLeft: `4px solid ${color}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20,
                    background: glassCard, backdropFilter: glassFilter, WebkitBackdropFilter: glassFilter
                  }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <p style={{ fontSize: 18, fontWeight: 600, color: text, marginBottom: 6, fontFamily: headingFont }}>
                        {b.venue?.name || t.unknown_venue}
                      </p>
                      <p style={{ fontSize: 13, color: textMuted, marginBottom: 4 }}>📍 {b.venue?.location || b.venue?.brand}</p>
                      <p style={{ fontSize: 13, color: text, marginBottom: 4, fontWeight: 500 }}>👤 {b.userEmail}</p>
                      {b.date && (
                        <p style={{ fontSize: 12, color: accent, fontWeight: 600, marginTop: 8 }}>
                          📅 {new Date(b.date).toLocaleDateString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
 
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{
                        padding: "6px 16px", borderRadius: 999,
                        fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                        background: color + "18", color,
                      }}>{t[b.status] || b.status}</span>
 
                      {b.receiptUrl && (
                        <button onClick={() => setViewReceipt(b.receiptUrl)} style={{
                          fontSize: 12, color: accent, fontWeight: 600, textDecoration: "none",
                          padding: "8px 16px", borderRadius: 999, background: accent + "15",
                          border: `1px solid ${accent}44`, transition: "background 0.2s", cursor: "pointer"
                        }}>{t.receipt_link}</button>
                      )}
 
                      {b.status === "pending" && (
                        <>
                          <button onClick={() => updateBookingStatus(b.id, "confirmed")} style={{
                            padding: "8px 20px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                            background: confirmedColor, color: "#fff", border: "none", cursor: "pointer",
                            boxShadow: `0 4px 12px ${confirmedColor}44`
                          }}>{t.approve_btn}</button>
                          <button onClick={() => updateBookingStatus(b.id, "cancelled")} style={{
                            padding: "8px 20px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                            background: cancelledColor + "15", color: cancelledColor, border: "none", cursor: "pointer"
                          }}>{t.reject_btn}</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="fade-up">
            <h1 style={{ fontFamily: headingFont, fontSize: 36, fontWeight: 400, color: text, marginBottom: 8 }}>{t.total_users || "Users"}</h1>
            <p style={{ fontSize: 15, color: textMuted, marginBottom: 40 }}>Manage registered users on the platform</p>

            <div className={`fade-up ${twGlassCard}`} style={{ overflow: "hidden" }}>
              {users.length === 0 && <p style={{ padding: 40, color: textMuted, textAlign: "center" }}>No users found.</p>}
              {users.map((u, i) => (
                <div key={u.id} style={{
                  padding: "20px 32px", borderBottom: i < users.length - 1 ? `1px solid ${border}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: text, marginBottom: 4, fontFamily: headingFont }}>{u.full_name || u.email?.split("@")[0] || "User"}</p>
                      <p style={{ fontSize: 13, color: textMuted }}>{u.email}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, color: textMuted }}>Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Unknown"}</span>
                    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: u.role === "admin" ? accent + "22" : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: u.role === "admin" ? accent : textMuted }}>{u.role || "user"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── EDIT VENUE MODAL ── */}
      {editingVenue && (
        <div onClick={e => { if (e.target === e.currentTarget) { setEditingVenue(null); setEditImageFile(null) } }} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div className={`fade-up ${twGlassCard}`} style={{
            width: "100%", maxWidth: 680,
            padding: "36px", borderRadius: 28,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <h2 style={{ fontFamily: headingFont, fontSize: 22, fontWeight: 500, color: text }}>✏️ Edit Venue</h2>
              <button onClick={() => { setEditingVenue(null); setEditImageFile(null) }} style={{
                width: 36, height: 36, borderRadius: "50%", border: `1px solid ${border}`,
                background: "transparent", color: textMuted, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.venue_name_label}</label>
                <input className={dark ? "input-glass-dark" : "input-glass"} value={editingVenue.name || ""}
                  onChange={e => setEditingVenue(v => ({ ...v, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.category_type}</label>
                <input className={dark ? "input-glass-dark" : "input-glass"} value={editingVenue.brand || ""}
                  onChange={e => setEditingVenue(v => ({ ...v, brand: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.price_per_day}</label>
                <input className={dark ? "input-glass-dark" : "input-glass"} value={editingVenue.price_per_day || ""} type="number"
                  onChange={e => setEditingVenue(v => ({ ...v, price_per_day: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{t.location_label}</label>
                <input className={dark ? "input-glass-dark" : "input-glass"} value={editingVenue.location || ""}
                  onChange={e => setEditingVenue(v => ({ ...v, location: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Photo</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["upload", "url", "keep"].map(mode => (
                    <button key={mode} onClick={() => { setEditImageMode(mode); setEditImageFile(null) }} style={{
                      padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                      background: editImageMode === mode ? accent : "transparent",
                      color: editImageMode === mode ? "#fff" : textMuted,
                      border: `1px solid ${editImageMode === mode ? accent : border}`,
                    }}>{mode === "upload" ? "📁 Upload" : mode === "url" ? "🔗 URL" : "✓ Keep"}</button>
                  ))}
                </div>
                {editImageMode === "upload" && (
                  <input type="file" accept="image/*" onChange={e => setEditImageFile(e.target.files[0])} style={{
                    width: "100%", padding: "10px", fontSize: 13, color: textMuted,
                    border: `1px solid ${border}`, borderRadius: 12,
                    background: dark ? "rgba(255,255,255,0.05)" : "transparent", boxSizing: "border-box",
                  }} />
                )}
                {editImageMode === "url" && (
                  <input className={dark ? "input-glass-dark" : "input-glass"} value={editingVenue.image_url || ""}
                    placeholder="https://example.com/photo.jpg"
                    onChange={e => setEditingVenue(v => ({ ...v, image_url: e.target.value }))} style={inputStyle} />
                )}
                {editImageMode === "keep" && editingVenue.image_url && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={editingVenue.image_url} alt="Current" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }} />
                    <span style={{ fontSize: 12, color: textMuted }}>Current photo will be kept.</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={updateVenue} disabled={savingVenue} className="btn-glow" style={{
                flex: 1, padding: "13px 0", borderRadius: 999, background: accent, color: "#fff",
                border: "none", cursor: savingVenue ? "default" : "pointer", fontSize: 14, fontWeight: 600,
                boxShadow: `0 4px 16px ${accentGlow}`, opacity: savingVenue ? 0.7 : 1,
              }}>{savingVenue ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => { setEditingVenue(null); setEditImageFile(null) }} style={{
                padding: "13px 28px", borderRadius: 999, background: "transparent",
                color: textMuted, border: `1px solid ${border}`, cursor: "pointer", fontSize: 14, fontWeight: 500,
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {viewReceipt && (
        <div onClick={() => setViewReceipt(null)} style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button onClick={() => setViewReceipt(null)} style={{
              position: "absolute", top: -40, right: 0, background: "transparent", color: "#fff", border: "none", fontSize: 32, cursor: "pointer"
            }}>&times;</button>
            <img src={viewReceipt} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 16, objectFit: "contain" }} />
          </div>
        </div>
      )}
    </div>
  )
} 