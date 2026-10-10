import { redirect } from 'next/navigation'

// Root path redirects to the default locale (/hu)
export default function RootPage() {
  redirect('/hu')
}
