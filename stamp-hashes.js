#!/usr/bin/env node
/**
 * stamp-hashes.js — One-time bootstrap: compute data-zh-hash for every data-i18n element.
 *
 *   node stamp-hashes.js
 *
 * Writes data-zh-hash="<hash(currentChineseInnerHtml)>" onto every data-i18n element that
 * doesn't already have one. After this, translate.js will only translate items whose Chinese
 * actually changes — which is exactly what preserves any manual English edits.
 *
 * Parser: a small state machine that respects quoted attribute values, so inline HTML inside
 * data-en-html="…<em>…</em>…" doesn't get misinterpreted as real tags.
 *
 * No API key or network needed. Safe to re-run.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/** Must match translate.js exactly. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Scan HTML for opening tags, correctly skipping over quoted attribute values.
 * Returns [{ tagStart, tagEnd, tagName, attrs, selfClosing }].
 */
function findOpeningTags(html) {
  const out = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== '<') { i++; continue; }

    // Skip over comments, CDATA, declarations
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
    i++; // consume '<'
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
    const tagEnd = i + 1; // past the '>'
    const selfClosing = /\/\s*$/.test(attrs);
    out.push({ tagStart, tagEnd, tagName, attrs, selfClosing });
    i = tagEnd;
  }
  return out;
}

/** Find the index after the matching close tag. Naïve first-match: good enough for our HTML. */
function findCloseIdx(html, tagName, fromIdx) {
  const re = new RegExp(`</${tagName}\\s*>`, 'g');
  re.lastIndex = fromIdx;
  const m = re.exec(html);
  return m ? m.index : -1;
}

function stampFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const tags = findOpeningTags(content);

  const edits = [];
  for (const t of tags) {
    if (!/\bdata-i18n\b/.test(t.attrs)) continue;
    if (/\bdata-zh-hash=/.test(t.attrs)) continue;
    if (t.selfClosing) continue;

    const closeIdx = findCloseIdx(content, t.tagName, t.tagEnd);
    if (closeIdx < 0) continue;

    const innerHtml = content.slice(t.tagEnd, closeIdx).trim();
    if (!innerHtml) continue;

    const h = hash(innerHtml);
    const newAttrs = `${t.attrs} data-zh-hash="${h}"`;
    const newOpenTag = `<${t.tagName}${newAttrs}>`;

    edits.push({ start: t.tagStart, end: t.tagEnd, replacement: newOpenTag });
  }

  if (edits.length === 0) {
    console.log(`  ✓ nothing to stamp: ${path.basename(filePath)}`);
    return 0;
  }

  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    content = content.slice(0, e.start) + e.replacement + content.slice(e.end);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✓ stamped ${edits.length} item(s): ${path.basename(filePath)}`);
  return edits.length;
}

function main() {
  const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
  console.log(`\nstamping hashes across ${files.length} file(s)…\n`);
  let total = 0;
  for (const f of files) total += stampFile(f);
  console.log(`\nDone. ${total} element(s) stamped.\n`);
}

main();
