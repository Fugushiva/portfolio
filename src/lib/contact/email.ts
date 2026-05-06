/**
 * Resend email wrappers.
 * Two sends per successful submission:
 *   1. Owner notification  → jerome@delodder.dev (always FR)
 *   2. Auto-reply          → client email (locale-aware FR/EN)
 *
 * Both are sent as text/plain only — zero XSS risk in mailbox.
 * reply_to on owner email = client's email → direct reply works.
 */
import { Resend } from 'resend'

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('[email] RESEND_API_KEY is not set')
  return new Resend(key)
}

function getFrom(): string {
  return process.env.RESEND_FROM ?? 'Portfolio <hello@jeromedelodder.com>'
}

function getTo(): string {
  return process.env.RESEND_TO ?? 'jerome@delodder.dev'
}

export interface SendEmailParams {
  name: string
  email: string
  message: string
  locale: 'fr' | 'en'
}

/** Notification email sent to the portfolio owner */
export async function sendOwnerEmail(params: SendEmailParams): Promise<void> {
  const resend = getResend()
  const { name, email, message } = params

  const body = [
    `Nom : ${name}`,
    `Email : ${email}`,
    ``,
    `Message :`,
    message,
    ``,
    `---`,
    `Envoyé depuis jeromedelodder.com`,
  ].join('\n')

  await resend.emails.send({
    from: getFrom(),
    to: getTo(),
    replyTo: email,
    subject: `[Portfolio] Nouveau message de ${name}`,
    text: body,
  })
}

const AUTO_REPLY_CONTENT = {
  fr: {
    subject: 'Votre message a bien été reçu',
    body: (name: string) =>
      [
        `Bonjour ${name},`,
        ``,
        `Merci pour votre message — je l'ai bien reçu et je vous répondrai sous 24-48h.`,
        ``,
        `À très bientôt,`,
        `Jérôme Delodder`,
        `jeromedelodder.com`,
      ].join('\n'),
  },
  en: {
    subject: 'Your message has been received',
    body: (name: string) =>
      [
        `Hi ${name},`,
        ``,
        `Thank you for your message — I've received it and will get back to you within 24-48 hours.`,
        ``,
        `Talk soon,`,
        `Jérôme Delodder`,
        `jeromedelodder.com`,
      ].join('\n'),
  },
} as const

/** Auto-reply email sent to the client in their locale */
export async function sendAutoReply(params: SendEmailParams): Promise<void> {
  const resend = getResend()
  const { name, email, locale } = params
  const content = AUTO_REPLY_CONTENT[locale]

  await resend.emails.send({
    from: getFrom(),
    to: email,
    subject: content.subject,
    text: content.body(name),
  })
}
