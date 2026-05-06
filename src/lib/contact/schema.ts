/**
 * Zod schema for the contact form.
 * Single source of truth — imported by both client (ContactForm) and server (route handler).
 * Strips control characters from name/email to prevent header injection.
 */
import { z } from 'zod'

/** Remove CR/LF/tab control chars — prevents email header injection */
const stripControl = (s: string) => s.replace(/[\r\n\t]/g, '')

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(stripControl)
    .pipe(
      z
        .string()
        .min(2, 'err_name_min')
        .max(80, 'err_name_max'),
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform(stripControl)
    .pipe(
      z
        .string()
        .email('err_email_invalid')
        .max(120, 'err_email_invalid'),
    ),

  message: z
    .string()
    .trim()
    .min(10, 'err_message_min')
    .max(2000, 'err_message_max'),

  locale: z.enum(['fr', 'en']).default('fr'),

  /** Turnstile challenge response token */
  turnstileToken: z.string().min(1, 'err_captcha'),

  /**
   * Honeypot — must be empty string.
   * Any bot that auto-fills this will be silently dropped.
   * Validated server-side only (never display this to users).
   */
  company: z.string().default(''),
})

export type ContactPayload = z.infer<typeof contactSchema>

/** Client-side schema (excludes turnstileToken which is injected by widget) */
export const contactClientSchema = contactSchema.omit({ company: true })

export type ContactClientPayload = z.infer<typeof contactClientSchema>
