import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Edzésnapló – Lili Workout',
    short_name: 'Edzésnapló',
    description: 'Lili személyes edzésnaplója',
    start_url: '/hu',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#004c87',
    orientation: 'portrait',
    lang: 'hu',
    categories: ['health', 'fitness'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/mobile-home.png',
        sizes: '390x844',
        type: 'image/png',
      },
    ],
  }
}
