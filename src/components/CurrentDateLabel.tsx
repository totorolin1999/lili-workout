'use client'

import { useEffect, useState } from 'react'

interface CurrentDateLabelProps {
  locale: string
}

export default function CurrentDateLabel({ locale }: CurrentDateLabelProps) {
  const [formattedDate, setFormattedDate] = useState('')

  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    )
  }, [locale])

  return <span className="text-sm text-muted-foreground">{formattedDate}</span>
}
