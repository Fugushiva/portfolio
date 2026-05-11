'use client'

/**
 * ContactForm — main form client component.
 *
 * States: idle | submitting | success | error
 * Security: honeypot + client-side zod + server-side re-validate
 * i18n: locale passed in payload for localized auto-reply
 * a11y: labels, aria-invalid, aria-describedby, aria-live, prefers-reduced-motion
 */

import { useState, useCallback } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { m, useReducedMotion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'

import { contactClientSchema, type ContactClientPayload } from '@/lib/contact/schema'
import ContactField from './ContactField'
import ContactSuccess from './ContactSuccess'

type FormState = 'idle' | 'submitting' | 'success' | 'error'
type ErrorCode = 'rate_limited' | 'email_failed' | 'generic'

export default function ContactForm() {
  const t = useTranslations('contact.form')
  const locale = useLocale() as 'fr' | 'en'
  const reduce = useReducedMotion()

  const [formState, setFormState] = useState<FormState>('idle')
  const [errorCode, setErrorCode] = useState<ErrorCode>('generic')

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<ContactClientPayload>({
    resolver: zodResolver(contactClientSchema),
    mode: 'onBlur',
  })

  const onSubmit: SubmitHandler<ContactClientPayload> = useCallback(
    async (data) => {
      setFormState('submitting')
      setErrorCode('generic')

      try {
        const payload = {
          ...data,
          locale,
          company: '', // honeypot — always empty from legit client
        }

        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const json = (await res.json()) as { ok: boolean; code: string }

        if (!res.ok || !json.ok) {
          const code: ErrorCode =
            json.code === 'rate_limited'
              ? 'rate_limited'
              : json.code === 'email_failed'
                ? 'email_failed'
                : 'generic'
          setErrorCode(code)
          setFormState('error')
          return
        }

        setFormState('success')
      } catch {
        setErrorCode('generic')
        setFormState('error')
      }
    },
    [locale],
  )

  const handleReset = useCallback(() => {
    resetForm()
    setFormState('idle')
    setErrorCode('generic')
  }, [resetForm])

  // ── Success state ──────────────────────────────────────────────────────────
  if (formState === 'success') {
    return <ContactSuccess onReset={handleReset} />
  }

  const isDisabled = formState === 'submitting'

  // ── Error message helpers ──────────────────────────────────────────────────
  function getSpecificErrorMessage(): string | null {
    if (errorCode === 'rate_limited') return t('error_rate_limited')
    return null // generic uses link pattern below
  }

  // ── Error key resolver (maps schema error codes to i18n keys) ──────────────
  function resolveFieldError(code?: string): string | undefined {
    if (!code) return undefined
    const knownKeys = [
      'err_name_min', 'err_name_max', 'err_email_invalid',
      'err_message_min', 'err_message_max',
    ] as const
    type KnownKey = (typeof knownKeys)[number]
    if (knownKeys.includes(code as KnownKey)) {
      return t(code as KnownKey)
    }
    return code
  }

  return (
    <m.div
      initial={{ opacity: 0, y: reduce ? 0 : 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
      className="w-full max-w-[560px]"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/*
         * Honeypot field — hidden from real users, bots may auto-fill it.
         * Positioned off-screen, aria-hidden, tabIndex=-1.
         */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        >
          <label htmlFor="contact-company">Company</label>
          <input
            id="contact-company"
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-5">
          {/* Name */}
          <ContactField
            {...register('name')}
            label={t('name_label')}
            placeholder={t('name_placeholder')}
            autoComplete="name"
            disabled={isDisabled}
            error={resolveFieldError(errors.name?.message)}
          />

          {/* Email */}
          <ContactField
            {...register('email')}
            label={t('email_label')}
            placeholder={t('email_placeholder')}
            type="email"
            autoComplete="email"
            disabled={isDisabled}
            error={resolveFieldError(errors.email?.message)}
          />

          {/* Message */}
          <ContactField
            {...register('message')}
            label={t('message_label')}
            placeholder={t('message_placeholder')}
            as="textarea"
            rows={5}
            disabled={isDisabled}
            error={resolveFieldError(errors.message?.message)}
          />

          {/* Error banner */}
          {formState === 'error' && (
            <m.div
              role="alert"
              aria-live="assertive"
              className="font-mono text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-3"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {getSpecificErrorMessage() ?? t('error_generic')}
            </m.div>
          )}

          {/* Submit button row */}
          <div className="flex items-center gap-4 flex-wrap pt-1">
            <m.button
              type="submit"
              disabled={isDisabled}
              data-magnetic
              className="magnetic-wrap liquid-btn relative !inline-flex items-center gap-3 px-8 py-4 bg-accent text-bg font-mono text-sm uppercase tracking-widest rounded-full font-bold overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              whileHover={isDisabled ? {} : { scale: 1.04 }}
              whileTap={isDisabled ? {} : { scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            >
              {/* Shimmer sweep on hover */}
              {!isDisabled && (
                <m.span
                  className="absolute inset-0 bg-white/15 origin-left"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                />
              )}

              <span className="relative">
                {isDisabled ? t('submitting') : t('submit')}
              </span>

              <span className="relative" aria-hidden="true">
                {isDisabled ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="animate-spin"
                  >
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                    <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <m.svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </m.svg>
                )}
              </span>
            </m.button>
          </div>
        </div>
      </form>
    </m.div>
  )
}
