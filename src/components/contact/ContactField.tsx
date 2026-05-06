'use client'

/**
 * Styled form field component — consistent with the portfolio design system.
 * Supports both <input> and <textarea>.
 * Handles focus state (violet accent border + ring), error state, and aria attributes.
 */

import { forwardRef, useId } from 'react'
import { clsx } from 'clsx'

interface ContactFieldProps {
  label: string
  error?: string
  as?: 'input' | 'textarea'
  rows?: number
  disabled?: boolean
  placeholder?: string
  type?: string
  name?: string
  autoComplete?: string
  'aria-invalid'?: boolean
}

const baseInputClasses = clsx(
  // Layout
  'w-full px-4 py-3',
  // Typography
  'font-sans text-sm text-foreground placeholder:text-muted/50',
  // Background + border
  'bg-surface/40 backdrop-blur-sm border border-border rounded-lg',
  // Focus
  'outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  // Error (applied via data-invalid attribute via CSS — see below, or added dynamically)
  // Disabled
  'disabled:opacity-50 disabled:cursor-not-allowed',
  // Transition
  'transition-all duration-300',
)

const ContactField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  ContactFieldProps & React.HTMLAttributes<HTMLInputElement | HTMLTextAreaElement>
>(function ContactField(
  {
    label,
    error,
    as = 'input',
    rows = 5,
    disabled,
    placeholder,
    type = 'text',
    name,
    autoComplete,
    ...rest
  },
  ref,
) {
  const id = useId()
  const errorId = `${id}-error`
  const hasError = Boolean(error)

  const sharedProps = {
    id,
    name,
    disabled,
    placeholder,
    autoComplete,
    'aria-invalid': hasError || undefined,
    'aria-describedby': hasError ? errorId : undefined,
    className: clsx(
      baseInputClasses,
      hasError && 'border-red-500/70 focus:border-red-400 focus:ring-red-400/20',
    ),
    ...rest,
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Visually-hidden label (accessible, placeholder is the visible hint) */}
      <label
        htmlFor={id}
        className="font-mono text-xs uppercase tracking-widest text-muted"
      >
        {label}
        <span className="ml-1 text-accent" aria-hidden="true">*</span>
      </label>

      {as === 'textarea' ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          rows={rows}
          style={{ resize: 'none' }}
          {...(sharedProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          type={type}
          {...(sharedProps as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {/* Inline error message */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="font-mono text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  )
})

export default ContactField
