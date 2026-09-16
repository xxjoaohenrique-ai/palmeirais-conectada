'use client'

import React from 'react'

// Lightweight replacement for @radix-ui/react-aspect-ratio to avoid missing module
type AspectRatioProps = React.HTMLAttributes<HTMLDivElement> & {
  ratio?: number // width / height
}

function AspectRatio({ ratio = 1, style, children, ...props }: AspectRatioProps) {
  // Use padding-top trick: percentage is based on height = (1 / ratio) * 100%
  const paddingTop = `${(1 / ratio) * 100}%`

  return (
    <div data-slot="aspect-ratio" style={{ position: 'relative', width: '100%', ...style }} {...props}>
      <div style={{ width: '100%', paddingTop }} aria-hidden />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

export { AspectRatio }
