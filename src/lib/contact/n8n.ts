/**
 * n8n webhook — posts a richly-labelled payload to the n8n contact workflow.
 *
 * ## Why enriched payload?
 * n8n nodes (Send Email, Set, IF, Respond to Webhook) can reference fields with
 * simple `{{ $json.emails.ownerTo }}` expressions instead of inline concatenation.
 * This removes all string-building from the n8n workflow and makes the automation
 * easier to maintain, test, and translate.
 *
 * ## Payload structure
 * ```json
 * {
 *   // ─── Legacy root fields (kept for backward compat with existing n8n nodes) ───
 *   "name":    "Jean Dupont",
 *   "email":   "jean@example.com",
 *   "message": "Bonjour, je voudrais...",
 *   "locale":  "fr",
 *   "ts":      1234567890,
 *   "source":  "portfolio",
 *
 *   // ─── form — workflow metadata ──────────────────────────────────────────────
 *   "form": {
 *     "type":            "contact",
 *     "source":          "portfolio",
 *     "locale":          "fr",
 *     "submittedAt":     "2026-05-08T10:42:31.000Z",  // ISO-8601 UTC
 *     "submittedAtUnix": 1746694951
 *   },
 *
 *   // ─── contact — clean contact fields ──────────────────────────────────────
 *   "contact": {
 *     "name":           "Jean Dupont",
 *     "email":          "jean@example.com",
 *     "message":        "Bonjour, je voudrais...",
 *     "messagePreview": "Bonjour, je voudrais...",  // first 120 chars, trimmed
 *     "messageLength":  142
 *   },
 *
 *   // ─── labels — pre-built strings for email subjects / greetings ───────────
 *   "labels": {
 *     "subjectOwner":       "[Portfolio] Nouveau message de Jean Dupont",
 *     "subjectAutoReply":   "Votre message a bien été reçu",          // locale-aware
 *     "ownerGreeting":      "Nouveau message de Jean Dupont",
 *     "autoReplyGreeting":  "Bonjour Jean Dupont,"                    // locale-aware
 *   },
 *
 *   // ─── emails — ready-to-use email fields ──────────────────────────────────
 *   "emails": {
 *     "ownerTo":       "jerome@delodder.dev",
 *     "ownerFrom":     "hello@jeromedelodder.com",
 *     "ownerReplyTo":  "jean@example.com",
 *     "ownerBodyText": "Nom: Jean Dupont\nEmail: jean@example.com\nMessage:\n...",
 *     "autoReplyTo":   "jean@example.com",
 *     "autoReplyFrom": "hello@jeromedelodder.com",
 *     "autoReplyBodyText": "Bonjour Jean Dupont,\n\nNous avons bien reçu votre message..."
 *   },
 *
 *   // ─── meta — request metadata (nothing PII in cleartext) ──────────────────
 *   "meta": {
 *     "country":   "FR",          // CF-IPCountry header value
 *     "userAgent": "Mozilla/...",
 *     "ipHash":    "sha256:abc..."  // SHA-256 of CF-Connecting-IP — never cleartext
 *   }
 * }
 * ```
 *
 * ## n8n node mapping cheat-sheet
 * | n8n field            | Expression                          |
 * |----------------------|-------------------------------------|
 * | Owner email To       | `{{ $json.emails.ownerTo }}`        |
 * | Owner email From     | `{{ $json.emails.ownerFrom }}`      |
 * | Owner Subject        | `{{ $json.labels.subjectOwner }}`   |
 * | Owner Reply-To       | `{{ $json.emails.ownerReplyTo }}`   |
 * | Owner body text      | `{{ $json.emails.ownerBodyText }}`  |
 * | Auto-reply To        | `{{ $json.emails.autoReplyTo }}`    |
 * | Auto-reply Subject   | `{{ $json.labels.subjectAutoReply }}`|
 * | Auto-reply body      | `{{ $json.emails.autoReplyBodyText }}`|
 * | Locale IF node       | `{{ $json.form.locale }}`           |
 * | Submitted timestamp  | `{{ $json.form.submittedAt }}`      |
 *
 * ## Auth
 * Header `x-portfolio-secret` carries the shared secret.
 * Configure in n8n Webhook node → Authentication → Header Auth
 * Header name: `x-portfolio-secret` / Value: same as N8N_WEBHOOK_SECRET env var.
 *
 * ## Timeout
 * 10 seconds. n8n workflows that send email (SMTP or OAuth) can take 6-8 s.
 * The client form disables the submit button during submission, so this window
 * never causes double-submission on slow connections.
 *
 * ## Endpoint
 * Use `/webhook/<uuid>` (production). The workflow must be activated in n8n
 * (green toggle in the top-right corner). `/webhook-test/<uuid>` only works
 * when the n8n editor is open and "Listen for test event" is active.
 */

// ─── Locale helpers ────────────────────────────────────────────────────────

type Locale = 'fr' | 'en'

const OWNER_EMAIL = 'jerome@delodder.dev'
const SENDER_EMAIL = 'hello@jeromedelodder.com'

