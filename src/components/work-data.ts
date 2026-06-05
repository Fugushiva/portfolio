// Static project data for the Work section.
// Kept in a separate module so the (long) code strings live outside the
// main component file and can be tree-shaken / code-split with the
// gallery & code-viewer chunks.

import type { WorkflowImage } from '@/components/WorkflowGallery'
import type { ContentPiece } from '@/components/ContentGrid'
import type { CodeFile } from '@/components/CodeViewer'

export const N8N_IMAGES: WorkflowImage[] = [
  {
    src: '/projects/n8n-outreach/img/full-workflow.png',
    alt: 'Full n8n outreach automation workflow',
    label: 'Full pipeline overview',
    description: '9 sequential stages, 21 LLM nodes, 4 parallel branches — the complete outreach engine',
    wide: true,
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-1.png',
    alt: 'n8n workflow part 1 — entry & validation',
    label: 'Stage 1 — Entry & validation',
    description: 'Dual-entry validation with schema enforcement',
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-2.png',
    alt: 'n8n workflow part 2 — parallel branches',
    label: 'Stage 2–5 — 4 parallel branches',
    description: 'Language detection, personalization, KB retrieval, touchpoint parsing — concurrently',
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-3.png',
    alt: 'n8n workflow part 3 — strategy & generation',
    label: 'Stage 6–7 — Strategy & generation',
    description: 'Buyer classification feeds into strategy, then multi-touchpoint message generation',
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-4.png',
    alt: 'n8n workflow part 4 — quality gate & delivery',
    label: 'Stage 8–9 — Quality gate & delivery',
    description: 'Output contract enforcement with retry logic before production API delivery',
  },
  {
    src: '/projects/n8n-outreach/img/llm-language-detection.png',
    alt: 'LLM language detection node detail',
    label: 'LLM language detection',
    description: 'Prompt-level language enforcement — the highest-priority rule in the generation contract',
  },
  {
    src: '/projects/n8n-outreach/img/output-example-TP3.png',
    alt: 'Output example — touchpoint 3',
    label: 'Output — touchpoint 3',
    description: 'Real generated message: 2 paragraphs, Hemingway grade 6, yes/no close, 500 char limit',
  },
  {
    src: '/projects/n8n-outreach/img/output-exemple-TP-4-5.png',
    alt: 'Output examples — touchpoints 4 & 5',
    label: 'Output — touchpoints 4–5',
    description: 'Follow-up sequence messages with escalating urgency, same contract enforced',
  },
]

