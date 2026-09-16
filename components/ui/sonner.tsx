'use client'

import { useTheme } from 'next-themes'
import type { CSSProperties, HTMLAttributes } from 'react'

type ToasterProps = HTMLAttributes<HTMLDivElement>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <div
      data-theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
