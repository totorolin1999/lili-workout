'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Mail, Send, CheckCircle } from 'lucide-react'
import { signInWithMagicLink } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

const LoginSchema = z.object({
  email: z.string().email(),
})

type LoginForm = z.infer<typeof LoginSchema>

export default function LoginForm() {
  const t = useTranslations('auth')
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  })

  function onSubmit({ email }: LoginForm) {
    setError(null)
    startTransition(async () => {
      const result = await signInWithMagicLink(email)
      if (result.error) {
        setError(t('errors.sendFailed'))
      } else {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <h2 className="text-lg font-bold text-foreground">{t('successTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('successMessage')}</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          {t('emailLabel')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            {...register('email')}
            className={cn(
              'w-full pl-10 pr-4 py-3 rounded-xl border bg-card text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary transition-shadow',
              errors.email ? 'border-destructive' : 'border-border',
            )}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive">{t('errors.invalidEmail')}</p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                   bg-primary text-primary-foreground font-semibold text-sm
                   disabled:opacity-60 hover:bg-primary/90 transition-colors
                   active:scale-[0.98]"
      >
        <Send className="h-4 w-4" />
        {isPending ? t('submitting') : t('submitButton')}
      </button>
    </form>
  )
}
