"use client"

import { useTheme } from "@/components/ThemeContext"

export default function GlobalBackground() {
  const { dark } = useTheme()

  return (
    <div
      className={`site-bg${dark ? " site-bg-dark" : ""}`}
      aria-hidden="true"
    />
  )
}
