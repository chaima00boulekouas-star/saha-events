"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import NavBar from "@/components/NavBar"
import { useTheme } from "@/components/ThemeContext"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const router = useRouter()
  const {
    t, dark, bg, border, text, textMuted, accent, accentGlow,
    cardShadow, hoverShadow, glassCard, glassBorder, isRTL, lang,
  } = useTheme()

  const displayFont = lang === "ar"
    ? "'El Messiri', 'Amiri', serif"
    : "'Cormorant Garamond', Georgia, serif"

  const [user, setUser] = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null); setSessionLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null); setSessionLoaded(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const features = [
    { icon: "✦", title: t.premium, desc: t.premium_desc },
    { icon: "◈", title: t.secure,  desc: t.secure_desc  },
    { icon: "◎", title: t.instant, desc: t.instant_desc },
  ]

  return (
    <div style={{ minHeight: "100vh", background: bg, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Ambient background blobs */}
      <div className="ambient-blob" style={{
        position: "absolute", top: "-15vh", left: "-8vw", width: "55vw", height: "55vh",
        background: `radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)`,
        animation: "ambientFloat 22s ease-in-out infinite alternate",
      }} />
      <div className="ambient-blob" style={{
        position: "absolute", bottom: "-15vh", right: "-8vw", width: "45vw", height: "45vh",
        background: `radial-gradient(circle, rgba(168,134,58,0.08) 0%, transparent 70%)`,
        animation: "ambientFloat 28s ease-in-out infinite alternate-reverse",
      }} />

      <NavBar />

      <main style={{ flex: 1 }}>
        {/* ── HERO ── */}
      <section style={{ position: "relative", height: 560, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600&q=85')`,
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
          <div className={dark ? (isRTL ? "hero-overlay-dark-rtl" : "hero-overlay-dark") : (isRTL ? "hero-overlay-light-rtl" : "hero-overlay-light")} style={{ position: "absolute", inset: 0 }} />
        </div>

        {/* Subtle top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.5,
        }} />

        <div style={{
          position: "relative", zIndex: 2,
          padding: "140px 60px 100px",
          maxWidth: 640,
          marginLeft: isRTL ? "auto" : 0,
          textAlign: isRTL ? "right" : "left",
        }}>
          <p className="fade-up section-label" style={{ 
            fontSize: 10, 
            letterSpacing: "0.32em", 
            textTransform: "uppercase", 
            color: accent,
            marginBottom: 16, 
            fontWeight: 600 
          }}>
            {t.welcome}
          </p>
          <h1
            className="fade-up delay-1"
            style={{
              fontFamily: displayFont,
              fontSize: isRTL ? 64 : 58, 
              fontWeight: 400, lineHeight: 1.1,
              color: dark ? "#fff" : "#1a1208", marginBottom: 20,
              textShadow: dark ? "0 2px 10px rgba(0,0,0,0.3)" : "none"
            }}
          >
            {t.hero_before}
              <em style={{
                color: accent, fontStyle: isRTL ? "normal" : "italic",
                fontFamily: isRTL ? "'Amiri', serif" : "inherit",
                fontSize: isRTL ? "1.1em" : "inherit",
                textShadow: `0 0 40px ${accentGlow}, 0 2px 4px rgba(0,0,0,0.2)`
              }}>
                {t.hero_colored}
              </em>
            {t.hero_after}
          </h1>
          <p
            className="fade-up delay-2"
            style={{ 
              fontSize: isRTL ? 18 : 16, 
              color: dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)", 
              lineHeight: 1.7, 
              marginBottom: 24, 
              maxWidth: 520, 
              margin: isRTL ? "0 0 24px auto" : "0 auto 24px 0",
              textShadow: dark ? "0 1px 4px rgba(0,0,0,0.5)" : "none",
              fontWeight: isRTL ? 500 : 400
            }}
          >
            {t.hero_sub}
          </p>

          <div
            className="fade-up delay-3"
            style={{ 
              display: "flex", 
              gap: 14, 
              justifyContent: isRTL ? "flex-start" : "flex-start", 
              alignItems: "center" 
            }}
          >
            <button
              onClick={() => router.push("/venues")}
              className="btn-glow"
              style={{
                padding: "12px 28px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                background: `linear-gradient(135deg, ${accent}, #b8943c)`,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                boxShadow: `0 3px 14px ${accentGlow}`,
                transition: "box-shadow 0.28s, transform 0.28s",
                letterSpacing: "0.02em",
                display: "flex", alignItems: "center", gap: 8
              }}
            >
              {t.browse}
              <span>{isRTL ? "←" : "→"}</span>
            </button>

            {sessionLoaded && !user && (
              <button
                onClick={() => router.push("/signup")}
                className="btn-glow"
                style={{
                  padding: "12px 28px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${accent}, #b8943c)`,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: `0 3px 14px ${accentGlow}`,
                  transition: "box-shadow 0.28s, transform 0.28s",
                  letterSpacing: "0.02em",
                  display: "flex", alignItems: "center", gap: 8
                }}
              >
                {t.create_account} {isRTL ? "←" : "→"}
              </button>
            )}
            {sessionLoaded && user && (
              <button
                onClick={() => router.push("/profile")}
                className="btn-glow"
                style={{
                  padding: "12px 28px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${accent}, #b8943c)`,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: `0 3px 14px ${accentGlow}`,
                  transition: "box-shadow 0.28s, transform 0.28s",
                  letterSpacing: "0.02em",
                  display: "flex", alignItems: "center", gap: 8
                }}
              >
                {t.my_profile} {isRTL ? "←" : "→"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{
        padding: "96px 60px",
        maxWidth: 1100, margin: "0 auto",
        position: "relative", zIndex: 1,
      }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 64 }}>
          <p className="section-label" style={{ marginBottom: 14 }}>{t.why}</p>
          <h2 style={{
            fontFamily: displayFont,
            fontSize: 42, fontWeight: 400, color: text,
            letterSpacing: lang === "ar" ? "0" : "-0.01em",
          }}>
            {t.everything}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {features.map((f, i) => (
            <div
              key={i}
              className={`fade-up delay-${i + 1} ${dark ? "card-dark" : "card"}`}
              style={{ padding: "36px 30px" }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 20,
                background: `radial-gradient(circle, ${accentGlow} 0%, transparent 75%)`,
                border: `1px solid ${dark ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.14)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, color: accent,
                boxShadow: `0 4px 18px ${accentGlow}`,
              }}>
                {f.icon}
              </div>
              <div style={{
                fontFamily: displayFont,
                fontSize: 18, fontWeight: 500, color: text, marginBottom: 10,
              }}>
                {f.title}
              </div>
              <div style={{ fontSize: 14, color: textMuted, lineHeight: 1.7 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" style={{
        padding: "0 60px 96px",
        maxWidth: 1100, margin: "0 auto",
        position: "relative", zIndex: 1,
        scrollMarginTop: "15vh",
      }}>
        <div
          className={`fade-up ${dark ? "card-dark" : "card"}`}
          style={{
            display: "flex",
            flexDirection: isRTL ? "row-reverse" : "row",
            padding: 0, overflow: "hidden",
          }}
        >
          <div style={{
            flex: 1, padding: "56px",
            display: "flex", flexDirection: "column", justifyContent: "center",
            textAlign: isRTL ? "right" : "left",
          }}>
            <p className="section-label" style={{ marginBottom: 14 }}>{t.about_us}</p>
            <h2 style={{
              fontFamily: displayFont,
              fontSize: 38, fontWeight: 400, color: text,
              marginBottom: 20, lineHeight: 1.25,
              letterSpacing: lang === "ar" ? "0" : "-0.01em",
            }}>
              {t.welcome}
            </h2>
            <p style={{ fontSize: 15, color: textMuted, lineHeight: 1.85 }}>
              {t.about_desc}
            </p>
          </div>

          <div style={{ flex: 1, minHeight: 420, position: "relative" }}>
            <img
              src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80"
              alt="About Saha Events"
              style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: isRTL
                ? `linear-gradient(to left, ${dark ? "rgba(14,12,9,0.80)" : "rgba(248,244,238,0.55)"} 0%, transparent 65%)`
                : `linear-gradient(to right, ${dark ? "rgba(14,12,9,0.80)" : "rgba(248,244,238,0.55)"} 0%, transparent 65%)`,
            }} />
          </div>
        </div>
      </section>
    </main>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
        padding: "28px 60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: dark ? "rgba(12,10,7,0.6)" : "rgba(245,240,234,0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "relative", zIndex: 1,
      }}>
        <Link href="/">
          <img
            src="/logo.png"
            alt="Saha Events"
            style={{ height: 28, filter: dark ? "invert(1) brightness(0.6)" : "none" }}
          />
        </Link>
        <p style={{ fontSize: 12, color: textMuted }}>{t.footer_copy}</p>
        <div style={{ display: "flex", gap: 28 }}>
          {[
            { href: "/venues", label: t.venues },
            { href: "/bookings", label: t.bookings },
            { href: "/login", label: t.login },
          ].filter(l => !(l.href === "/login" && user)).map(l => (
            <Link
              key={l.href} href={l.href}
              style={{ fontSize: 12, color: textMuted, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = accent}
              onMouseLeave={e => e.currentTarget.style.color = textMuted}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}