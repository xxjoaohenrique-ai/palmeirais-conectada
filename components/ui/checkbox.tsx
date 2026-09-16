'use client'

import * as React from 'react'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <label className={cn('inline-flex items-center gap-2', className)}>
      <input
        data-slot="checkbox"
        type="checkbox"
        className="peer sr-only"
        {...props}
      />
      <span
        data-slot="checkbox-indicator"
        className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-input bg-input/30 shadow-xs transition-colors duration-150 peer-checked:bg-primary peer-checked:border-primary peer-checked:text-primary-foreground peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px] peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      >
        <CheckIcon className="size-3.5 opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
      </span>
    </label>
  )
}

export { Checkbox }
