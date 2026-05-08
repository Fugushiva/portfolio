# Contact Form — Design Specification

**Date:** 2026-05-06  
**Branch:** `feature/contact-form`  
**Status:** Approved

---

## Goal

Integrate a contact form into the portfolio's existing Contact section that sends a notification email to the owner, an auto-reply to the client, and optionally forwards data to an n8n webhook — all while maintaining the portfolio's visual identity (dark, glitch, violet accent, Framer Motion) and being hardened against spam.

---

## Context

- **Framework:** Next.js 15, App Router, React 19, TypeScript strict
- **Styling:** Tailwind CSS (palette: bg `#020208`, accent `#7c3aed`, foreground `#f5f5f0`, Geist fonts)
- **Animations:** Framer Motion + GSAP (glitch, magnetic cursor, GSAP reveal)
- **i18n:** next-intl (FR/EN), locale-aware auto-reply
- **Hosting:** Cloudflare Pages / Workers (edge runtime)
- **Email:** Resend (HTTP API, edge-compatible)
- **No existing API routes, no DB**

---

## Architecture

```
[ContactForm.tsx — 'use client']
  ├─ react-hook-form + zod resolver
  ├─ Turnstile invisible widget (@marsidev/react-turnstile)
  ├─ Honeypot field (company, hidden)
  └─ POST /api/contact

[/api/contact/route.ts — runtime: 'edge']
  1. Parse JSON body
  2. Honeypot: company must be empty (silent 200 on fail)
  3. Rate-limit: KV sliding window (5 req / IP-hash / 10 min)
  4. Zod validate
  5. Turnstile siteverify (Cloudflare)
  6. Promise.allSettled([
       sendOwnerEmail(),    // Resend — notification to jerome@delodder.dev
       sendAutoReply(),     // Resend — localized reply to client
       postN8nWebhook()     // fire-and-forget, skipped if env absent
     ])
  7. Return { ok, code }
```

---

## UI Design

### Placement
Inline, under the existing glitch headlines, replacing the `mailto` CTA button. Fits in the existing `Contact.tsx` layout. Footer (social links + availability pill) remains unchanged.

### Form fields
| Field | Type | Validation | Notes |
|---|---|---|---|
| `name` | text | 2–80 chars, trim | Required |
| `email` | email | RFC regex, max 120 | Required |
| `message` | textarea | 10–2000 chars | Required, 5 rows |
| `company` | text | must be empty | Honeypot — hidden via CSS absolute positioning + aria-hidden |
| `locale` | hidden | 'fr' \| 'en' | Populated by useLocale() |
| `turnstileToken` | hidden | non-empty string | Populated by widget callback |

### States
| State | UI |
|---|---|
| `idle` | Normal form, CTA "Envoyer le message" (magnetic, liquid-btn) |
| `submitting` | Inputs disabled, opacity 0.6, spinner in button, "Envoi..." |
| `success` | Form replaced by `<ContactSuccess />`: animated checkmark + message + "Envoyer un autre" |
| `error` | Inline error banner below form (violet-red tint), error code i18n, fallback mailto link |

### Style tokens (consistent with existing portfolio)
- Input background: `bg-surface/40` + `backdrop-blur-sm`
- Input border: `border border-border` → `focus:border-accent focus:ring-1 focus:ring-accent/30`
- Labels: `font-mono text-xs uppercase tracking-widest text-muted`
- Error text: `font-mono text-xs text-red-400`
- Submit button: reuse `liquid-btn` + `data-magnetic` pattern (same as existing CTA)
- Textarea resize: `resize-none`
- Transition: `transition-all duration-300 ease-expo`

### Accessibility
- `<label htmlFor>` for every input
- `aria-invalid` + `aria-describedby` on error state
- `aria-live="polite"` on success/error containers
- `prefers-reduced-motion` respected (Framer Motion `useReducedMotion`)
- Keyboard: Tab order natural, Enter submits
- Submit disabled while Turnstile hasn't resolved (auto, invisible UX)

---

## Backend — Route Handler

**File:** `src/app/api/contact/route.ts`  
**Runtime:** `edge` (Cloudflare Workers compatible)

### Pipeline (ordered by cost, cheapest first)

| Step | Check | Fail response | Cost |
|---|---|---|---|
| 1 | JSON parse | 400 `bad_request` | ~0 |
| 2 | Honeypot (`company === ''`) | 200 `ok` (silent drop) | ~0 |
| 3 | Extract IP from `CF-Connecting-IP` | — | ~0 |
| 4 | Rate-limit KV check | 429 `rate_limited` | 1 KV read |
| 5 | Zod validate | 400 `validation_error` | ~0 |
| 6 | Turnstile siteverify | 403 `captcha_failed` | 1 HTTP |
| 7 | KV write (increment window) | log warn, continue | 1 KV write |
| 8 | `Promise.allSettled([owner email, auto-reply, n8n])` | Resend fail → 502; n8n fail → log only | 2–3 HTTP |
| 9 | Return `{ ok: true, code: 'sent' }` | — | — |

