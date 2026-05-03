"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import NavBar from "@/components/NavBar"
import { useTheme } from "@/components/ThemeContext"
import { EyeIcon, EyeOffIcon } from "@/components/Icons"

export default function LoginPage() {
  const { t, bg, dark, border, text, textMuted, accent, accentGlow, glassCard, glassBorder, cardShadow } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const login = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) alert(error.message)
    else router.push("/profile")
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12,
    color: text, fontSize: 14, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
    transition: "all 0.25s ease",
  }

  return (
    <div className={`ambient-bg${dark ? " ambient-bg-dark" : ""}`} style={{ minHeight: "100vh", background: bg }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", padding: 24 }}>
        <div className="fade-up" style={{
          background: dark ? "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 50%, transparent 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 30%, transparent 100%)",
          backdropFilter: dark ? "blur(80px) saturate(160%)" : "blur(80px) saturate(250%)", 
          WebkitBackdropFilter: dark ? "blur(80px) saturate(160%)" : "blur(80px) saturate(250%)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)"}`,
          borderRadius: 28, padding: "44px 40px", width: "100%", maxWidth: 420,
          boxShadow: dark
            ? `0 50px 120px rgba(0,0,0,0.85), 0 0 80px rgba(201,168,76,0.08), inset 1.5px 1.5px 0 rgba(255,255,255,0.12), inset -1.5px -1.5px 0 rgba(255,255,255,0.02)`
            : `0 50px 120px rgba(0,0,0,0.15), 0 0 160px rgba(201,168,76,0.3), inset 1.5px 1.5px 0 rgba(255,255,255,0.9), inset -1.5px -1.5px 0 rgba(255,255,255,0.2)`,
          position: "relative", overflow: "hidden",
        }}>
          {/* Subtle top-light accent (warm silver) */}
          {dark && <div style={{ position: "absolute", top: -80, right: -80, width: 240, height: 240, background: "radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />}

          <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
            <img src="/logo.png" alt={t.brand_name} style={{ height: 36, filter: dark ? "invert(1) brightness(0.9)" : "none", marginBottom: 20 }} />
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 400, color: text, marginBottom: 6 }}>{t.sign_in}</h1>
            <p style={{ fontSize: 13, color: textMuted }}>{t.sign_in_sub}</p>
          </div>

          <form onSubmit={e => { e.preventDefault(); login() }} autoComplete="off">
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.email}</label>
            <input className={dark ? "input-glass-dark" : "input-glass"} autoComplete="off" readOnly onFocus={e => e.target.removeAttribute('readOnly')} type="email" placeholder="you@example.com" onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, color: textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.password}</label>
            <div style={{ position: "relative" }}>
              <input className={dark ? "input-glass-dark" : "input-glass"} autoComplete="new-password" readOnly onFocus={e => e.target.removeAttribute('readOnly')} type={showPass ? "text" : "password"} placeholder="••••••••" onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = text} onMouseLeave={e => e.currentTarget.style.color = textMuted}>{showPass ? <EyeOffIcon /> : <EyeIcon />}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-glow" style={{
            width: "100%", padding: "14px 0", borderRadius: 999,
            background: `linear-gradient(135deg, ${accent}, #b8943c)`,
            color: "#fff", fontSize: 14, fontWeight: 600, border: "none",
            cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            boxShadow: `0 4px 24px ${accentGlow}, 0 1px 0 rgba(255,255,255,0.15) inset`,
            fontFamily: "inherit",
          }}>{loading ? t.signing_in : t.signin_btn}</button>

          </form>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: textMuted }}>
            {t.no_account}{" "}
            <a href="/signup" style={{ color: accent, fontWeight: 600, textDecoration: "none" }}>{t.sign_up_link}</a>
          </p>
        </div>
      </div>
    </div>
  )
}