export const N8N_CODE_FILES: CodeFile[] = [
  {
    filename: 'rules.json',
    language: 'json',
    description:
      'Message generation contract — 13 strict rules injected into every LLM call. Language lock, tone control, formatting hard limits.',
    content: `let rules = \`MESSAGE GENERATION RULES

You must follow every rule below exactly.
If two rules seem to conflict, follow the more restrictive rule.
Do not ignore, relax, reinterpret, or override any rule.

1. LANGUAGE RULE
The campaign language is the ONLY language allowed in messages.
Write every single word of every message in the campaign language.
Even if the strategy, instructions, or prospect data are in English,
the message must be in the campaign language.
Do NOT mix languages. Zero exceptions.
This is the highest priority rule.

2. PERSONALIZATION & SAFETY
Use only verified, observable, explicit information.
Never invent facts about the prospect OR the sender's service.
Never infer unconfirmed details.

4. MESSAGE COMPLETION
Generate exactly one message for every required touchpoint.
Never skip a touchpoint.

6. TONE AND VOCABULARY
Write like a colleague in a hallway chat. Professional but relaxed.
Do not flatter. Do not compliment. Do not congratulate.
No amplifying adjectives: "huge", "amazing", "incredible".

8. SENTENCE LENGTH AND COUNT
Each sentence must be 10 words or less.
The default is 2 to 3 sentences in the body.

9. QUESTION RULE
Every message touchpoint MUST end with exactly one closed yes/no question.
The question MUST be answerable with ONLY "yes" or "no", 10 words or less.

10. CHARACTER LIMIT
Each message must be 500 characters maximum.

11. SIMPLICITY TARGET
Target Hemingway grade 6 or lower.
Short sentences (under 10 words). Common everyday words.
Subject + verb + object. No subordinate clauses.

12. BUZZWORDS BLACKLIST
scalable, enablement, empower, leverage, precision, complexity,
streamline, optimize, synergy, robust, holistic, facilitate, utilize,
implement, structured, alignment, operational, strategic

13. FORMATTING - HARD LIMIT
Do not use dashes. Use periods or commas instead.
HARD LIMIT: Every message must have EXACTLY 2 paragraphs.
Never 1. Never 3. Never more.

18. GREETING RULE
The first touchpoint MUST open with a greeting + "thanks for connecting".
Examples: "Hi Steven, thanks for connecting." (en)
          "Bonjour Mathieu, ravi d'etre en contact." (fr)

27. FORMALITY
In French: ALWAYS use "vous". NEVER use "tu".
In German: ALWAYS use "Sie". NEVER use "du".
In Spanish: ALWAYS use "usted". NEVER use "tu".
\`;

return [{ json: { rules } }];`,
  },
  {
    filename: 'sanitize.js',
    language: 'js',
    description:
      'Post-generation deterministic cleanup (V5.7) — URL protection, dash normalization, 2-paragraph enforcement, LinkedIn char limit flagging.',
    content: `// NODE: Sanitize Messages (V5.7)
// Deterministic cleanup for LinkedIn delivery.
// URL protection via placeholder/restore pattern.
// HARD LIMIT: enforces max 2 paragraphs.

const input = $input.first().json;
const touchpoints = input.touchpoints || {};
const dashRegex = /[\\u2012\\u2013\\u2014\\u2015\\u2212]/g;
const smartSingleQuoteRegex = /[\\u2018\\u2019]/g;
const smartDoubleQuoteRegex = /[\\u201C\\u201D]/g;
const asteriskRegex = /\\*/g;

function protectURLs(text) {
  const store = [];
  const protected_ = text.replace(/https?:\\/\\/[^\\s]+/g, (url) => {
    store.push(url);
    return \`__SMURL_\${store.length - 1}__\`;
  });
  return { text: protected_, store };
}

function restoreURLs(text, store) {
  return text.replace(/__SMURL_(\\d+)__/g,
    (_, i) => store[parseInt(i, 10)]);
}

const processedTouchpoints = {};
for (const key in touchpoints) {
  const tp = touchpoints[key];
  if (!tp || typeof tp.message !== 'string') {
    processedTouchpoints[key] = tp; continue;
  }

  let msg = tp.message;
  let urlStore = [];
  ({ text: msg, store: urlStore } = protectURLs(msg));

  msg = msg.replace(dashRegex, ',').replace(asteriskRegex, '');
  msg = msg.replace(smartSingleQuoteRegex, "'")
           .replace(smartDoubleQuoteRegex, '"');
  msg = msg.replace(/ {2,}/g, ' ')
           .replace(/\\n{3,}/g, '\\n\\n').trim();

  // HARD LIMIT: enforce max 2 paragraphs
  const paragraphs = msg.split(/\\n\\n+/).filter(p => p.trim() !== '');
  if (paragraphs.length > 2) {
    msg = paragraphs[0] + '\\n\\n' + paragraphs.slice(1).join(' ');
  }

  msg = restoreURLs(msg, urlStore);
  const charCount = msg.length;

  processedTouchpoints[key] = {
    rawMessage: tp.message,
    message: msg,
    rationale: tp.rationale || {},
    charCount,
    exceedsConnectionLimit: charCount > 300,
    exceedsMessageLimit: charCount > 8000,
  };
}

return [{ json: { touchpoints: processedTouchpoints } }];`,
  },
]

