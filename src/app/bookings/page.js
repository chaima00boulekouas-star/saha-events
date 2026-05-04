"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import NavBar from "@/components/NavBar"
import { useTheme } from "@/components/ThemeContext"

const VENUE_PHOTOS = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
  "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&q=80",
]

export default function BookingsPage() {
  const { t, bg, bgCard, border, text, textMuted, accent, accentGlow, dark, isRTL, lang, glassCard, glassFilter, glassBorder, cardShadow } = useTheme()
  const headingFont = lang === "ar" ? "'Amiri','Tajawal',serif" : "'Playfair Display',serif"
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [receiptModal, setReceiptModal] = useState(null)
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const pendingColor = "#f59e0b"
  const confirmedColor = "#10b981"
  const cancelledColor = "#ef4444"

  useEffect(() => { getBookings() }, [])

  async function getBookings() {
    const { data: { session } } = await supabase.auth.getSession()
    setSessionLoaded(true)
    if (!session) { setUser(null); setLoading(false); return }
    setUser(session.user)

    const { data: bookingsData, error } = await supabase
      .from("bookings")
      .select("id, user_id, venue_id, date, status, payment_receipt_url")
      .eq("user_id", session.user.id)
      .neq("status", "cancelled")

    if (error) { console.error(error.message); setLoading(false); return }
    if (!bookingsData?.length) { setBookings([]); setLoading(false); return }

    const enriched = await Promise.all(
      bookingsData.map(async (b) => {
        const { data: venue } = await supabase.from("venues").select("name, brand, location, price_per_day, image_url").eq("id", b.venue_id).single()
        let receiptUrl = null
        if (b.payment_receipt_url) {
          const { data: urlData } = supabase.storage.from("payment receipt").getPublicUrl(b.payment_receipt_url)
          receiptUrl = urlData?.publicUrl || null
        }
        return { ...b, venue: venue || {}, receiptUrl }
      })
    )
    setBookings(enriched)
    setLoading(false)
  }

  async function confirmCancel() {
    if (!cancelModal) return
    setCancelling(true)
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", cancelModal.id)
    setCancelling(false)
    if (error) { alert("Error: " + error.message); return }
    setBookings(prev => prev.filter(b => b.id !== cancelModal.id))
    setCancelModal(null)
  }

  function statusColor(s) {
    if (s === "confirmed") return confirmedColor
    if (s === "cancelled") return cancelledColor
    return pendingColor
  }

  function statusLabel(s) {
    if (s === "confirmed") return t.confirmed || "Confirmed"
    if (s === "cancelled") return t.cancelled || "Cancelled"
    return t.pending || "Pending"
  }

  function isImage(url) {
    if (!url) return false
    const ext = url.split("?")[0].split(".").pop().toLowerCase()
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
  }

  return (
    <div className={`ambient-bg${dark ? " ambient-bg-dark" : ""}`} style={{ minHeight: "100vh", background: bg }}>
      <NavBar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 32px 48px" }}>

        <div className="fade-up" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{
              fontFamily: headingFont, fontSize: 40, fontWeight: 500,
              color: text, marginBottom: 10, letterSpacing: lang === "ar" ? "0" : "-0.01em",
            }}>
              {t.my_bookings_title}
            </h1>
            <p style={{ fontSize: 15, color: textMuted, lineHeight: 1.6 }}>{t.my_bookings_sub}</p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: `3px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
              borderTopColor: accent,
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: textMuted, fontSize: 14 }}>{t.loading_dashboard}</p>
          </div>
        )}

        {!loading && sessionLoaded && !user && (
          <div className="fade-up fade-up-delay-1" style={{
            textAlign: "center", padding: "64px 40px",
            background: dark ? "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 30%, transparent 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 30%, transparent 100%)",
            backdropFilter: "blur(80px) saturate(250%)", 
            WebkitBackdropFilter: "blur(80px) saturate(250%)",
            borderRadius: 36, 
            border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)"}`,
            boxShadow: dark
              ? `0 50px 120px rgba(0,0,0,0.8), 0 0 160px rgba(201,168,76,0.3), inset 1.5px 1.5px 0 rgba(255,255,255,0.2), inset -1.5px -1.5px 0 rgba(255,255,255,0.05)`
              : `0 50px 120px rgba(0,0,0,0.15), 0 0 160px rgba(201,168,76,0.3), inset 1.5px 1.5px 0 rgba(255,255,255,0.9), inset -1.5px -1.5px 0 rgba(255,255,255,0.2)`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 450, height: 300, background: `radial-gradient(ellipse, rgba(201,168,76,0.4) 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 24px",
              background: `linear-gradient(135deg, ${accent}, #b8943c)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, boxShadow: `0 6px 24px ${accentGlow}`,
              position: "relative",
            }}>🎉</div>
            <h2 style={{
              fontFamily: headingFont, fontSize: 28, fontWeight: 500,
              color: text, marginBottom: 12, position: "relative",
            }}>
              {t.join_start_booking}
            </h2>
            <p style={{
              color: textMuted, fontSize: 15, marginBottom: 32, lineHeight: 1.7,
              maxWidth: 380, margin: "0 auto 32px", position: "relative",
            }}>
              {t.join_start_sub}
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", position: "relative" }}>
              <button onClick={() => router.push("/login")} className="btn-glow" style={{
                padding: "14px 32px", borderRadius: 999,
                background: `linear-gradient(135deg, ${accent}, #b8943c)`,
                color: "#fff", fontSize: 14, fontWeight: 600, border: "none",
                cursor: "pointer", boxShadow: `0 6px 24px ${accentGlow}`,
                letterSpacing: "0.02em", fontFamily: "inherit",
              }}>{t.signin_btn}</button>
              <button onClick={() => router.push("/signup")} style={{
                padding: "14px 32px", borderRadius: 999,
                background: "transparent", color: text,
                fontSize: 14, fontWeight: 600,
                border: `1.5px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"; e.currentTarget.style.color = text }}
              >{t.signup_btn}</button>
            </div>
          </div>
        )}

        {!loading && user && bookings.length === 0 && (
          <div className="fade-up fade-up-delay-1" style={{
            textAlign: "center", padding: "64px 40px",
            background: dark ? "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 30%, transparent 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 30%, transparent 100%)",
            backdropFilter: "blur(80px) saturate(250%)", 
            WebkitBackdropFilter: "blur(80px) saturate(250%)",
            borderRadius: 36, 
            border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)"}`,
            boxShadow: dark
              ? `0 50px 120px rgba(0,0,0,0.8), 0 0 160px rgba(201,168,76,0.3), inset 1.5px 1.5px 0 rgba(255,255,255,0.2), inset -1.5px -1.5px 0 rgba(255,255,255,0.05)`
              : `0 50px 120px rgba(0,0,0,0.15), 0 0 160px rgba(201,168,76,0.3), inset 1.5px 1.5px 0 rgba(255,255,255,0.9), inset -1.5px -1.5px 0 rgba(255,255,255,0.2)`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 450, height: 300, background: `radial-gradient(ellipse, rgba(201,168,76,0.4) 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>📋</div>
            <p style={{
              color: text, fontSize: 22, fontFamily: headingFont,
              marginBottom: 12, fontWeight: 500,
            }}>
              {t.no_bookings_title}
            </p>
            <p style={{ color: textMuted, fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              {t.no_bookings_msg}
            </p>
            <a href="/venues" className="btn-glow" style={{
              display: "inline-block",
              background: `linear-gradient(135deg, ${accent}, #b8943c)`,
              color: "#fff", padding: "13px 30px",
              borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 600,
              boxShadow: `0 6px 24px ${accentGlow}`,
              letterSpacing: "0.02em",
            }}>
              {t.explore_venues}
            </a>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {bookings.map((b, i) => {
            const color = statusColor(b.status)
            const photo = b.venue?.image_url || VENUE_PHOTOS[(b.venue_id || 0) % VENUE_PHOTOS.length]
            return (
              <div key={b.id} className={`fade-up ${"fade-up-delay-" + ((i % 4) + 1)}`} style={{
                background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)",
                backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                borderRadius: 22, padding: 22, display: "flex", gap: 24, alignItems: "center",
                border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                boxShadow: dark
                  ? "0 8px 32px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.03) inset"
                  : "0 8px 32px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.8) inset",
                transition: "transform 0.28s ease, box-shadow 0.28s ease",
                cursor: "pointer",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)"
                  e.currentTarget.style.boxShadow = dark
                    ? `0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px rgba(201,168,76,0.1)`
                    : `0 16px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(201,168,76,0.1)`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = dark
                    ? "0 8px 32px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.03) inset"
                    : "0 8px 32px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.8) inset"
                }}
              >
                <img src={photo} alt="" style={{
                  width: 140, height: 110, borderRadius: 16, objectFit: "cover",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <h3 style={{
                      fontSize: 20, fontWeight: 600, color: text,
                      fontFamily: headingFont,
                    }}>{b.venue?.name || "Venue"}</h3>
                    <span style={{
                      padding: "4px 13px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.03em",
                      background: color + "12", color: color,
                      border: `1px solid ${color}28`,
                    }}>
                      <span style={{
                        display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                        background: color, marginRight: 7, verticalAlign: "middle", marginBottom: 1,
                        boxShadow: `0 0 8px ${color}60`,
                      }} />
                      {statusLabel(b.status)}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 24, color: textMuted, fontSize: 14 }}>
                    <span>📍 {b.venue?.location || b.venue?.brand || "Location"}</span>
                    {b.date && <span>📅 {new Date(b.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </div>
                </div>

                <div style={{
                  textAlign: "right",
                  borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  paddingLeft: 24,
                  display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
                }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: text, marginBottom: 4 }}>
                    {b.venue?.price_per_day?.toLocaleString()}
                    <span style={{ fontSize: 13, fontWeight: 400, color: textMuted }}> DA</span>
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {b.receiptUrl && (
                      <button onClick={(e) => { e.stopPropagation(); setReceiptModal({ url: b.receiptUrl, name: b.venue?.name }) }} style={{
                        padding: "8px 20px", borderRadius: 999,
                        background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                        color: text, fontSize: 13, fontWeight: 500,
                        border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                        cursor: "pointer",
                        transition: "all 0.25s ease",
                      }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"
                          e.currentTarget.style.borderColor = accent
                          e.currentTarget.style.color = accent
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"
                          e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
                          e.currentTarget.style.color = text
                        }}
                      >
                        {t.view_receipt_btn}
                      </button>
                    )}
                    {b.status === "pending" && (
                      <button onClick={(e) => { e.stopPropagation(); setCancelModal({ id: b.id, name: b.venue?.name }) }} style={{
                        padding: "8px 20px", borderRadius: 999,
                        background: dark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
                        color: cancelledColor, fontSize: 13, fontWeight: 600,
                        border: `1px solid ${cancelledColor}33`,
                        cursor: "pointer",
                        transition: "all 0.25s ease",
                      }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = cancelledColor
                          e.currentTarget.style.color = "#fff"
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = dark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)"
                          e.currentTarget.style.color = cancelledColor
                        }}
                      >
                         ✕ {t.cancel}
                      </button>
                    )}
                  </div>
                  {!b.receiptUrl && b.status !== "pending" && (
                    <span style={{ fontSize: 12, color: textMuted, opacity: 0.5 }}>{t.no_receipt}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div
          className="modal-overlay-animate"
          onClick={() => setReceiptModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 600,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            className="receipt-modal"
            onClick={e => e.stopPropagation()}
            style={{
              background: glassCard,
              backdropFilter: glassFilter,
              WebkitBackdropFilter: glassFilter,
              borderRadius: 24,
              border: `1px solid ${glassBorder}`,
              width: "100%", maxWidth: 600, maxHeight: "90vh",
              display: "flex", flexDirection: "column",
              boxShadow: cardShadow,
            }}
          >
            <div style={{
              padding: "22px 28px",
              borderBottom: `1px solid ${glassBorder}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, fontWeight: 600 }}>{t.payment_receipt_title}</p>
                <p style={{ fontSize: 17, fontWeight: 600, color: text, fontFamily: headingFont }}>{receiptModal.name}</p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <a href={receiptModal.url} download className="btn-glow" style={{
                  padding: "9px 22px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: `linear-gradient(135deg, ${accent}, #b8943c)`,
                  color: "#fff", textDecoration: "none",
                  boxShadow: `0 4px 16px ${accentGlow}`,
                }}>{t.download}</a>
                <button
                  onClick={() => setReceiptModal(null)}
                  style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    border: `1px solid ${glassBorder}`,
                    color: text, fontSize: 20, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.25s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}
                >×</button>
              </div>
            </div>
            <div style={{ padding: 24, overflow: "auto" }}>
              {isImage(receiptModal.url)
                ? <img src={receiptModal.url} alt="Receipt" style={{ width: "100%", borderRadius: 14, display: "block" }} />
                : <iframe src={receiptModal.url} title="Receipt" style={{ width: "100%", height: 500, border: "none", borderRadius: 14 }} />
              }
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div className="modal-overlay-animate" onClick={() => !cancelling && setCancelModal(null)} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          padding: 24,
        }}>
          <div className="modal-content-animate" onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 420,
            background: dark ? "rgba(18,16,14,0.85)" : "rgba(255,252,248,0.9)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderRadius: 24, overflow: "hidden",
            border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
            boxShadow: dark
              ? "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "0 32px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
            textAlign: "center", padding: "40px 36px 32px",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24,
            }}>⚠️</div>
            <h3 style={{ fontFamily: headingFont, fontSize: 22, fontWeight: 500, color: text, marginBottom: 10 }}>{t.cancel_title}</h3>
            <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.6, marginBottom: 8 }}>
              {t.cancel_confirm}
            </p>
            <p style={{ fontSize: 15, color: text, fontWeight: 600, marginBottom: 28 }}>
              {cancelModal.name}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setCancelModal(null)} disabled={cancelling} style={{
                padding: "12px 28px", borderRadius: 999, fontSize: 14, fontWeight: 600,
                background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                color: text, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                cursor: "pointer", transition: "all 0.25s", fontFamily: "inherit",
              }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
              >{t.keep}</button>
              <button onClick={confirmCancel} disabled={cancelling} style={{
                padding: "12px 28px", borderRadius: 999, fontSize: 14, fontWeight: 600,
                background: cancelling ? "rgba(239,68,68,0.5)" : cancelledColor,
                color: "#fff", border: "none",
                cursor: cancelling ? "default" : "pointer",
                boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
                transition: "all 0.25s", fontFamily: "inherit",
                opacity: cancelling ? 0.7 : 1,
              }}>{cancelling ? t.cancelling_text : t.yes_cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}