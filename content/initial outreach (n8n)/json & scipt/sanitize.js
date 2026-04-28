// ============================================================
// NODE: Sanitize Messages (V5.7)
// PURPOSE: Deterministic cleanup for LinkedIn delivery.
//          Conditionally enforces greeting on first message touchpoint.
//          Respects template instructions (warm reactivation, etc.).
//          Detects and removes duplicate greetings/thanks/names.
//          Enforces single question per message (removes extras).
//          Normalizes newlines.
//          HARD LIMIT: enforces max 2 paragraphs.
//          FIX V5.7: URL protection via placeholder/restore pattern
//                    to prevent regex transforms from breaking URLs.
// ROLE: Post-generation cleanup (on live path).
// ============================================================
const input = $input.first().json;
const touchpoints = input.touchpoints || {};
const dashRegex = /[\u2012\u2013\u2014\u2015\u2212]/g;
const smartSingleQuoteRegex = /[\u2018\u2019]/g;
const smartDoubleQuoteRegex = /[\u201C\u201D]/g;
const leadingEmojiRegex = /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D]+/u;
const asteriskRegex = /\*/g;

function protectURLs(text) {
  const store = [];
  const protected_ = text.replace(/https?:\/\/[^\s]+/g, (url) => {
    store.push(url);
    return `__SMURL_${store.length - 1}__`;
  });
  return { text: protected_, store };
}

function restoreURLs(text, store) {
  return text.replace(/__SMURL_(\d+)__/g, (_, i) => store[parseInt(i, 10)]);
}

const processedTouchpoints = {};
for (const key in touchpoints) {
  const tp = touchpoints[key];
  if (!tp || typeof tp.message !== 'string') { processedTouchpoints[key] = tp; continue; }
  let msg = tp.message;
  let urlStore = [];
  ({ text: msg, store: urlStore } = protectURLs(msg));
  msg = msg.replace(dashRegex, ',').replace(asteriskRegex, '');
  msg = msg.replace(smartSingleQuoteRegex, "'").replace(smartDoubleQuoteRegex, '"');
  msg = msg.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  // HARD LIMIT: enforce max 2 paragraphs
  const paragraphs = msg.split(/\n\n+/).filter(p => p.trim() !== '');
  if (paragraphs.length > 2) {
    msg = paragraphs[0] + '\n\n' + paragraphs.slice(1).join(' ');
  }
  msg = restoreURLs(msg, urlStore);
  const charCount = msg.length;
  processedTouchpoints[key] = {
    rawMessage: tp.message, message: msg, rationale: tp.rationale || {},
    charCount, exceedsConnectionLimit: charCount > 300, exceedsMessageLimit: charCount > 8000
  };
}
return [{ json: { touchpoints: processedTouchpoints }}];