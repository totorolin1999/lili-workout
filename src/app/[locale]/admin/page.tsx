import { connection } from 'next/server'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { checkIsAdmin, getAdminMembersSummary } from '@/lib/actions/admin'
import AdminDashboard from '@/components/AdminDashboard'

interface AdminPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(props: AdminPageProps) {
  const { locale } = await props.params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'admin' })
  return { title: t('title') }
}

export default async function AdminPage(props: AdminPageProps) {
  await connection()
  const { locale } = await props.params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const adminCheck = await checkIsAdmin()

  if (!adminCheck.isAdmin) {
    const t = await getTranslations({ locale, namespace: 'admin' })
    return (
      <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{t('accessDenied')}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('accessDeniedDesc')}
        </p>
        <div className="pt-2">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('backToHome')}</span>
          </Link>
        </div>
      </div>
    )
  }

  const { members = [], migrationNeeded } = await getAdminMembersSummary()

  return (
    <AdminDashboard
      initialMembers={members}
      currentUserId={adminCheck.userId}
      migrationNeeded={migrationNeeded}
      locale={locale}
    />
  )
}
