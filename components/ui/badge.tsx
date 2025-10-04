import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-brand-purple-600 text-white shadow hover:bg-brand-purple-700',
        secondary:
          'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        destructive:
          'border-transparent bg-red-600 text-white shadow hover:bg-red-700',
        outline: 'text-gray-900 border-gray-300 dark:text-gray-100 dark:border-gray-700',
        purple:
          'border-brand-purple-500/20 bg-brand-purple-500/10 text-brand-purple-600 dark:text-brand-purple-400',
        emerald:
          'border-brand-emerald-500/20 bg-brand-emerald-500/10 text-brand-emerald-600 dark:text-brand-emerald-400',
        gradient:
          'border-transparent bg-gradient-to-r from-brand-purple-600 to-brand-emerald-600 text-white shadow-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