### Rate-limit algorithm
- Key: `rl:contact:<sha256(ip).slice(0,16)>` (IP never stored in clear — GDPR)
- Value: `{ count: number, windowStart: number }` — TTL 600s
- Logic: if `Date.now() - windowStart > 600_000` → reset; else increment; if `count >= 5` → 429

### Email payloads

**Owner notification (FR, reply_to = client email):**
```
Subject: [Portfolio] Nouveau message de {name}
From: hello@jeromedelodder.com
To: jerome@delodder.dev
Reply-To: {email}
Body (text): Nom: {name}\nEmail: {email}\nMessage:\n{message}
```

**Auto-reply (locale-aware, text/plain):**
```
Subject (FR): Votre message a bien été reçu
Subject (EN): Your message has been received
From: hello@jeromedelodder.com
To: {email}
Body: Locale-specific plain text, mentions 24–48h reply time
```

**n8n payload (enriched — updated 2026-05-08):**

The payload is built by `buildN8nPayload()` in `src/lib/contact/n8n.ts`.
All groups are pre-computed server-side so n8n nodes need zero string concatenation.

```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "message": "Bonjour, je voudrais...",
  "locale": "fr",
  "ts": 1746700000000,
  "source": "portfolio",

  "form": {
    "type": "contact",
    "source": "portfolio",
    "locale": "fr",
    "submittedAt": "2026-05-08T10:00:00.000Z",
    "submittedAtUnix": 1746694800
  },

  "contact": {
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "message": "Bonjour, je voudrais...",
    "messagePreview": "Bonjour, je voudrais...",
    "messageLength": 23
  },

  "labels": {
    "subjectOwner": "[Portfolio] Nouveau message de Jean Dupont",
    "subjectAutoReply": "Votre message a bien été reçu",
    "ownerGreeting": "Nouveau message de Jean Dupont",
    "autoReplyGreeting": "Bonjour Jean Dupont,"
  },

  "emails": {
    "ownerTo": "jerome@delodder.dev",
    "ownerFrom": "hello@jeromedelodder.com",
    "ownerReplyTo": "jean@example.com",
    "ownerBodyText": "Nom: Jean Dupont\nEmail: jean@example.com\nDate: 2026-05-08T10:00:00.000Z\n\nMessage:\nBonjour, je voudrais...",
    "autoReplyTo": "jean@example.com",
    "autoReplyFrom": "hello@jeromedelodder.com",
    "autoReplyBodyText": "Bonjour Jean Dupont,\n\nMerci pour votre message..."
  },

  "meta": {
    "country": "FR",
    "userAgent": "Mozilla/5.0 ...",
    "ipHash": "sha256:a1b2c3d4..."
  }
}
```

> **Backward compat:** root-level `name`, `email`, `message`, `locale`, `ts`, `source` are
> kept alongside the new groups so existing n8n nodes still work unchanged.

**n8n node mapping cheat-sheet:**

| n8n field                | Expression                              |
|--------------------------|-----------------------------------------|
| Owner email → To         | `{{ $json.emails.ownerTo }}`            |
| Owner email → From       | `{{ $json.emails.ownerFrom }}`          |
| Owner email → Subject    | `{{ $json.labels.subjectOwner }}`       |
| Owner email → Reply-To   | `{{ $json.emails.ownerReplyTo }}`       |
| Owner email → Body       | `{{ $json.emails.ownerBodyText }}`      |
| Auto-reply → To          | `{{ $json.emails.autoReplyTo }}`        |
| Auto-reply → From        | `{{ $json.emails.autoReplyFrom }}`      |
| Auto-reply → Subject     | `{{ $json.labels.subjectAutoReply }}`   |
| Auto-reply → Body        | `{{ $json.emails.autoReplyBodyText }}`  |
| IF locale = fr/en        | `{{ $json.form.locale }}`               |
| Submitted date           | `{{ $json.form.submittedAt }}`          |
| Sender country           | `{{ $json.meta.country }}`              |

**Auth:** `x-portfolio-secret` header (shared secret). Configure in n8n Webhook node →
Authentication → Header Auth → Header name: `x-portfolio-secret`.

**Timeout:** 10 s (increased from 3 s — email nodes can take 6-8 s with SMTP/OAuth).

**Skip if `N8N_WEBHOOK_URL` absent:** yes — skipped silently in dev, 502 in prod.

**URL format:** use `/webhook/<uuid>` (production) not `/webhook-test/<uuid>`.
The workflow must be **activated** in n8n (green toggle top-right).

---

## Security

| Vector | Defense |
|---|---|
| Spam bots | Honeypot (silent drop) |
| Headless bots | Turnstile siteverify (server-side, tokens are single-use, 5-min TTL) |
| Flood / DDoS | Rate-limit KV 5/10min/IP + CF Pages native DDoS protection |
| Validation bypass | Zod re-run server-side, never trust client |
| XSS in mailbox | Email sent as `text/plain` only |
| Email header injection | Zod strips `\r\n` from name/email; Resend lib escapes |
| Secret leakage | Only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is public. All others are server-side only. |
| CSP breakage | `next.config.ts` updated: `script-src` + `frame-src` += `https://challenges.cloudflare.com` |
| CORS | Route is same-origin only, no `Access-Control-Allow-Origin` header |
| Token replay | Turnstile: unique-use + expectedHostname; n8n: shared secret |
| IP logging | SHA-256 hashed before KV storage, never logged in clear |

