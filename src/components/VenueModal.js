"use client"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "@/components/ThemeContext"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const VENUE_PHOTOS = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80",
  "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1600&q=80",
  "https://images.unsplash.com/photo-1561912774-79769a0a0a7a?w=1600&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80",
]

export default function VenueModal({ venue, onClose }) {
  const { t, bg, border, text, textMuted, accent, accentGlow, dark, glassCard, glassBorder, glassFilter, cardShadow, isRTL, lang } = useTheme()
  const headingFont = lang === "ar" ? "'Amiri','Tajawal',serif" : "'Playfair Display',serif"
  const router = useRouter()
  const modalText = dark ? text : "#f8f8f8"
  const modalMuted = dark ? textMuted : "rgba(255,255,255,0.7)"

  const [user, setUser] = useState(null)
  const [date, setDate] = useState("")
  const [file, setFile] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "unset" }
  }, [])

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [onClose])

  if (!venue) return null

  const photo = venue._photo || venue.image_url || VENUE_PHOTOS[0]

  async function handleBook() {
    setErrorMsg(""); setSuccessMsg("")
    if (!user) return
    if (!date) { setErrorMsg(t.select_date_first); return }
    if (!file) { setErrorMsg(t.upload_receipt); return }

    setBookingLoading(true)

    const { data: existingBookings, error: checkError } = await supabase
      .from("bookings").select("id, status")
      .eq("venue_id", venue.id).eq("date", date).neq("status", "cancelled")

    if (checkError) { setErrorMsg(checkError.message); setBookingLoading(false); return }
    if (existingBookings && existingBookings.length > 0) {
      setErrorMsg(t.date_taken)
      setBookingLoading(false); return
    }

    const fileName = `${user.id}-${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase
      .storage.from("payment receipt").upload(fileName, file)

    if (uploadError) { setErrorMsg(uploadError.message); setBookingLoading(false); return }

    const { error: insertError } = await supabase.from("bookings").insert({
      user_id: user.id, venue_id: venue.id, status: "pending",
      date, payment_receipt_url: uploadData.path,
    })

    setBookingLoading(false)
    if (insertError) setErrorMsg(insertError.message)
    else { setSuccessMsg(t.booked_success); setDate(""); setFile(null); setShowSuccessPopup(true) }
  }

  function handleDrop(e) {
    e.preventDefault(); setIsDragOver(false)
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])
  }

  return (
    <>
    {/* ── SUCCESS POPUP OVERLAY ── */}
    {showSuccessPopup && (
      <div className="modal-overlay-animate" style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        padding: 24,
      }}>
        <div className="modal-content-animate" style={{
          background: dark
            ? "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 100%)",
          backdropFilter: "blur(80px) saturate(200%)",
          WebkitBackdropFilter: "blur(80px) saturate(200%)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.8)"}`,
          borderRadius: 28, padding: "48px 44px", maxWidth: 420, width: "100%",
          boxShadow: dark
            ? "0 60px 120px rgba(0,0,0,0.8), 0 0 80px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.1)"
            : "0 60px 120px rgba(0,0,0,0.12), 0 0 80px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
          textAlign: "center", position: "relative",
        }}>
          {/* Ambient glow */}
          <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 240, height: 120, background: "radial-gradient(ellipse, rgba(16,185,129,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Animated checkmark circle */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
            background: "linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.08) 100%)",
            border: "2px solid rgba(16,185,129,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(16,185,129,0.2)",
            animation: "fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500,
            color: text, marginBottom: 10, letterSpacing: "-0.01em",
          }}>{t.booked_success}</h2>

          {/* Venue name */}
          <p style={{ fontSize: 14, color: accent, fontWeight: 600, marginBottom: 6 }}>{venue.name}</p>

          {/* Status message */}
          <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.7, marginBottom: 32 }}>
            {t.awaiting}
          </p>

          {/* Divider */}
          <div className="glass-divider" style={{ marginBottom: 28 }} />

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => { setShowSuccessPopup(false); onClose(); router.push("/bookings") }} className="btn-glow" style={{
              flex: 1, padding: "13px 0", borderRadius: 999,
              background: `linear-gradient(135deg, ${accent}, #b8943c)`,
              color: "#fff", fontSize: 14, fontWeight: 600, border: "none",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
            }}>{t.my_bookings}</button>
            <button onClick={() => setShowSuccessPopup(false)} style={{
              flex: 1, padding: "13px 0", borderRadius: 999,
              background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: text, fontSize: 14, fontWeight: 500, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.25s",
            }}>{t.cancel}</button>
          </div>
        </div>
      </div>
    )}

    <div className="modal-overlay-animate" style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(16px) saturate(120%)",
      WebkitBackdropFilter: "blur(16px) saturate(120%)",
      padding: "20px",
    }} onClick={onClose}>

      <div className="modal-content-animate" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 960, maxHeight: "88vh",
        display: "flex", flexDirection: isRTL ? "row-reverse" : "row",
        background: dark ? "rgba(18,16,14,0.45)" : "rgba(255,252,248,0.35)",
        backdropFilter: "blur(50px) saturate(200%)",
        WebkitBackdropFilter: "blur(50px) saturate(200%)",
        borderRadius: 24, overflow: "hidden",
        border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)"}`,
        boxShadow: dark
          ? `0 40px 100px rgba(0,0,0,0.7), 0 0 80px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`
          : `0 40px 100px rgba(0,0,0,0.15), 0 0 80px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.9)`,
        position: "relative",
      }}>

        <div style={{
          flex: "1 1 55%", padding: "24px 30px 28px", display: "flex", flexDirection: "column",
          overflowY: "auto", minHeight: 0, textAlign: isRTL ? "right" : "left",
        }}>
          {/* Close button */}
          <button onClick={onClose} style={{
            position: "absolute", top: 16, [isRTL ? "left" : "right"]: 16, width: 38, height: 38,
            borderRadius: "50%", background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
            color: modalText, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 20, fontWeight: 300, transition: "all 0.25s",
            zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
          >×</button>

          {/* Venue header */}
          <div style={{ marginBottom: 10 }}>
            <span style={{
              fontSize: 10, color: accent, textTransform: "uppercase",
              letterSpacing: "0.14em", fontWeight: 700,
            }}>{venue.brand}</span>
            <h2 style={{
              fontSize: 24, fontWeight: 500, color: modalText, marginTop: 4,
              fontFamily: headingFont, letterSpacing: lang === "ar" ? "0" : "-0.01em", lineHeight: 1.2,
            }}>{venue.name}</h2>
            {(venue._city || venue.location) && (
              <p style={{ fontSize: 12, color: modalMuted, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: accent, fontSize: 13 }}>📍</span>
                {venue._city || venue.location}
              </p>
            )}
          </div>

          {/* Price */}
          <div style={{ marginBottom: 10, display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: modalText, fontFamily: headingFont }}>
              {venue.price_per_day?.toLocaleString()}
            </span>
            <span style={{ fontSize: 13, color: modalMuted }}>DA {t.per_day}</span>
          </div>

          <p style={{ fontSize: 12, color: modalMuted, lineHeight: 1.6, marginBottom: 10, maxWidth: 420 }}>
            {venue.description || t.premium_desc}
          </p>

          {/* Amenities */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {[t.premium, "VIP", "Parking", "Sound"].map(a => (
              <span key={a} style={{
                background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                backdropFilter: "blur(8px)",
                padding: "4px 10px", borderRadius: 999, fontSize: 10, color: modalMuted,
                border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                display: "flex", alignItems: "center", gap: 4,
              }}><span style={{ color: accent, fontSize: 8 }}>✦</span>{a}</span>
            ))}
          </div>

          {/* Divider */}
          <div className="glass-divider" style={{ marginBottom: 14 }} />

          {/* Error / Success */}
          {errorMsg && <div style={{
            background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)",
            color: "#ef4444", padding: "10px 14px", borderRadius: 12, fontSize: 13, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 8,
          }}><span>⚠</span>{errorMsg}</div>}
          {successMsg && <div style={{
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)",
            color: "#10b981", padding: "10px 14px", borderRadius: 12, fontSize: 13, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 8,
          }}><span>✓</span>{successMsg}</div>}

          {/* ── GUEST CTA ── */}
          {!user ? (
            <div style={{
              background: dark ? "rgba(201,168,76,0.06)" : "rgba(201,168,76,0.04)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              borderRadius: 16, padding: "18px 16px",
              border: `1px solid ${dark ? "rgba(201,168,76,0.15)" : "rgba(201,168,76,0.12)"}`,
              textAlign: "center", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 160, height: 80, background: `radial-gradient(ellipse, ${accentGlow} 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, #b8943c)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 15, boxShadow: `0 4px 16px ${accentGlow}`, position: "relative" }}>🔒</div>
              <h4 style={{ fontSize: 16, color: modalText, fontFamily: headingFont, marginBottom: 4, fontWeight: 500, position: "relative" }}>{t.sign_in_to_book}</h4>
              <p style={{ fontSize: 11, color: modalMuted, marginBottom: 14, lineHeight: 1.4, position: "relative" }}>{t.login_to_book}</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", position: "relative" }}>
                <button onClick={() => router.push("/login")} className="btn-glow" style={{
                  padding: "10px 22px", borderRadius: 999, background: `linear-gradient(135deg, ${accent}, #b8943c)`,
                  color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  boxShadow: `0 4px 16px ${accentGlow}`, fontFamily: "inherit",
                }}>{t.signin_btn_cta}</button>
                <button onClick={() => router.push("/signup")} style={{
                  padding: "9px 22px", borderRadius: 999,
                  background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  backdropFilter: "blur(8px)",
                  color: modalText,
                  fontSize: 13, fontWeight: 600, border: `1.5px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.25s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"; e.currentTarget.style.color = modalText }}
                >{t.signup_btn_cta}</button>
              </div>
            </div>
          ) : (
            /* ── LOGGED-IN BOOKING ── */
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14, flexDirection: isRTL ? "row-reverse" : "row" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: modalMuted, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.select_date}</label>
                  <input type="date" min={today} value={date} onChange={e => { setDate(e.target.value); setErrorMsg("") }} style={{
                    width: "100%", padding: "11px 14px", borderRadius: 12,
                    border: `1.5px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(210,195,178,0.6)"}`,
                    background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
                    color: modalText, outline: "none", fontSize: 14, fontFamily: "inherit",
                    boxSizing: "border-box", transition: "border-color 0.2s",
                  }} />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: modalMuted, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.receipt_label}</label>
                <div
                  className={`file-drop-zone${file ? " has-file" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    padding: "16px", borderColor: isDragOver ? accent : undefined,
                    background: isDragOver ? (dark ? "rgba(201,168,76,0.06)" : "rgba(201,168,76,0.04)")
                      : file ? (dark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.03)")
                      : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"),
                  }}
                >
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={e => { setFile(e.target.files[0]); setErrorMsg("") }} style={{ display: "none" }} />
                  {file ? (
                    <div><p style={{ fontSize: 13, color: modalText, fontWeight: 500 }}>✓ {file.name}</p><p style={{ fontSize: 11, color: modalMuted }}>{(file.size / 1024).toFixed(0)} KB</p></div>
                  ) : (
                    <div><p style={{ fontSize: 13, color: modalMuted }}>📄 {t.drop_receipt}</p></div>
                  )}
                </div>
              </div>

              <button onClick={handleBook} disabled={bookingLoading || !!successMsg} className="btn-glow" style={{
                width: "100%", padding: "14px 0", borderRadius: 999,
                background: successMsg ? "linear-gradient(135deg, #10b981, #059669)" : `linear-gradient(135deg, ${accent}, #b8943c)`,
                color: "#fff", fontSize: 14, fontWeight: 600, border: "none",
                cursor: (bookingLoading || successMsg) ? "default" : "pointer",
                opacity: bookingLoading ? 0.7 : 1,
                boxShadow: successMsg ? "0 4px 16px rgba(16,185,129,0.3)" : `0 4px 16px ${accentGlow}`,
                fontFamily: "inherit", transition: "all 0.3s",
              }}>
                {bookingLoading ? t.confirm_loading : successMsg ? t.booked_btn : t.confirm_btn}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Image ── */}
        <div style={{
          flex: "0 0 42%", position: "relative", overflow: "hidden",
          display: "flex",
          borderRadius: isRTL ? "24px 0 0 24px" : "0 24px 24px 0",
        }}>
          <img src={photo} alt={venue.name} style={{
            width: "100%", height: "100%", objectFit: "cover",
            transition: "transform 6s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          />
          {/* Soft gradient blending into content */}
          <div style={{
            position: "absolute", inset: 0,
            background: isRTL
              ? `linear-gradient(to left, ${dark ? "rgba(20,18,16,0.5)" : "rgba(255,255,255,0.3)"} 0%, transparent 40%)`
              : `linear-gradient(to right, ${dark ? "rgba(20,18,16,0.5)" : "rgba(255,255,255,0.3)"} 0%, transparent 40%)`,
            pointerEvents: "none",
          }} />
          {/* Bottom accent line */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.3 }} />
        </div>
      </div>
    </div>
    </>
  )
}
