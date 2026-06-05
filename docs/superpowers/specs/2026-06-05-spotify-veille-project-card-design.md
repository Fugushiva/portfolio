# Spotify Veille — Portfolio Project Card

**Date:** 2026-06-05
**Status:** Approved
**Author:** Jérôme Delodder (via OpenCode)

## Goal

Add the Spotify podcast veille automation (n8n workflow `T1GfBPerstKKRB6G`) as the
featured (first) project in the portfolio's Work section, following the existing
project-card pattern. Type `workflow` (screenshots + code), Spotify-green accent.

## Context

The Work section renders projects from two index-zipped sources:

- `src/components/work-data.ts` — `PROJECT_META[]`: visual/structural metadata
  (accent, stack, gallery type, images, code files).
- `messages/{en,fr}.json` under `work.projects[]` — localized copy
  (title, category, year, client, headline, description, architecture, metrics).

The two arrays are zipped **by index** in `Work.tsx` (`PROJECT_META[i]` ↔
`projects[i]`). They MUST stay in sync, same length, same order.

Tab intros (`WORKFLOW_GALLERY_INTRO`, `CODE_TAB_INTRO`) in `Work.tsx` are keyed
by the `meta.index` string (e.g. `'02'`, `'03'`).

Image assets live in `public/projects/<slug>/`.

## Decisions

- **Position:** first (mise en avant).
- **Index numbering:** Spotify = `'00'`; existing projects keep `01`–`05`
  (minimal churn — existing intro keys `'02'`/`'03'` stay valid).
- **Gallery type:** `workflow` (screenshots + Source code tab).
- **Images:** placeholders only for now — paths wired, PNGs dropped later by user.
- **Copy tone:** same factual/result-oriented style as existing cards, real
  numbers sourced from the project's retex notes.
- **Slug:** `spotify-veille`.
- **Accent:** Spotify green `#1db954` (rgb `29,185,84`).

## Changes

### 1. `src/components/work-data.ts`

- New `SPOTIFY_IMAGES: WorkflowImage[]` — 6 entries pointing to
  `/projects/spotify-veille/*.png` (first one `wide: true`).
- New `SPOTIFY_CODE_FILES: CodeFile[]` — 3 sanitized real artifacts:
  - `parse-filter.js` — 24h cutoff + `itunes:duration` extraction + skip >7199s.
  - `calc-retry-wait.js` — Groq 429/413 handler (parse "try again in Xs",
    max-3 retry, 413 immediate skip).
  - `render-note.js` — frontmatter + structured Markdown note builder.
- New `PROJECT_META` entry **inserted at position 0**:
  - `index: '00'`, `accent: '#1db954'`, `accentRgb: '29,185,84'`.
  - `stack: ['n8n', 'Groq Whisper', 'Gemini', 'ffmpeg', 'Supabase Postgres', 'Telegram', 'Docker']`.
  - `category_icon: '🎙️'`, `hasGallery: true`, `galleryType: 'workflow'`,
    `images: SPOTIFY_IMAGES`, `codeFiles: SPOTIFY_CODE_FILES`.

### 2. `src/components/Work.tsx`

- Add `'00'` key to `WORKFLOW_GALLERY_INTRO`.
- Add `'00'` key to `CODE_TAB_INTRO`.

### 3. `messages/en.json` + `messages/fr.json`

- Insert a new object at `work.projects[0]` (push existing five down), with:
  - Title: *Spotify Podcast Intelligence* (EN) / *Veille Podcasts Spotify* (FR).
  - Headline, description, architecture (` · `-separated pills), 4 metrics.

### 4. `public/projects/spotify-veille/`

- Create the directory (with a `.gitkeep`) so the wired image paths resolve once
  the user drops the real PNGs.

## Image paths (placeholders)

```
/projects/spotify-veille/full-workflow.png          (wide)
/projects/spotify-veille/workflow-rss-filter.png
/projects/spotify-veille/workflow-compress-transcribe.png
/projects/spotify-veille/workflow-summarize-note.png
/projects/spotify-veille/workflow-error-handling.png
/projects/spotify-veille/output-note-example.png
```

## Out of scope

- No refactor of the index-zipping mechanism (kept as-is).
- No real screenshots (user provides later).
- No changes to other projects' copy or metadata.

## Verification

- `PROJECT_META.length === work.projects.length` in both locales (6).
- Type-check / lint clean.
- `next build` succeeds.