// ─── Spotify Podcast Veille Automation ───────────────────────────────────────
// Daily n8n pipeline (workflow T1GfBPerstKKRB6G): 19 podcast RSS feeds →
// transcription (Groq Whisper) → French summary (Gemini) → Obsidian note.
// Sanitized: no credentials, paths kept (non-sensitive infra layout).

export const SPOTIFY_IMAGES: WorkflowImage[] = [
  {
    src: '/projects/spotify-veille/full-workflow.png',
    alt: 'Full n8n Spotify podcast veille workflow',
    label: 'Full pipeline overview',
    description: 'Daily cron → 19 RSS feeds → compress → transcribe → summarize → Obsidian note → Telegram recap',
    wide: true,
  },
  {
    src: '/projects/spotify-veille/workflow-rss-filter.png',
    alt: 'RSS fetch and 24h / duration filtering',
    label: 'Stage 1 — RSS & filter',
    description: 'Fetch each RSS feed, keep episodes from the last 24h, skip anything over 2h (Groq size ceiling)',
  },
  {
    src: '/projects/spotify-veille/workflow-compress-transcribe.png',
    alt: 'Download, ffmpeg compression and Groq transcription',
    label: 'Stage 2 — Compress & transcribe',
    description: 'HTTP download → ffmpeg mono 16kHz/32kbps → Groq Whisper (verbose_json returns the detected language)',
  },
  {
    src: '/projects/spotify-veille/workflow-summarize-note.png',
    alt: 'Language detection, translation, Gemini summary and note rendering',
    label: 'Stage 3 — Summarize & write',
    description: 'Detect language → translate to French if needed → Gemini summary → structured Markdown note in the vault',
  },
  {
    src: '/projects/spotify-veille/workflow-error-handling.png',
    alt: 'Groq retry loop and error handlers',
    label: 'Resilience — retry & errors',
    description: 'Groq 429 rate-limit retry (dynamic wait, max 3) + download/summarize error handlers that never crash the batch',
  },
  {
    src: '/projects/spotify-veille/output-note-example.png',
    alt: 'Example of a generated Obsidian note',
    label: 'Output — generated note',
    description: 'Real generated note: frontmatter + Résumé + Points clés + Citations notables, fully in French',
  },
]