---

## Environment Variables

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | Yes | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET` | server | Yes | Cloudflare Turnstile secret |
| `RESEND_API_KEY` | server | Yes | Resend API key |
| `RESEND_FROM` | server | Yes | `hello@jeromedelodder.com` (verified domain) |
| `RESEND_TO` | server | Yes | `jerome@delodder.dev` |
| `CONTACT_RATE_LIMIT` | CF KV binding | Yes | Cloudflare KV namespace binding |
| `N8N_WEBHOOK_URL` | server | No | n8n webhook URL (future) |
| `N8N_WEBHOOK_SECRET` | server | No | Shared secret for n8n auth (future) |

---

## File Map

### Created
```
src/lib/contact/
  schema.ts           — Zod schema (shared client/server)
  rate-limit.ts       — KV sliding window (+ dev stub)
  turnstile.ts        — Cloudflare siteverify wrapper
  email.ts            — Resend wrappers (owner + auto-reply)
  n8n.ts              — Fire-and-forget webhook
src/app/api/contact/
  route.ts            — Edge handler (9-step pipeline)
src/components/contact/
  ContactField.tsx    — Styled input/textarea (reusable)
  ContactSuccess.tsx  — Success panel (animated checkmark)
  ContactForm.tsx     — Main form client component
```

### Modified
```
src/components/Contact.tsx          — Inject <ContactForm /> under headlines
messages/fr.json                    — Add contact.form sub-object
messages/en.json                    — Add contact.form sub-object
next.config.ts                      — CSP: + challenges.cloudflare.com
package.json                        — + resend zod react-hook-form @hookform/resolvers @marsidev/react-turnstile
```

### Created (docs/infra)
```
.env.example                        — Template of all env vars
design-system/jerome-portfolio-contact/MASTER.md   — ui-ux design system (already created)
docs/superpowers/specs/2026-05-06-contact-form-design.md  — This file
docs/superpowers/plans/2026-05-06-contact-form.md         — Implementation plan
```

---

## i18n Keys Added (`contact.form`)

```json
{
  "contact": {
    "form": {
      "name_label": "Nom",
      "name_placeholder": "Votre nom",
      "email_label": "Email",
      "email_placeholder": "votre@email.com",
      "message_label": "Message",
      "message_placeholder": "Décrivez votre projet...",
      "submit": "Envoyer le message",
      "submitting": "Envoi...",
      "success_title": "Message envoyé.",
      "success_body": "Je réponds sous 24-48h.",
      "success_reset": "Envoyer un autre message",
      "error_generic": "Une erreur est survenue. Réessayez ou",
      "error_fallback": "contactez-moi directement",
      "error_rate_limited": "Trop de tentatives. Réessayez dans 10 minutes.",
      "error_captcha": "Vérification échouée. Réessayez.",
      "err_name_min": "Minimum 2 caractères",
      "err_name_max": "Maximum 80 caractères",
      "err_email_invalid": "Email invalide",
      "err_message_min": "Minimum 10 caractères",
      "err_message_max": "Maximum 2000 caractères"
    }
  }
}
```

---

## Smoke Test Checklist (V1 — Manual)

1. **Happy path FR:** Submit valid form on /fr → email reçu + auto-reply + success panel
2. **Happy path EN:** Submit valid form on /en → auto-reply in English
3. **Honeypot:** Submit with `company` field filled (via devtools) → silent 200, no email
4. **Rate-limit:** Submit 6 times in < 10 min → 6th returns 429 + UI error
5. **Email invalide:** Submit `notanemail` → zod error, no submission
6. **Message trop court:** Submit 5-char message → zod error client-side
7. **Message trop long:** Submit 2001-char message → zod error
8. **Turnstile missing:** Remove token from payload (curl) → 403
9. **Resend down:** Mock RESEND_API_KEY invalid → UI shows error + fallback mailto
10. **n8n down:** N8N_WEBHOOK_URL unreachable → email still sent, no UI error

---

## External Prerequisites (Not in Codebase)

1. Create email address or alias `hello@jeromedelodder.com` with your registrar/email provider
2. Verify domain `jeromedelodder.com` in Resend dashboard (add SPF/DKIM/DMARC DNS records)
3. Create Turnstile site in Cloudflare dashboard → get site key + secret
4. Create KV namespace `CONTACT_RATE_LIMIT` in Cloudflare dashboard
5. Add all env vars to Cloudflare Pages project settings
6. When ready: create n8n webhook trigger workflow, set `N8N_WEBHOOK_URL` + `N8N_WEBHOOK_SECRET`
