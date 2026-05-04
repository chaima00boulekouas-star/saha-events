"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import NavBar from "@/components/NavBar"
import { useTheme } from "@/components/ThemeContext"
import VenueModal from "@/components/VenueModal"

const VENUE_PHOTOS = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
  "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&q=80",
  "https://images.unsplash.com/photo-1561912774-79769a0a0a7a?w=800&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
]

const ALGERIAN_CITIES = [
  "Alger Centre, Alger", "Sidi Yahia, Alger", "Oran",
  "Constantine", "Tlemcen", "Annaba", "Blida", "Sétif",
]

export default function VenuesPage() {
  const router = useRouter()
  const { t, bg, border, text, textMuted, accent, accentGlow, dark, glassCard, glassBorder, glassFilter, cardShadow, isRTL, lang } = useTheme()
  const headingFont = lang === "ar" ? "'Amiri','Tajawal',serif" : "'Playfair Display',serif"

  const CATEGORIES = [
    { key: "All", label: t.all },
    { key: "Outdoor", label: t.outdoor },
    { key: "Wedding", label: t.wedding },
    { key: "Concert", label: t.concert },
    { key: "Conference", label: t.conference }
  ]
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => { getVenues() }, [])

  async function getVenues() {
    const { data, error } = await supabase.from("venues").select("*")
    if (!error) setVenues(data || [])
    setLoading(false)
  }

  const filteredVenues = venues.filter(v => {
    const searchMatch = v.name.toLowerCase().includes(search.toLowerCase()) ||
                        (v.brand && v.brand.toLowerCase().includes(search.toLowerCase())) ||
                        (v.location && v.location.toLowerCase().includes(search.toLowerCase()))
    
    const catMatch = activeCategory === "All" || (v.brand && v.brand.toLowerCase().includes(activeCategory.toLowerCase()))
    
    return searchMatch && catMatch
  })

  useEffect(() => { setActiveIndex(0) }, [search, activeCategory, venues])

  const nextSlide = () => setActiveIndex(prev => (prev + 1) % filteredVenues.length)
  const prevSlide = () => setActiveIndex(prev => (prev - 1 + filteredVenues.length) % filteredVenues.length)

  return (
    <div className={`ambient-bg${dark ? " ambient-bg-dark" : ""}`} style={{ minHeight: "100vh", background: bg }}>
      <NavBar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 32px 24px" }}>

        <div className="fade-up" style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{
            fontFamily: headingFont, fontSize: 36, fontWeight: 500,
            color: text, marginBottom: 8, letterSpacing: lang === "ar" ? "0" : "-0.01em",
          }}>
            {t.discover_venues}
          </h1>
          <p style={{ fontSize: 14, color: textMuted, maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
            {t.discover_venues_sub}
          </p>
        </div>

        {/* Search & Filters — single unified bar */}
        <div className="fade-up fade-up-delay-1" style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
          background: glassCard,
          backdropFilter: glassFilter, WebkitBackdropFilter: glassFilter,
          borderRadius: 999,
          border: `1px solid ${glassBorder}`,
          padding: "5px 6px 5px 20px",
          boxShadow: cardShadow,
          maxWidth: 960, margin: "0 auto 24px",
        }}>
          <span style={{ fontSize: 16, color: textMuted, opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder={t.search_venues}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              padding: "8px 10px", color: text, fontSize: 14, fontFamily: "inherit",
              minWidth: 120,
            }}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
                padding: "7px 16px", borderRadius: 999, cursor: "pointer", fontSize: 12,
                fontWeight: activeCategory === cat.key ? 600 : 500, whiteSpace: "nowrap",
                background: activeCategory === cat.key
                  ? `linear-gradient(135deg, ${accent}, #b8943c)`
                  : "transparent",
                color: activeCategory === cat.key ? "#fff" : textMuted,
                border: activeCategory === cat.key ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                transition: "all 0.25s ease",
                boxShadow: activeCategory === cat.key ? `0 2px 10px ${accentGlow}` : "none",
              }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: `3px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
              borderTopColor: accent,
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: textMuted, fontSize: 14 }}>{t.loading}</p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <p style={{ color: textMuted, textAlign: "center", padding: "60px 0", fontSize: 15 }}>{t.no_venues}</p>
        ) : (() => {
          /* ── Stacked 3-Card Deck ── */
          const len = filteredVenues.length
          const centerIdx = activeIndex
          const leftIdx = (activeIndex - 1 + len) % len
          const rightIdx = (activeIndex + 1) % len

          /* Build the 3 visible slots */
          const slots = []
          if (len === 1) {
            slots.push({ venue: filteredVenues[centerIdx], origIdx: centerIdx, role: "center" })
          } else if (len === 2) {
            slots.push({ venue: filteredVenues[leftIdx], origIdx: leftIdx, role: "left" })
            slots.push({ venue: filteredVenues[centerIdx], origIdx: centerIdx, role: "center" })
          } else {
            slots.push({ venue: filteredVenues[leftIdx], origIdx: leftIdx, role: "left" })
            slots.push({ venue: filteredVenues[centerIdx], origIdx: centerIdx, role: "center" })
            slots.push({ venue: filteredVenues[rightIdx], origIdx: rightIdx, role: "right" })
          }

          /* Per-role styles — these create the stacked deck look */
          const roleStyles = {
            left: {
              left: "50%",
              transform: isRTL ? "translateX(65%) scale(0.86)" : "translateX(-165%) scale(0.86)",
              zIndex: 2,
              opacity: 0.75,
              filter: "brightness(0.85)",
            },
            center: {
              left: "50%",
              transform: "translateX(-50%) scale(1)",
              zIndex: 4,
              opacity: 1,
              filter: "brightness(1)",
            },
            right: {
              left: "50%",
              transform: isRTL ? "translateX(-165%) scale(0.86)" : "translateX(65%) scale(0.86)",
              zIndex: 2,
              opacity: 0.75,
              filter: "brightness(0.85)",
            },
          }

          return (
            <div style={{
              position: "relative", height: 420, width: "100%",
              display: "flex", justifyContent: "center", alignItems: "center",
            }}>
              {/* ── The Stage ── */}
              <div style={{
                position: "relative", width: 700, height: 400,
              }}>
                {slots.map(({ venue, origIdx, role }) => {
                  const photo = venue.image_url || VENUE_PHOTOS[origIdx % VENUE_PHOTOS.length]
                  const city = venue.location || ALGERIAN_CITIES[origIdx % ALGERIAN_CITIES.length]
                  const rs = roleStyles[role]

                  return (
                    <div
                      key={venue.id + "-" + role}
                      style={{
                        position: "absolute",
                        top: role === "center" ? 0 : 20,
                        left: rs.left,
                        width: role === "center" ? 340 : 290,
                        height: role === "center" ? 400 : 350,
                        transform: rs.transform,
                        zIndex: rs.zIndex,
                        opacity: rs.opacity,
                        filter: rs.filter,
                        transition: "all 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      <div
                        onClick={() => {
                          if (role === "center") setSelectedVenue({ ...venue, _photo: photo, _city: city })
                          else if (role === "left") prevSlide()
                          else if (role === "right") nextSlide()
                        }}
                        className={`venue-card-glow ${dark ? "hover-lift-dark" : "hover-lift"}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 24, overflow: "hidden", cursor: "pointer",
                          display: "flex", flexDirection: "column", justifyContent: "flex-end",
                          boxShadow: role === "center"
                            ? (dark
                                ? "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)"
                                : "0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.6)")
                            : (dark
                                ? "0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)"
                                : "0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.4)"),
                          transition: "all 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        <img src={photo} alt={venue.name} style={{
                          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                          zIndex: 0,
                        }} />
                      <div
                        className="venue-img-overlay"
                        style={{
                          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)",
                          zIndex: 1,
                        }}
                      />

                      {/* Rating badge */}
                      <div style={{
                        position: "absolute", top: 18, right: 18, zIndex: 2,
                        background: "rgba(20,18,16,0.55)", backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        padding: "6px 13px", borderRadius: 999,
                        display: "flex", alignItems: "center", gap: 6,
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}>
                        <span style={{ color: accent, fontSize: 13 }}>★</span>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>4.{5 + (origIdx % 5)}</span>
                      </div>

                      <div style={{ position: "relative", zIndex: 2, padding: "24px 24px 22px" }}>
                        <p style={{
                          color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 8,
                          textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
                        }}>
                          {city}
                        </p>
                        <h2 style={{
                          fontSize: role === "center" ? 24 : 18, fontWeight: 500, color: "#fff",
                          fontFamily: headingFont, marginBottom: role === "center" ? 16 : 10,
                          letterSpacing: lang === "ar" ? "0" : "-0.01em",
                        }}>
                          {venue.name}
                        </h2>

                        {/* Price bar — only on center card for clarity */}
                        {role === "center" && (
                          <div style={{
                            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)", borderRadius: 14, padding: "14px 20px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            border: "1px solid rgba(255,255,255,0.14)",
                            transition: "all 0.3s ease",
                          }}>
                            <div>
                              <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>
                                {venue.price_per_day?.toLocaleString()}
                              </span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginLeft: 4 }}> DA / night</span>
                            </div>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: "rgba(255,255,255,0.95)", display: "flex",
                              alignItems: "center", justifyContent: "center",
                              color: "#000", fontWeight: 600, fontSize: 14,
                              transition: "transform 0.25s ease, box-shadow 0.25s ease",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}>
                              ↗
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>

              {/* Navigation arrows */}
              {len > 1 && (
                <>
                  <button onClick={prevSlide} style={{
                    position: "absolute", left: "calc(50% - 380px)", top: "50%", transform: "translateY(-50%)", zIndex: 10,
                    width: 44, height: 44, borderRadius: "50%", background: dark ? "rgba(20,18,16,0.5)" : "rgba(255,255,255,0.6)",
                    border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)"}`,
                    color: text, fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    backdropFilter: "blur(12px)", transition: "all 0.3s", boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
                  }}>‹</button>
                  <button onClick={nextSlide} style={{
                    position: "absolute", left: "calc(50% + 380px)", top: "50%", transform: "translate(-100%, -50%)", zIndex: 10,
                    width: 44, height: 44, borderRadius: "50%", background: dark ? "rgba(20,18,16,0.5)" : "rgba(255,255,255,0.6)",
                    border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)"}`,
                    color: text, fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    backdropFilter: "blur(12px)", transition: "all 0.3s", boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
                  }}>›</button>

                  <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
                    {filteredVenues.map((_, i) => (
                      <div key={i} onClick={() => setActiveIndex(i)} style={{
                        width: i === activeIndex ? 24 : 8, height: 8, borderRadius: 4,
                        background: i === activeIndex ? accent : textMuted, opacity: i === activeIndex ? 1 : 0.4,
                        cursor: "pointer", transition: "all 0.3s"
                      }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })()
        }
      </div>

      {selectedVenue && (
        <VenueModal venue={selectedVenue} onClose={() => setSelectedVenue(null)} />
      )}
    </div>
  )
}