export const SPOTIFY_CODE_FILES: CodeFile[] = [
  {
    filename: 'parse-filter.js',
    language: 'js',
    description:
      'Episode filter — keeps only episodes published in the last 24h and extracts the duration from itunes:duration. Episodes over 1h59:59 are skipped (Groq Whisper size + audio-seconds-per-hour ceiling).',
    content: `// NODE: Parse Filter (Code)
// Reads the raw RSS XML, keeps fresh episodes, extracts duration.
// Input fallback: n8n may expose the body as .data or .rss_xml.

const rssXml = $input.item.json.data || $input.item.json.rss_xml || '';
const rssUrl = $input.item.json.rss_url || '';
const podcastTitle = $input.item.json.podcast_title || '';

// Cutoff = now - 24h
const cutoff = Date.now() - 24 * 60 * 60 * 1000;
const MAX_DURATION = 7199; // 1h59:59 — Groq ceiling

// Parse an itunes:duration value ("3600" or "1:02:33") into seconds.
function toSeconds(raw) {
  if (!raw) return 0;
  if (/^\\d+$/.test(raw)) return parseInt(raw, 10);
  const parts = raw.split(':').map((n) => parseInt(n, 10) || 0);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// Grab the first <item> (latest episode) only — 1 per podcast per run.
const itemMatch = rssXml.match(/<item[\\s\\S]*?<\\/item>/i);
if (!itemMatch) return []; // nothing to process

const item = itemMatch[0];
const pick = (tag) => {
  const m = item.match(new RegExp('<' + tag + '[^>]*>([\\\\s\\\\S]*?)<\\\\/' + tag + '>', 'i'));
  return m ? m[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, '').trim() : '';
};

const episodeTitle = pick('title');
const pubDate = pick('pubDate');
const duration = toSeconds(pick('itunes:duration'));

// Enclosure URL = the actual MP3 (dedup key downstream).
const enc = item.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
const episodeUrl = enc ? enc[1] : '';

// Drop stale, too-long, or malformed episodes.
const publishedMs = Date.parse(pubDate);
if (!episodeUrl) return [];
if (Number.isFinite(publishedMs) && publishedMs < cutoff) return [];
if (duration > MAX_DURATION) return [];

return [{
  json: {
    podcast_title: podcastTitle,
    rss_feed_url: rssUrl,
    episode_title: episodeTitle,
    episode_url: episodeUrl,
    published_at: pubDate,
    duration_seconds: duration,
  },
}];`,
  },
  {
    filename: 'calc-retry-wait.js',
    language: 'js',
    description:
      'Groq error handler on the transcription branch. Parses the "try again in Xs" message to wait exactly the right amount on a 429 rate-limit, caps retries at 3, and skips immediately on a 413 (file too large even after compression).',
    content: `// NODE: Calc Retry Wait (Code) — Groq transcription error branch
// 429 = ASPH rate limit (7200 audio-seconds/hour on free tier).
// 413 = payload too large even after compression → skip, no retry.

const j = $input.item.json;
const err = j.error?.message || j.message || JSON.stringify(j);

// 413 → abandon this episode immediately, let the batch continue.
if (j.statusCode === 413 || /request entity too large|payload too large/i.test(err)) {
  throw new Error('Groq 413: file too large after compression, skip');
}

// Default wait, overridden by the precise delay Groq returns.
let seconds = 60;
const m = err.match(/try again in\\s+(?:(\\d+)m)?([\\d.]+)s/i);
if (m) {
  const mins = parseInt(m[1] || '0', 10);
  const secs = parseFloat(m[2] || '0');
  seconds = Math.ceil(mins * 60 + secs) + 3; // small safety margin
}

// Anti-infinite-loop: bail after 3 tries.
const tries = (j._retry_count || 0) + 1;
if (tries > 3) {
  throw new Error('Groq rate limit: giving up after 3 retries');
}

// NOTE: do NOT pass the binary here. In binaryDataMode=filesystem the
// reference is lost on retry — the loop re-reads small.mp3 from disk instead.
return [{ json: { ...j, wait_seconds: seconds, _retry_count: tries } }];`,
  },
  {
    filename: 'render-note.js',
    language: 'js',
    description:
      'Builds the final Obsidian note: YAML frontmatter (date, podcast, tags, URLs) plus the Gemini summary body. Returns an absolute vault path used by both the file writer and the Supabase upsert.',
    content: `// NODE: Render Note (Code)
// chainLlm output lives on $json.output (not .text).
// note_path is absolute — the vault dir is bind-mounted into the container.

const summary = $json.output || '(summary unavailable)';
const title = $('Parse Filter').item.json.episode_title || 'Untitled episode';
const podcast = $('Parse Filter').item.json.podcast_title || '';
const pubDate = $('Parse Filter').item.json.published_at || '';
const epUrl = $('Parse Filter').item.json.episode_url || '';
const rssFeed = $('Parse Filter').item.json.rss_feed_url || '';

// Slugify the title for the filename.
const slug = title.toLowerCase()
  .replace(/[^a-z0-9\\s-]/g, '')
  .trim()
  .replace(/\\s+/g, '-')
  .substring(0, 60);

const today = new Date().toISOString().split('T')[0];
const notePath = '/opt/vault/veille/spotify/' + today + '-' + slug + '.md';

const content = \`---
created: \${today}
status: ok
tags: [veille/spotify, podcast/résumé]
podcast: "\${podcast}"
published_at: "\${pubDate}"
episode_url: "\${epUrl}"
rss_feed_url: "\${rssFeed}"
---
# \${title}

\${summary}
\`;

return {
  json: {
    note_content: content,
    note_path: notePath,
    episode_url: epUrl,
    rss_feed_url: rssFeed,
    podcast_title: podcast,
    episode_title: title,
    published_at: pubDate,
  },
};`,
  },
]

