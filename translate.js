#!/usr/bin/env node
/**
 * translate.js — Auto-translate changed Chinese text in HTML files
 *
 * What it does:
 *   1. Scans all *.html files for elements with the data-i18n attribute
 *   2. Computes a hash of each element's current Chinese innerHTML
 *   3. If the hash differs from the stored data-zh-hash (or hash is absent),
 *      the element is sent to Claude for translation
 *   4. Updates data-en / data-en-html and data-zh-hash in-place in the file
 *
 *   If you edit data-en manually WITHOUT changing the Chinese, the stored hash
 *   still matches on the next run so your manual English stays.
 *
 * Usage:
 *   node translate.js               — translate all changed items
 *   node translate.js index.html    — translate one file only
 *
 * Setup (first time):
 *   npm install
 *   export ANTHROPIC_API_KEY=your_key_here
 */

'use strict';

const fs   = require('fs');
const path = require('path');

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (_) {
  console.error('\nMissing dependency. Run:\n  npm install\n');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\nMissing API key. Set it with:\n  export ANTHROPIC_API_KEY=your_key_here\n');
  process.exit(1);
}

const client = new Anthropic();

/* ── helpers ── */

/** Simple non-cryptographic hash for change detection. Must match stamp-hashes.js. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function encodeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * State-machine opening-tag scanner that respects quoted attribute values.
 * Returns [{ tagStart, tagEnd, tagName, attrs, selfClosing }].
 */
function findOpeningTags(html) {
  const out = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== '<') { i++; continue; }

    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const end = html.indexOf('>', i);
      i = end < 0 ? html.length : end + 1;
      continue;
    }
    if (html[i + 1] === '/') {
      const end = html.indexOf('>', i);
      i = end < 0 ? html.length : end + 1;
      continue;
    }
    if (!/[a-zA-Z]/.test(html[i + 1] || '')) { i++; continue; }

    const tagStart = i;
    i++;
    let tagName = '';
    while (i < html.length && /[a-zA-Z0-9-]/.test(html[i])) {
      tagName += html[i];
      i++;
    }

    let attrs = '';
    while (i < html.length && html[i] !== '>') {
      const ch = html[i];
      if (ch === '"' || ch === "'") {
        attrs += ch;
        i++;
        while (i < html.length && html[i] !== ch) {
          attrs += html[i];
          i++;
        }
        if (i < html.length) { attrs += html[i]; i++; }
      } else {
        attrs += ch;
        i++;
      }
    }

    if (i >= html.length) break;
    const tagEnd = i + 1;
    const selfClosing = /\/\s*$/.test(attrs);
    out.push({ tagStart, tagEnd, tagName, attrs, selfClosing });
    i = tagEnd;
  }
  return out;
}

function findCloseIdx(html, tagName, fromIdx) {
  const re = new RegExp(`</${tagName}\\s*>`, 'g');
  re.lastIndex = fromIdx;
  const m = re.exec(html);
  return m ? m.index : -1;
}

/* ── translation via Claude ── */

async function batchTranslate(items) {
  if (items.length === 0) return [];

  const inputList = items.map((it, idx) => `[${idx}] ${it.text}`).join('\n');

  const prompt = `You are translating website content for ConnectEd Research Institute, \
a nonprofit that expands access to research mentorship and academic opportunity for \
motivated students from underrepresented backgrounds.

Translate each numbered Chinese snippet to natural, professional English suitable for a \
nonprofit research institute website.
- Preserve any HTML tags exactly as-is (e.g. <br>, <span>, <strong>, <em>)
- Preserve HTML entities like &mdash; &rsquo; &middot; &amp;
- Keep proper nouns and brand names (ConnectEd, Research Fellowships, Young Scholars) stable
- Match the existing tone: measured, institutional, unmarketing
- Output ONLY a JSON array of strings, indexed from 0, matching the input order
- No explanation, no markdown fences, just the raw JSON array

Input:
${inputList}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse translation response:\n' + raw.slice(0, 300));
  return JSON.parse(match[0]);
}

/* ── HTML file processing ── */

function findCandidates(content) {
  const candidates = [];
  const tags = findOpeningTags(content);

  for (const t of tags) {
    if (!/\bdata-i18n\b/.test(t.attrs)) continue;
    if (t.selfClosing) continue;

    const closeIdx = findCloseIdx(content, t.tagName, t.tagEnd);
    if (closeIdx < 0) continue;

    const innerHtml = content.slice(t.tagEnd, closeIdx).trim();
    const innerText = stripHtml(innerHtml);
    if (!innerText) continue;

    const hashMatch = t.attrs.match(/data-zh-hash="([^"]*)"/);
    const storedHash = hashMatch ? hashMatch[1] : null;
    const currentHash = hash(innerHtml);

    // Skip if hash matches — this preserves manual English edits.
    if (storedHash === currentHash) continue;

    const containsHtml = /<[a-zA-Z]/.test(innerHtml);

    candidates.push({
      tagStart   : t.tagStart,
      tagEnd     : t.tagEnd,
      tagName    : t.tagName,
      attrs      : t.attrs,
      innerHtml,
      innerText,
      currentHash,
      containsHtml,
      closeStart : closeIdx,
    });
  }

  return candidates;
}

function applyTranslations(content, candidates, translations) {
  const sorted = candidates
    .map((c, i) => ({ ...c, translation: translations[i] }))
    .sort((a, b) => b.tagStart - a.tagStart);

  for (const item of sorted) {
    let attrs = item.attrs;

    attrs = attrs
      .replace(/\s*data-zh-hash="[^"]*"/g, '')
      .replace(/\s*data-en-html="[^"]*"/g, '')
      .replace(/\s*data-en="[^"]*"/g, '');

    const encoded = encodeAttr(item.translation);
    if (item.containsHtml) {
      attrs += ` data-en-html="${encoded}"`;
    } else {
      attrs += ` data-en="${encoded}"`;
    }
    attrs += ` data-zh-hash="${item.currentHash}"`;

    const newOpenTag = `<${item.tagName}${attrs}>`;
    content = content.slice(0, item.tagStart) + newOpenTag + content.slice(item.tagEnd);
  }

  return content;
}

async function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const candidates = findCandidates(content);

  if (candidates.length === 0) {
    console.log(`  ✓ no changes needed: ${filePath}`);
    return;
  }

  console.log(`  ⟳ translating ${candidates.length} item(s) in ${path.basename(filePath)} …`);

  const items = candidates.map(c => ({
    text: c.containsHtml ? c.innerHtml : c.innerText,
  }));

  const translations = await batchTranslate(items);

  if (translations.length !== candidates.length) {
    throw new Error(
      `Translation count mismatch: expected ${candidates.length}, got ${translations.length}`
    );
  }

  content = applyTranslations(content, candidates, translations);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✓ updated: ${filePath}`);
}

/* ── main ── */

async function main() {
  const args = process.argv.slice(2).filter(a => a.endsWith('.html'));
  const files = args.length > 0
    ? args
    : fs.readdirSync('.').filter(f => f.endsWith('.html'));

  console.log(`\nConnectEd Research Institute — Auto-Translator`);
  console.log(`Processing ${files.length} file(s)…\n`);

  for (const file of files) {
    await processFile(file);
  }

  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
