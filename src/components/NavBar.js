"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "@/components/ThemeContext"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function NavBar() {
  const { t, dark, toggleDark, lang, setLang, isRTL, bgNav, border, text, textMuted, accent, accentDim, accentGlow, glassCard, glassFilter, glassBorder, cardShadow } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [langOpen, setLangOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notiOpen, setNotiOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.is_read).length

  async function fetchProfile(uid) {
    const { data } = await supabase.from("profiles").select("gender").eq("id", uid).single()
    setProfile(data)
  }

  async function fetchNotifications(uid) {
    const { data } = await supabase.from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10)
    setNotifications(data || [])
  }

  async function markAllAsRead() {
    if (!user) return
    const { error } = await supabase.from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id)
        fetchNotifications(u.id)
      }
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id)
        fetchNotifications(u.id)
      }
      else {
        setProfile(null)
        setNotifications([])
      }
    })

    // Realtime Notifications
    let notiSub = null
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        notiSub = supabase.channel(`noti-${session.user.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`
          }, (payload) => {
            setNotifications(prev => [payload.new, ...prev].slice(0, 10))
          })
          .subscribe()
      }
    })

    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll)
    return () => { 
      subscription.unsubscribe()
      if (notiSub) supabase.removeChannel(notiSub)
      window.removeEventListener("scroll", onScroll) 
    }
  }, [])

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return
    const close = (e) => { if (!e.target.closest("[data-lang-switcher]")) setLangOpen(false) }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [langOpen])

  // Close notifications on outside click
  useEffect(() => {
    if (!notiOpen) return
    const close = (e) => { if (!e.target.closest("[data-notifications-dropdown]")) setNotiOpen(false) }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [notiOpen])

  // Close profile dropdown on outside click

  async function handleLogout() {
    await supabase.auth.signOut()
    setProfileOpen(false)
    setProfile(null)
    router.push("/")
  }

  const navLinks = [
    { href: "/", label: t.home },
    { href: "/#about", label: t.about },
    { href: "/venues", label: t.venues },
    { href: "/bookings", label: t.bookings },
  ]

  const langs = [
    { code: "en", label: "EN", full: "English" },
    { code: "fr", label: "FR", full: "Français" },
    { code: "ar", label: "عر", full: "العربية" },
  ]

  const navStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    height: 56,
    borderRadius: 999,
    position: "sticky",
    top: 12,
    zIndex: 200,
    margin: "12px 24px 0",
    transition: "box-shadow 0.35s ease, background 0.35s ease, border-color 0.35s ease",
    background: bgNav,
    backdropFilter: glassFilter,
    WebkitBackdropFilter: glassFilter,
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.65)"}`,
    boxShadow: scrolled
      ? dark
        ? `0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset, 0 0 40px ${accentGlow}`
        : "0 8px 32px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.95) inset"
      : dark
        ? "0 2px 16px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.04) inset"
        : "0 2px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.9) inset",
  }

  return (
    <nav style={navStyle}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
        <img src="/logo.png" alt={t.brand_name} style={{ height: 38, width: "auto", display: "block", filter: dark ? "invert(1) brightness(0.9)" : "none", transition: "opacity 0.3s" }} />
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {navLinks.map(({ href, label }) => {
          const active = pathname === href
          const isHash = href.includes("#")
          const commonProps = {
            style: {
              padding: "7px 18px", borderRadius: 999,
              background: active ? `linear-gradient(135deg, ${accent}, #b8943c)` : "transparent",
              color: active ? "#fff" : textMuted,
              fontSize: 13, fontWeight: active ? 600 : 400,
              textDecoration: "none",
              transition: "all 0.25s ease",
              boxShadow: active ? `0 2px 14px ${accentGlow}` : "none",
              letterSpacing: active ? "0.01em" : "0",
            },
            onMouseEnter: e => { if (!active) e.currentTarget.style.color = text },
            onMouseLeave: e => { if (!active) e.currentTarget.style.color = textMuted },
          }

          if (isHash) {
            return <a key={href} href={href} {...commonProps}>{label}</a>
          }

          return (
            <Link key={href} href={href} {...commonProps}>
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

        {/* Language switcher */}
        <div style={{ position: "relative" }} data-lang-switcher>
          <button onClick={() => setLangOpen(o => !o)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 11px", borderRadius: 999,
            border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            background: "transparent", color: textMuted,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
            letterSpacing: "0.06em", transition: "all 0.25s",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"
              e.currentTarget.style.color = text
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
              e.currentTarget.style.color = textMuted
            }}
          >
            {langs.find(l => l.code === lang)?.label}
            <span style={{ fontSize: 8, opacity: 0.5, transition: "transform 0.2s", transform: langOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </button>
          {langOpen && (
            <div className="fade-up" style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              background: dark ? "rgba(20,18,16,0.85)" : "rgba(255,255,255,0.9)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              border: `1px solid ${glassBorder}`,
              borderRadius: 16, overflow: "hidden",
              boxShadow: cardShadow,
              minWidth: 130, zIndex: 300,
            }}>
              {langs.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false) }} style={{
                  display: "block", width: "100%", padding: "11px 18px",
                  background: lang === l.code ? accent + "15" : "transparent",
                  color: lang === l.code ? accent : text,
                  fontSize: 13, textAlign: "left", border: "none",
                  cursor: "pointer", fontWeight: lang === l.code ? 600 : 400,
                  transition: "background 0.2s, color 0.2s",
                  fontFamily: "inherit",
                }}
                  onMouseEnter={e => { if (lang !== l.code) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
                  onMouseLeave={e => { if (lang !== l.code) e.currentTarget.style.background = "transparent" }}
                >{l.full}</button>
              ))}
            </div>
          )}
        </div>

        {/* Dark/light toggle */}
        <button onClick={toggleDark} style={{
          width: 34, height: 34, borderRadius: 999,
          border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          background: "transparent", fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.28s ease",
        }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"
            e.currentTarget.style.transform = "rotate(15deg)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
            e.currentTarget.style.transform = "rotate(0)"
          }}
        >
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Notifications */}
        {user && (
          <div style={{ position: "relative" }} data-notifications-dropdown>
            <button 
              onClick={() => { setNotiOpen(!notiOpen); if (!notiOpen) markAllAsRead() }}
              style={{
                width: 34, height: 34, borderRadius: 999,
                border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: "transparent", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.28s ease", position: "relative"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2,
                  background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800,
                  width: 16, height: 16, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${bgNav}`, boxShadow: "0 2px 6px rgba(239,68,68,0.4)"
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {notiOpen && (
              <div className="fade-up" style={{
                position: "absolute", top: "calc(100% + 12px)", right: -40,
                background: dark ? "rgba(20,18,16,0.92)" : "rgba(255,255,255,0.95)",
                backdropFilter: "blur(24px) saturate(150%)",
                WebkitBackdropFilter: "blur(24px) saturate(150%)",
                border: `1px solid ${glassBorder}`,
                borderRadius: 20, overflow: "hidden",
                boxShadow: cardShadow,
                minWidth: 280, zIndex: 300,
                padding: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: text }}>{t.notifications_label}</h4>
                  {unreadCount > 0 && <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{unreadCount} New</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 350, overflowY: "auto", paddingRight: 4 }}>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: 12, color: textMuted, textAlign: "center", padding: "12px 0" }}>{t.no_new_notifications}</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} style={{
                        padding: "10px 12px", borderRadius: 12,
                        background: n.is_read ? "transparent" : (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                        border: `1px solid ${n.is_read ? "transparent" : glassBorder}`,
                        transition: "all 0.2s"
                      }}>
                        <p style={{ fontSize: 12, color: text, marginBottom: 4, lineHeight: 1.4 }}>{n.message}</p>
                        <p style={{ fontSize: 10, color: textMuted }}>{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auth */}
        {user ? (
          <div style={{ position: "relative" }} data-profile-dropdown>
            <button onClick={() => setProfileOpen(o => !o)} style={{
              width: 36, height: 36, borderRadius: 999,
              background: `linear-gradient(135deg, ${accent}, #b8943c)`,
              color: "#fff", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 3px 14px ${accentGlow}`,
              border: "none", cursor: "pointer",
              transition: "box-shadow 0.28s, transform 0.28s",
              overflow: "hidden", padding: 0
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.05)"
                e.currentTarget.style.boxShadow = `0 4px 20px rgba(201,168,76,0.35)`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.boxShadow = `0 3px 14px ${accentGlow}`
              }}
            >
              <img 
                src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${user.email}${profile?.gender === 'female' ? '_f' : '_m'}&mood[]=happy`} 
                alt="Avatar" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            </button>
            
            {profileOpen && (
              <div className="fade-up" style={{
                position: "absolute", top: "calc(100% + 12px)", right: 0,
                background: dark ? "rgba(20,18,16,0.85)" : "rgba(255,255,255,0.9)",
                backdropFilter: "blur(24px) saturate(150%)",
                WebkitBackdropFilter: "blur(24px) saturate(150%)",
                border: `1px solid ${glassBorder}`,
                borderRadius: 16, overflow: "hidden",
                boxShadow: cardShadow,
                minWidth: 160, zIndex: 300,
                display: "flex", flexDirection: "column",
                padding: "8px"
              }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, marginBottom: "4px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email.split("@")[0]}</p>
                  <p style={{ fontSize: 10, color: textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
                </div>
                <Link href="/profile" onClick={() => setProfileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, textDecoration: "none", color: text, fontSize: 13, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span>👤</span> {t.profile || "View Profile"}
                </Link>
                <Link href="/profile?tab=settings" onClick={() => setProfileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, textDecoration: "none", color: text, fontSize: 13, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span>⚙️</span> {t.settings_tab || "Settings"}
                </Link>
                <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer", textAlign: "left", transition: "background 0.2s", marginTop: "4px" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span>🚪</span> {t.logout || "Logout"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn-glow" style={{
            padding: "7px 18px", borderRadius: 999,
            background: `linear-gradient(135deg, ${accent}, #b8943c)`,
            color: "#fff",
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            boxShadow: `0 3px 14px ${accentGlow}`,
            transition: "box-shadow 0.28s, transform 0.28s",
            letterSpacing: "0.02em",
          }}>{t.login}</Link>
        )}
      </div>
    </nav>
  )
}