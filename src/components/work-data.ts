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

export const PROJECT_META = [
  {
    index: '01',
    accent: '#7c3aed',
    accentRgb: '124,58,237',
    stack: ['n8n', 'Google Vertex AI', 'Gemini', 'LangChain', 'Python', 'REST APIs'],
    category_icon: '⚡',
    hasGallery: true,
    galleryType: 'workflow' as const,
  },
  {
    index: '02',
    accent: '#06b6d4',
    accentRgb: '6,182,212',
    stack: ['Next.js 15', 'React 19', 'Supabase', 'PostgreSQL', 'PL/pgSQL', 'Tailwind v4', 'OVH API'],
    category_icon: '🏗️',
    hasGallery: false,
    galleryType: 'none' as const,
  },
  {
    index: '03',
    accent: '#a78bfa',
    accentRgb: '167,139,250',
    stack: ['Google Opal', 'Nano Banana', 'Multi-agent orchestration', 'Structured outputs'],
    category_icon: '🧠',
    hasGallery: false,
    galleryType: 'none' as const,
  },
  {
    index: '04',
    accent: '#f43f5e',
    accentRgb: '244,63,94',
    stack: ['Figma', 'Claude', 'CapCut', 'Notion', 'LinkedIn', 'Instagram', 'YouTube', 'Threads', 'Bluesky'],
    category_icon: '🎨',
    hasGallery: true,
    galleryType: 'content' as const,
  },
] as const

export type ProjectMeta = (typeof PROJECT_META)[number]
