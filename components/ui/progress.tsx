'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

function Progress({
  className,
  value,
  ...props
}: ProgressProps) {
  return (
    <div
      data-slot="progress"
      className={cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full flex-1 transition-all"
        style={{ width: `${value || 0}%` }}
      />
    </div>
  )
}

export { Progress }
