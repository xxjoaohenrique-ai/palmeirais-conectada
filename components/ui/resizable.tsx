'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical'
}

function ResizablePanelGroup({
  className,
  direction = 'horizontal',
  ...props
}: ResizablePanelGroupProps) {
  return (
    <div
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full',
        direction === 'vertical' && 'flex-col',
        className,
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-auto', className)}
      {...props}
    />
  )
}

function ResizablePanelResizeHandle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={cn(
        'relative flex w-1 select-none touch-none bg-border hover:bg-border-600 cursor-col-resize transition-colors',
        className,
      )}
      {...props}
    >
      <GripVerticalIcon className="absolute left-1/2 top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelResizeHandle,
}
