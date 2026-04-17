#!/usr/bin/env node
// List every data-i18n element whose current Chinese no longer matches its stored data-zh-hash.
// Shows: file, old hash, current zh, current English (data-en / data-en-html), contains-html flag.
'use strict';

const fs = require('fs');
const path = require('path');

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function findOpeningTags(html) {
  const out = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== '<') { i++; continue; }
    if (html.startsWith('<!--', i)) { const e = html.indexOf('-->', i + 4); i = e < 0 ? html.length : e + 3; continue; }
    if (html[i+1] === '!' || html[i+1] === '?') { const e = html.indexOf('>', i); i = e < 0 ? html.length : e + 1; continue; }
    if (html[i+1] === '/') { const e = html.indexOf('>', i); i = e < 0 ? html.length : e + 1; continue; }
    if (!/[a-zA-Z]/.test(html[i+1] || '')) { i++; continue; }
    const tagStart = i; i++;
    let tagName = '';
    while (i < html.length && /[a-zA-Z0-9-]/.test(html[i])) { tagName += html[i]; i++; }
    let attrs = '';
    while (i < html.length && html[i] !== '>') {
      const ch = html[i];
      if (ch === '"' || ch === "'") { attrs += ch; i++; while (i < html.length && html[i] !== ch) { attrs += html[i]; i++; } if (i < html.length) { attrs += html[i]; i++; } }
      else { attrs += ch; i++; }
    }
    if (i >= html.length) break;
    const tagEnd = i + 1;
    out.push({ tagStart, tagEnd, tagName, attrs, selfClosing: /\/\s*$/.test(attrs) });
    i = tagEnd;
  }
  return out;
}

function closeIdx(h, tag, from) { const re = new RegExp(`</${tag}\\s*>`, 'g'); re.lastIndex = from; const m = re.exec(h); return m ? m.index : -1; }
function attrVal(a, n) { const m = a.match(new RegExp(`\\b${n}="([^"]*)"`)); return m ? m[1] : null; }

const root = __dirname;
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
const stale = [];

for (const f of files) {
  const c = fs.readFileSync(path.join(root, f), 'utf-8');
  for (const t of findOpeningTags(c)) {
    if (!/\bdata-i18n\b/.test(t.attrs) || t.selfClosing) continue;
    const ce = closeIdx(c, t.tagName, t.tagEnd);
    if (ce < 0) continue;
    const inner = c.slice(t.tagEnd, ce).trim();
    if (!inner) continue;
    const stored = attrVal(t.attrs, 'data-zh-hash');
    const now = hash(inner);
    if (stored === now) continue;
    stale.push({
      file: f,
      oldHash: stored,
      newHash: now,
      zh: inner,
      enHtml: attrVal(t.attrs, 'data-en-html'),
      en: attrVal(t.attrs, 'data-en'),
      containsHtml: /<[a-zA-Z]/.test(inner),
    });
  }
}

console.log(JSON.stringify(stale, null, 2));
console.error(`\n  ${stale.length} stale item(s)\n`);
