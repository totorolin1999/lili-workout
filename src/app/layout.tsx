import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    template: '%s | Edzésnapló',
    default: 'Edzésnapló',
  },
  description: 'Lili személyes edzésnaplója – Mobile-First PWA',
  applicationName: 'Edzésnapló',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Edzésnapló',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#7c3aed" />
      </head>
      <body className={`${geist.variable} font-sans antialiased min-h-screen bg-background`}>
        {children}
      </body>
    </html>
  )
}