// ─── Instagram Comment-to-DM Automation ──────────────────────────────────────
// Sanitized: webhookIds, documentIds, credentials.id, workflowIds, pinData
// and instanceIds removed. Replaced by self-explanatory placeholders.

export const INSTAGRAM_IMAGES: WorkflowImage[] = [
  {
    src: '/projects/instagram-bot/keyword-comment-workflow.png',
    alt: 'Main n8n workflow — Instagram comment listener',
    label: 'Workflow 1 — Comment listener',
    description:
      'Webhook entry point. A Switch node routes Instagram events by type (comment vs DM), then dedupe + keyword lookup against a Google Sheets registry.',
    wide: true,
  },
  {
    src: '/projects/instagram-bot/anwsr-message-workflow.png',
    alt: 'Sub-workflow — DM distributor',
    label: 'Workflow 2 — DM distributor',
    description:
      'Dedicated sub-workflow called by the main one. Looks up the resource URL for the matched keyword and delivers it via the Instagram Graph API.',
    wide: true,
  },
  {
    src: '/projects/instagram-bot/output-comment-example.png',
    alt: 'Example of an automated public comment reply',
    label: 'Public reply — in production',
    description:
      'The bot acknowledges the comment publicly and instructs the user to DM the keyword to receive the resource.',
  },
  {
    src: '/projects/instagram-bot/output-message-example.png',
    alt: 'Example of an automated DM delivering the resource',
    label: 'DM with resource — in production',
    description:
      'Resource URL pulled from the Google Sheets mapping and delivered in DM via the Instagram Graph API.',
  },
]

