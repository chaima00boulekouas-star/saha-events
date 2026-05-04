"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import NavBar from "@/components/NavBar"
import { useTheme } from "@/components/ThemeContext"
import { EyeIcon, EyeOffIcon } from "@/components/Icons"

export default function SignupPage() {
  const { t, bg, dark, border, text, textMuted, accent, accentGlow, glassCard, glassFilter, glassBorder, cardShadow, lang } = useTheme()
  const headingFont = lang === "ar" ? "'Amiri','Tajawal',serif" : "'Playfair Display',serif"
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [gender, setGender] = useState("")
  const [email, setEmail] = useState("")
  const [location, setLocation] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [successEmail, setSuccessEmail] = useState(null) // shows verification screen

  function getStrength(p) {
    let s = 0
    if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = getStrength(password)
  const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"][strength]
  const strengthLabel = ["", t.weak, t.fair, t.good, t.strong][strength]

  function validate() {
    const e = {}
    if (!firstName.trim()) e.firstName = t.first_name_required
    if (!lastName.trim()) e.lastName = t.last_name_required
    if (!gender) e.gender = t.gender_required
    if (!location.trim()) e.location = t.location_label + " required"
    if (!email.includes("@")) e.email = t.email_invalid
    if (password.length < 8) e.password = t.password_short
    else if (!/^[A-Za-z0-9]+$/.test(password)) e.password = t.password_invalid
    if (password !== confirm) e.confirm = t.passwords_mismatch
    setErrors(e); return Object.keys(e).length === 0
  }

  async function signup() {
    if (!validate()) return
    setLoading(true)
    const { data: authData, error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName, gender, location } } })
    if (error) { setErrors({ submit: error.message }); setLoading(false); return }
    if (authData.user) {
      const fullName = `${firstName} ${lastName}`
      const { error: upsertError } = await supabase.from("profiles").upsert({ 
        id: authData.user.id, 
        email, 
        role: "user", 
        gender, 
        location, 
        display_name: fullName,
        full_name: fullName 
      })
      
      if (upsertError) {
        console.error("Profile sync error:", upsertError.message)
      }
      
      // If session exists (Confirm Email is OFF), redirect to profile immediately
      if (authData.session) {
        setLoading(false)
        router.push("/profile")
        return
      }
    }
    setLoading(false)
    setSuccessEmail(email) // show verification screen only if session is missing
  }

  const inputStyle = (hasError) => ({
    width: "100%", padding: "12px 16px", borderRadius: 12,
    border: hasError ? "1px solid #ef4444" : undefined,
    color: text, fontSize: 14, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
    transition: "all 0.25s ease",
  })

  const errStyle = { fontSize: 11, color: "#ef4444", marginTop: 5 }
  const labelStyle = { fontSize: 11, color: textMuted, display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }

  // ── EMAIL VERIFICATION SCREEN ──
  if (successEmail) {
    return (
      <div className={`ambient-bg${dark ? " ambient-bg-dark" : ""}`} style={{ minHeight: "100vh", background: bg }}>
        <NavBar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", padding: 24 }}>
          <div className="fade-up" style={{
            background: glassCard,
            backdropFilter: glassFilter,
            WebkitBackdropFilter: glassFilter,
            border: `1px solid ${glassBorder}`,
            borderRadius: 28,
            padding: "52px 44px", width: "100%", maxWidth: 440,
            boxShadow: cardShadow,
            position: "relative", overflow: "hidden", textAlign: "center",
          }}>
            {/* Ambient glow */}
            <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, pointerEvents: "none" }} />

            {/* Envelope icon with glow */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px",
              background: `radial-gradient(circle, ${accentGlow} 0%, transparent 80%)`,
              border: `1px solid ${dark ? "rgba(201,168,76,0.25)" : "rgba(201,168,76,0.2)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30,
              boxShadow: `0 0 32px ${accentGlow}, 0 4px 16px rgba(0,0,0,0.1)`,
            }}>
              ✉️
            </div>

            <h2 style={{ fontFamily: headingFont, fontSize: 26, fontWeight: 400, color: text, marginBottom: 12 }}>
              {t.check_email}
            </h2>

            <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.7, marginBottom: 8 }}>
              {t.sent_link}
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: accent, marginBottom: 24, wordBreak: "break-all" }}>
              {successEmail}
            </p>
            <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.7, marginBottom: 32 }}>
              {t.click_verify}
            </p>

            {/* Divider */}
            <div className="glass-divider" style={{ marginBottom: 24 }} />

            <p style={{ fontSize: 12, color: textMuted, marginBottom: 16 }}>
              {t.didnt_receive}
            </p>

            <button
              onClick={() => setSuccessEmail(null)}
              style={{
                padding: "10px 28px", borderRadius: 999,
                background: "transparent", color: accent,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${dark ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.25)"}`,
                transition: "all 0.25s",
                marginBottom: 12,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = dark ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.05)"
                e.currentTarget.style.borderColor = accent
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.borderColor = dark ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.25)"
              }}
            >
              {t.try_different}
            </button>

            <br />

            <button
              onClick={() => router.push("/login")}
              className="btn-glow"
              style={{
                padding: "13px 34px", borderRadius: 999,
                background: `linear-gradient(135deg, ${accent}, #b8943c)`,
                color: "#fff", fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer",
                boxShadow: `0 6px 24px ${accentGlow}`,
                marginTop: 8, letterSpacing: "0.02em",
                fontFamily: "inherit",
              }}
            >
              {t.go_login}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`ambient-bg${dark ? " ambient-bg-dark" : ""}`} style={{ minHeight: "100vh", background: bg }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", padding: "32px 24px" }}>
        <div className="fade-up" style={{
          background: glassCard,
          backdropFilter: glassFilter,
          WebkitBackdropFilter: glassFilter,
          border: `1px solid ${glassBorder}`,
          borderRadius: 28, padding: "44px 40px", width: "100%", maxWidth: 480,
          boxShadow: cardShadow,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ textAlign: "center", marginBottom: 30, position: "relative" }}>
            <img src="/logo.png" alt="Saha Events" style={{ height: 34, filter: dark ? "invert(1) brightness(0.9)" : "none", marginBottom: 20 }} />
            <h1 style={{ fontFamily: headingFont, fontSize: 26, fontWeight: 400, color: text, marginBottom: 8, letterSpacing: lang === "ar" ? "0" : "-0.01em" }}>{t.sign_up}</h1>
            <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.6 }}>{t.sign_up_sub}</p>
          </div>

          {errors.submit && <div style={{ padding: "13px 18px", borderRadius: 14, marginBottom: 20, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 13, color: "#ef4444", textAlign: "center" }}>{errors.submit}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>{t.first_name}</label>
              <input className={dark ? "input-glass-dark" : "input-glass"} placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle(errors.firstName)} />
              {errors.firstName && <p style={errStyle}>{errors.firstName}</p>}
            </div>
            <div>
              <label style={labelStyle}>{t.last_name}</label>
              <input className={dark ? "input-glass-dark" : "input-glass"} placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle(errors.lastName)} />
              {errors.lastName && <p style={errStyle}>{errors.lastName}</p>}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t.gender_label}</label>
            <div style={{ display: "flex", gap: 12 }}>
              {["male", "female"].map(g => (
                <button key={g} type="button" onClick={() => setGender(g)} style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12,
                  border: gender === g ? "2px solid #fff" : (errors.gender ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)"),
                  cursor: "pointer", fontSize: 14, fontWeight: gender === g ? 700 : 400,
                  fontFamily: "inherit", transition: "all 0.25s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: gender === g ? "0 0 35px rgba(255,255,255,0.5), 0 0 15px rgba(255,255,255,0.2) inset" : "none",
                  background: gender === g ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
                  color: gender === g ? "#fff" : textMuted,
                }} className={dark ? "input-glass-dark" : "input-glass"}>
                  <span style={{ fontSize: 18 }}>{g === "male" ? "♂" : "♀"}</span>
                  {g === "male" ? t.male : t.female}
                </button>
              ))}
            </div>
            {errors.gender && <p style={errStyle}>{errors.gender}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t.location_label}</label>
            <input className={dark ? "input-glass-dark" : "input-glass"} placeholder={t.location_ph || "e.g. Algiers"} value={location} onChange={e => setLocation(e.target.value)} style={inputStyle(errors.location)} />
            {errors.location && <p style={errStyle}>{errors.location}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t.email}</label>
            <input className={dark ? "input-glass-dark" : "input-glass"} autoComplete="off" readOnly onFocus={e => e.target.removeAttribute('readOnly')} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle(errors.email)} />
            {errors.email && <p style={errStyle}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t.password}</label>
            <div style={{ position: "relative" }}>
              <input className={dark ? "input-glass-dark" : "input-glass"} autoComplete="new-password" readOnly onFocus={e => e.target.removeAttribute('readOnly')} type={showPass ? "text" : "password"} placeholder={t.password_min} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle(errors.password), paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = text} onMouseLeave={e => e.currentTarget.style.color = textMuted}>{showPass ? <EyeOffIcon /> : <EyeIcon />}</button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= strength ? strengthColor : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", transition: "all 0.35s ease", boxShadow: i <= strength ? `0 0 8px ${strengthColor}55` : "none" }} />)}
                </div>
                <p style={{ fontSize: 11, color: strengthColor, fontWeight: 500 }}>{strengthLabel}</p>
              </div>
            )}
            {errors.password && <p style={errStyle}>{errors.password}</p>}
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>{t.confirm_password}</label>
            <div style={{ position: "relative" }}>
              <input className={dark ? "input-glass-dark" : "input-glass"} autoComplete="new-password" readOnly onFocus={e => e.target.removeAttribute('readOnly')} type={showConfirm ? "text" : "password"} placeholder={t.repeat_password} value={confirm} onChange={e => setConfirm(e.target.value)} style={{ ...inputStyle(errors.confirm), paddingRight: 44 }} />
              <button type="button" onClick={() => setShowConfirm(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = text} onMouseLeave={e => e.currentTarget.style.color = textMuted}>{showConfirm ? <EyeOffIcon /> : <EyeIcon />}</button>
            </div>
            {confirm.length > 0 && <p style={{ fontSize: 11, marginTop: 5, color: password === confirm ? "#22c55e" : "#ef4444", fontWeight: 500 }}>{password === confirm ? t.passwords_match : t.passwords_no_match}</p>}
            {errors.confirm && <p style={errStyle}>{errors.confirm}</p>}
          </div>

          <div style={{ marginBottom: 26 }} />

          <button onClick={signup} disabled={loading} className="btn-glow" style={{
            width: "100%", padding: "15px 0", borderRadius: 999,
            background: `linear-gradient(135deg, ${accent}, #b8943c)`,
            color: "#fff", fontSize: 14, fontWeight: 600, border: "none",
            cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            boxShadow: `0 6px 28px ${accentGlow}, 0 1px 0 rgba(255,255,255,0.15) inset`,
            fontFamily: "inherit", letterSpacing: "0.02em",
            transition: "all 0.3s ease",
          }}>{loading ? t.creating : t.signup_btn}</button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}, transparent)` }} />
            <span style={{ fontSize: 12, color: textMuted }}>{t.or_text}</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}, transparent)` }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: textMuted }}>
            {t.have_account}{" "}
            <a href="/login" style={{ color: accent, fontWeight: 600, textDecoration: "none", transition: "opacity 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >{t.signin_link}</a>
          </p>
        </div>
      </div>
    </div>
  )
}