'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type AvatarProps = React.HTMLAttributes<HTMLDivElement>
type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>
type AvatarFallbackProps = React.HTMLAttributes<HTMLDivElement>

function Avatar({
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: AvatarImageProps) {
  return (
    <img
      data-slot="avatar-image"
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarFallbackProps) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        'bg-muted flex size-full items-center justify-center rounded-full',
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