export const INSTAGRAM_CODE_FILES: CodeFile[] = [
  {
    filename: 'event-router.json',
    language: 'json',
    description:
      'Switch node that splits the Instagram webhook into two routes: comments and direct messages. First point of intelligence — disambiguates the event type before any business logic runs.',
    content: `// n8n Switch node — Instagram webhook event router
// Splits a single Instagram webhook into 2 typed routes.

{
  "type": "n8n-nodes-base.switch",
  "rules": {
    "values": [
      {
        "outputKey": "Comment route",
        "conditions": {
          "combinator": "and",
          "conditions": [
            {
              "leftValue": "={{ $json.body.entry[0].changes[0].value.media }}",
              "operator": { "type": "object", "operation": "exists" }
            }
          ]
        }
      },
      {
        "outputKey": "Message route",
        "conditions": {
          "combinator": "and",
          "conditions": [
            {
              "leftValue": "={{ $json.body.entry[0].messaging[0].message }}",
              "operator": { "type": "object", "operation": "notEmpty" }
            }
          ]
        }
      }
    ]
  }
}`,
  },
  {
    filename: 'dedupe-and-keyword-match.json',
    language: 'json',
    description:
      'The business core: dedupe (one trigger per user per post) + keyword lookup against a Google Sheets registry. Adding a new lead magnet = appending a row, no redeploy.',
    content: `// Pipeline excerpt — dedupe + keyword match
// commenter_id + media_id is the dedupe key.
// keyword lookup hits an "active=true" filter so rows can be paused
// in Google Sheets without removing them.

// 1) Extract canonical fields from the raw webhook payload
{
  "type": "n8n-nodes-base.set",
  "name": "get data",
  "assignments": [
    { "name": "commenter_id",       "value": "={{ $json.body.entry[0].changes[0].value.from.id }}" },
    { "name": "commenter_username", "value": "={{ $json.body.entry[0].changes[0].value.from.username }}" },
    { "name": "comment_text",       "value": "={{ $json.body.entry[0].changes[0].value.text }}" },
    { "name": "comment_id",         "value": "={{ $json.body.entry[0].changes[0].value.id }}" },
    { "name": "media_id",           "value": "={{ $json.body.entry[0].changes[0].value.media.id }}" },
    { "name": "media_type",         "value": "={{ $json.body.entry[0].changes[0].value.media.media_product_type }}" }
  ]
}

// 2) DB check — lookup historical (commenter_id, media_id) in commenter_list
{
  "type": "n8n-nodes-base.googleSheets",
  "name": "DB check",
  "documentId": "[YOUR_SHEET_ID]",
  "sheet": "commenter_list",
  "filters": [
    { "lookupColumn": "commenter_id", "lookupValue": "={{ $json.commenter_id }}" },
    { "lookupColumn": "media_id",     "lookupValue": "={{ $json.media_id }}" }
  ]
}

// 3) IF guard — proceed ONLY if no prior trigger exists for this (user, post)
{
  "type": "n8n-nodes-base.if",
  "name": "Already commented this post?",
  "combinator": "and",
  "conditions": [
    { "leftValue": "={{ $json.commenter_id }}", "operator": "notExists" },
    { "leftValue": "={{ $json.media_id }}",     "operator": "notExists" }
  ]
}

// 4) Keyword lookup — match the (lowercased, trimmed) comment text
//    against the resource_map sheet, filtered to active rows only
{
  "type": "n8n-nodes-base.googleSheets",
  "name": "Get row(s) in sheet",
  "documentId": "[YOUR_SHEET_ID]",
  "sheet": "resource_map",
  "filters": [
    { "lookupColumn": "active",  "lookupValue": "true" },
    { "lookupColumn": "keyword", "lookupValue": "={{ $('get data').item.json.comment_text.toLowerCase().trim() }}" }
  ]
}

// 5) IF guard — only continue if a keyword row was actually returned
{
  "type": "n8n-nodes-base.if",
  "name": "keyword ?",
  "combinator": "and",
  "conditions": [
    { "leftValue": "={{ $json.keyword }}", "operator": "notEmpty" }
  ]
}`,
  },
  {
    filename: 'dm-distributor.json',
    language: 'json',
    description:
      'The sub-workflow called once a keyword is matched. Looks up the resource URL by keyword and sends a DM through the Instagram Graph API. Lives in its own workflow file for separation of concerns.',
    content: `// Sub-workflow — DM distributor
// Triggered by the main workflow via Execute Workflow node.
// Receives the raw Instagram event in passthrough mode.

// 1) Trigger — entry from the calling workflow
{
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "name": "When Executed by Another Workflow",
  "inputSource": "passthrough"
}

// 2) Resolve resource_url from the keyword the user sent in DM
{
  "type": "n8n-nodes-base.googleSheets",
  "name": "Get row(s) in sheet",
  "documentId": "[YOUR_SHEET_ID]",
  "sheet": "resource_map",
  "options": { "returnFirstMatch": true },
  "filters": [
    { "lookupColumn": "keyword",
      "lookupValue": "={{ $json.body.entry[0].messaging[0].message.text }}" }
  ]
}

// 3) Project the fields needed by the Graph API call
{
  "type": "n8n-nodes-base.set",
  "name": "Edit Fields",
  "assignments": [
    { "name": "timestamp",    "value": "={{ $('When Executed by Another Workflow').item.json.body.entry[0].messaging[0].timestamp }}" },
    { "name": "sender_id",    "value": "={{ $('When Executed by Another Workflow').item.json.body.entry[0].messaging[0].sender.id }}" },
    { "name": "recipient_id", "value": "={{ $('When Executed by Another Workflow').item.json.body.entry[0].messaging[0].recipient.id }}" },
    { "name": "text_message", "value": "={{ $('When Executed by Another Workflow').item.json.body.entry[0].messaging[0].message.text }}" }
  ]
}

// 4) Deliver the resource via Instagram Graph API
{
  "type": "n8n-nodes-base.httpRequest",
  "name": "HTTP Request",
  "method": "POST",
  "url":    "=https://graph.instagram.com/{{ $json.recipient_id }}/messages",
  "authentication": "[REDACTED — Bearer]",
  "jsonBody": {
    "recipient": { "id": "={{ $json.sender_id }}" },
    "message":   { "text": "Voici la ressource 👉 {{ $('Get row(s) in sheet').item.json.resource_url }}" }
  }
}`,
  },
]

