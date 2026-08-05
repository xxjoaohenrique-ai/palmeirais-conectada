"use client"

import React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from "lucide-react"

import { cn } from '@/lib/utils'

function Accordion(props: any) {
  return React.createElement(AccordionPrimitive.Root, {
    'data-slot': 'accordion',
    ...props,
  })
}

function AccordionItem({ className, ...props }: any) {
  return React.createElement(AccordionPrimitive.Item, {
    'data-slot': 'accordion-item',
    className: cn('border-b last:border-b-0', className),
    ...props,
  })
}

function AccordionTrigger({ className, children, ...props }: any) {
  return React.createElement(
    AccordionPrimitive.Header,
    { className: 'flex' },
    React.createElement(
      AccordionPrimitive.Trigger,
      {
        'data-slot': 'accordion-trigger',
        className: cn(
          'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
          className,
        ),
        ...props,
      },
      children,
      React.createElement(ChevronDown, {
        className: 'text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200',
      }),
    ),
  )
}

function AccordionContent({ className, children, ...props }: any) {
  return React.createElement(
    AccordionPrimitive.Content,
    {
      'data-slot': 'accordion-content',
      className:
        'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm',
      ...props,
    },
    React.createElement(
      'div',
      { className: cn('pt-0 pb-4', className) },
      children,
    ),
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
