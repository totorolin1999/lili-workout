'use client'

import { useSyncExternalStore } from 'react'

interface CurrentDateLabelProps {
  locale: string
}

const emptySubscribe = () => () => {}

export default function CurrentDateLabel({ locale }: CurrentDateLabelProps) {
  const formattedDate = useSyncExternalStore(
    emptySubscribe,
    () =>
      new Date().toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    () => '',
  )

  return <span className="text-sm text-muted-foreground">{formattedDate}</span>
}