export const CONTENT_PIECES: ContentPiece[] = [
  { src: '/projects/content-engine/img/Sales-Funnel-Overview-(1).png', alt: 'Sales funnel overview', platform: 'Sales', format: 'Funnel Overview', theme: 'light', span: 'wide' },
  { src: '/projects/content-engine/img/LI-C1-S1-Hook-Light.png', alt: 'LinkedIn carousel hook light', platform: 'LinkedIn', format: 'Carousel Hook', theme: 'light' },
  { src: '/projects/content-engine/img/L1.1-Hook-(Dark).png', alt: 'LinkedIn hook dark', platform: 'LinkedIn', format: 'Hook Post', theme: 'dark' },
  { src: '/projects/content-engine/img/S1.1-Hook.png', alt: 'Stories hook', platform: 'Stories', format: 'Hook Slide', theme: 'light', span: 'tall' },
  { src: '/projects/content-engine/img/S1.5-CTA.png', alt: 'Stories CTA', platform: 'Stories', format: 'CTA Slide', theme: 'light', span: 'tall' },
  { src: '/projects/content-engine/img/S2.1-Hook-(Dark).png', alt: 'Stories hook dark', platform: 'Stories', format: 'Hook Slide', theme: 'dark', span: 'tall' },
  { src: '/projects/content-engine/img/S2.1-Hook.png', alt: 'Stories hook light v2', platform: 'Stories', format: 'Hook Slide v2', theme: 'light', span: 'tall' },
  { src: '/projects/content-engine/img/S2-4-Card-Grid.png', alt: 'Stories card grid', platform: 'Stories', format: 'Card Grid', theme: 'dark' },
  { src: '/projects/content-engine/img/S2-5-CTA.png', alt: 'Stories CTA v2', platform: 'Stories', format: 'CTA Slide v2', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-1-White-Pain-Hook-(SDRs).png', alt: 'Ad pain hook SDRs white', platform: 'Ads', format: 'Pain Hook', theme: 'light' },
  { src: '/projects/content-engine/img/AD-2-White-Stat-Proof-(3-5-).png', alt: 'Ad stat proof white', platform: 'Ads', format: 'Stat Proof', theme: 'light' },
  { src: '/projects/content-engine/img/AD-3-White-Offer-CTA-(7-days).png', alt: 'Ad offer CTA white', platform: 'Ads', format: 'Offer CTA', theme: 'light' },
  { src: '/projects/content-engine/img/AD-4-White-Testimonial.png', alt: 'Ad testimonial white', platform: 'Ads', format: 'Testimonial', theme: 'light' },
  { src: '/projects/content-engine/img/AD-6-Dark-Question-Hook.png', alt: 'Ad question hook dark', platform: 'Ads', format: 'Question Hook', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-8-Dark-Social-Proof-Stats.png', alt: 'Ad social proof dark', platform: 'Ads', format: 'Social Proof', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-9-Dark-Urgency-7-Days.png', alt: 'Ad urgency dark', platform: 'Ads', format: 'Urgency CTA', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-10-Dark-Replace-SDR-Team.png', alt: 'Ad replace SDR team dark', platform: 'Ads', format: 'Bold Claim', theme: 'dark' },
  { src: '/projects/content-engine/img/THR-Carousel-C3-3-DataStat-Dark.png', alt: 'Threads carousel data stat', platform: 'Threads', format: 'Carousel Stat', theme: 'dark' },
  { src: '/projects/content-engine/img/THR-Carousel-C6-1-Hook-Dark.png', alt: 'Threads carousel hook', platform: 'Threads', format: 'Carousel Hook', theme: 'dark' },
  { src: '/projects/content-engine/img/THR-Portrait-S2-L2.2-DataStat-Dark.png', alt: 'Threads portrait data stat', platform: 'Threads', format: 'Portrait Stat', theme: 'dark', span: 'tall' },
]

// ─── Project registry ────────────────────────────────────────────────────────
// Visual / structural metadata for each project, locale-agnostic.
// Localized copy lives in messages/<locale>.json under `work.projects[i]`
// and is zipped with this array by index — keep them in sync.

export type GalleryType = 'none' | 'workflow' | 'content'

export interface ProjectMeta {
  index: string
  accent: string
  accentRgb: string
  stack: string[]
  category_icon: string
  hasGallery: boolean
  galleryType: GalleryType
  /** Workflow screenshots — required when `galleryType === 'workflow'`. */
  images?: WorkflowImage[]
  /** Code snippets shown in the Source tab — optional even for workflow projects. */
  codeFiles?: CodeFile[]
  /** Content gallery pieces — required when `galleryType === 'content'`. */
  contentPieces?: ContentPiece[]
}

export const PROJECT_META: ProjectMeta[] = [
  {
    index: '00',
    accent: '#1db954',
    accentRgb: '29,185,84',
    stack: ['n8n', 'Groq Whisper', 'Gemini', 'ffmpeg', 'Supabase Postgres', 'Telegram', 'Docker'],
    category_icon: '🎙️',
    hasGallery: true,
    galleryType: 'workflow',
    images: SPOTIFY_IMAGES,
    codeFiles: SPOTIFY_CODE_FILES,
  },
  {
    index: '01',
    accent: '#10b981',
    accentRgb: '16,185,129',
    stack: ['Next.js 16.2', 'React 19', 'Tailwind v4', 'shadcn/ui', 'Supabase', 'pgvector', 'Gemini 2.5 Flash-Lite', 'OpenAI Embeddings', 'Stripe', 'Vercel'],
    category_icon: '🌏',
    hasGallery: false,
    galleryType: 'none',
  },
  {
    index: '02',
    accent: '#f97316',
    accentRgb: '249,115,22',
    stack: ['n8n', 'Instagram Graph API', 'Google Sheets API', 'Webhooks'],
    category_icon: '📱',
    hasGallery: true,
    galleryType: 'workflow',
    images: INSTAGRAM_IMAGES,
    codeFiles: INSTAGRAM_CODE_FILES,
  },
  {
    index: '03',
    accent: '#7c3aed',
    accentRgb: '124,58,237',
    stack: ['n8n', 'Google Vertex AI', 'Gemini', 'LangChain', 'Python', 'REST APIs'],
    category_icon: '⚡',
    hasGallery: true,
    galleryType: 'workflow',
    images: N8N_IMAGES,
    codeFiles: N8N_CODE_FILES,
  },
  {
    index: '04',
    accent: '#06b6d4',
    accentRgb: '6,182,212',
    stack: ['Google Opal', 'Nano Banana', 'Multi-agent orchestration', 'Structured outputs'],
    category_icon: '🧠',
    hasGallery: false,
    galleryType: 'none',
  },
  {
    index: '05',
    accent: '#f43f5e',
    accentRgb: '244,63,94',
    stack: ['Figma', 'Claude', 'CapCut', 'Notion', 'LinkedIn', 'Instagram', 'YouTube', 'Threads', 'Bluesky'],
    category_icon: '🎨',
    hasGallery: true,
    galleryType: 'content',
    contentPieces: CONTENT_PIECES,
  },
  {
    index: '06',
    accent: '#FFD21E',
    accentRgb: '255,210,30',
    stack: ['n8n', 'PostgreSQL', 'Supabase', 'Groq (Llama 3.3 70B)', 'HuggingFace API', 'Telegram Bot API', 'Syncthing'],
    category_icon: '🤗',
    hasGallery: false,
    galleryType: 'none',
  },
]