/** Locale-aware string map for email subjects and greetings */
const I18N: Record<Locale, {
  subjectAutoReply: string
  autoReplyGreeting: (name: string) => string
  autoReplyBody: (name: string) => string
  ownerSubjectPrefix: string
  ownerGreetingPrefix: string
}> = {
  fr: {
    subjectAutoReply: 'Votre message a bien été reçu',
    autoReplyGreeting: (name) => `Bonjour ${name},`,
    autoReplyBody: (name) =>
      `Bonjour ${name},\n\nMerci pour votre message. Je l'ai bien reçu et vous répondrai dans les 24 à 48 heures.\n\nÀ très bientôt,\nJérôme Delodder`,
    ownerSubjectPrefix: '[Portfolio] Nouveau message de',
    ownerGreetingPrefix: 'Nouveau message de',
  },
  en: {
    subjectAutoReply: 'Your message has been received',
    autoReplyGreeting: (name) => `Hello ${name},`,
    autoReplyBody: (name) =>
      `Hello ${name},\n\nThank you for your message. I have received it and will reply within 24–48 hours.\n\nSpeak soon,\nJérôme Delodder`,
    ownerSubjectPrefix: '[Portfolio] New message from',
    ownerGreetingPrefix: 'New message from',
  },
}

// ─── Types ─────────────────────────────────────────────────────────────────

/** Minimal fields required to build the enriched payload */
export interface N8nPayloadInput {
  name: string
  email: string
  message: string
  locale: Locale
  /** Unix timestamp (ms) — typically Date.now() */
  ts: number
  /** Request metadata extracted by the route handler */
  meta?: {
    country?: string
    userAgent?: string
    /** SHA-256 hash of CF-Connecting-IP — never the IP itself */
    ipHash?: string
  }
}

/** Full enriched payload shape sent to n8n */
export interface N8nWebhookPayload {
  // Legacy root fields — backward-compat with existing n8n nodes
  name: string
  email: string
  message: string
  locale: Locale
  ts: number
  source: 'portfolio'

  form: {
    type: 'contact'
    source: 'portfolio'
    locale: Locale
    submittedAt: string
    submittedAtUnix: number
  }

  contact: {
    name: string
    email: string
    message: string
    messagePreview: string
    messageLength: number
  }

  labels: {
    subjectOwner: string
    subjectAutoReply: string
    ownerGreeting: string
    autoReplyGreeting: string
  }

  emails: {
    ownerTo: string
    ownerFrom: string
    ownerReplyTo: string
    ownerBodyText: string
    autoReplyTo: string
    autoReplyFrom: string
    autoReplyBodyText: string
  }

  meta: {
    country: string
    userAgent: string
    ipHash: string
  }
}

// ─── Payload builder ───────────────────────────────────────────────────────

const PREVIEW_MAX = 120

/**
 * Builds the complete enriched n8n payload from minimal inputs.
 * Pure function — no side effects, easy to unit-test.
 */
export function buildN8nPayload(input: N8nPayloadInput): N8nWebhookPayload {
  const { name, email, message, locale, ts, meta = {} } = input
  const i18n = I18N[locale] ?? I18N.fr

  const submittedAt = new Date(ts).toISOString()
  const submittedAtUnix = Math.floor(ts / 1000)

  const messagePreview =
    message.length <= PREVIEW_MAX
      ? message
      : message.slice(0, PREVIEW_MAX).trimEnd() + '…'

  const subjectOwner = `${i18n.ownerSubjectPrefix} ${name}`
  const ownerGreeting = `${i18n.ownerGreetingPrefix} ${name}`

  const ownerBodyText =
    `Nom: ${name}\nEmail: ${email}\nDate: ${submittedAt}\n\nMessage:\n${message}`

  return {
    // Legacy root fields
    name,
    email,
    message,
    locale,
    ts,
    source: 'portfolio',

    form: {
      type: 'contact',
      source: 'portfolio',
      locale,
      submittedAt,
      submittedAtUnix,
    },

    contact: {
      name,
      email,
      message,
      messagePreview,
      messageLength: message.length,
    },

    labels: {
      subjectOwner,
      subjectAutoReply: i18n.subjectAutoReply,
      ownerGreeting,
      autoReplyGreeting: i18n.autoReplyGreeting(name),
    },

    emails: {
      ownerTo: OWNER_EMAIL,
      ownerFrom: SENDER_EMAIL,
      ownerReplyTo: email,
      ownerBodyText,
      autoReplyTo: email,
      autoReplyFrom: SENDER_EMAIL,
      autoReplyBodyText: i18n.autoReplyBody(name),
    },

    meta: {
      country: meta.country ?? 'unknown',
      userAgent: meta.userAgent ?? 'unknown',
      ipHash: meta.ipHash ?? 'unknown',
    },
  }
}

// ─── HTTP sender ───────────────────────────────────────────────────────────

/** Timeout in milliseconds. n8n email workflows can take 6-8s. */
const TIMEOUT_MS = 10_000

/**
 * Posts the enriched payload to the n8n webhook and returns a success boolean.
 *
 * - Returns `false` immediately if N8N_WEBHOOK_URL is not configured.
 * - Logs the n8n HTTP status on failure (status code + first 200 chars of body).
 * - Aborts after TIMEOUT_MS (10 s) to avoid blocking the user's form submission.
 */
export async function postN8nWebhook(input: N8nPayloadInput): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return false

  const secret = process.env.N8N_WEBHOOK_SECRET ?? ''
  const payload = buildN8nPayload(input)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-portfolio-secret': secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) {
      let body = ''
      try {
        body = (await res.text()).slice(0, 200)
      } catch {
        // ignore — body read failure is not critical
      }
      console.error('[n8n] webhook returned', res.status, body)
      return false
    }

    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // AbortError means our timeout fired — surfaces a clear message
    const tag = message.includes('timed out') || message.includes('AbortError')
      ? `timeout after ${TIMEOUT_MS}ms`
      : message
    console.error('[n8n] webhook failed:', tag)
    return false
  }
}
