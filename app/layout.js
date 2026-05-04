import "./globals.css"
import { ThemeProvider } from "@/components/ThemeContext"
import GlobalBackground from "@/components/GlobalBackground"

export const metadata = {
  title: "Saha Events",
  description: "Event Venue Booking System",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&family=Noto+Sans+Arabic:wght@300;400;500;600&family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=El+Messiri:wght@400;500;600;700&family=Alexandria:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeProvider>
          <GlobalBackground />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}