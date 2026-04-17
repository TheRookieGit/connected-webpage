#!/usr/bin/env node
/**
 * extract-zh.js — Extract every piece of Chinese copy into zh-content.json for polishing.
 *
 *   node extract-zh.js
 *
 * Covers:
 *   - assets/components.js     nav + footer copy (single source of truth for nav/footer)
 *   - *.html  <title>          page titles
 *   - *.html  [data-i18n]      body copy, keyed by data-zh-hash (stable across edits)
 *   - *.html  <option data-opt-en=...>  select options, keyed by data-opt-en
 *   - *.html  [placeholder][data-ph-en=...]  form placeholders, keyed by data-ph-en
 *
 * After you polish the zh fields in zh-content.json, run:
 *   node apply-zh.js
 * to write the edits back to source — no format drift.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/* ── shared HTML scanner (matches translate.js / stamp-hashes.js) ── */

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
        while (i < html.length && html[i] !== ch) { attrs += html[i]; i++; }
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

function attrValue(attrs, name) {
  const re = new RegExp(`\\b${name}="([^"]*)"`);
  const m = attrs.match(re);
  return m ? m[1] : null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/* ── HTML extraction ── */

function extractHtml(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const out = {};

  // <title>
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
  if (titleMatch && /[\u4e00-\u9fff]/.test(titleMatch[1])) {
    out.title = titleMatch[1];
  }

  const tags = findOpeningTags(content);
  const i18nItems = [];
  const placeholders = [];
  const options = [];

  for (const t of tags) {
    // data-i18n bodies
    if (/\bdata-i18n\b/.test(t.attrs) && !t.selfClosing) {
      const closeIdx = findCloseIdx(content, t.tagName, t.tagEnd);
      if (closeIdx < 0) continue;
      const innerHtml = content.slice(t.tagEnd, closeIdx);
      const trimmed = innerHtml.trim();
      if (!trimmed) continue;
      if (!/[\u4e00-\u9fff]/.test(trimmed)) continue;

      const id = attrValue(t.attrs, 'data-zh-hash');
      const en = decodeEntities(attrValue(t.attrs, 'data-en-html') || attrValue(t.attrs, 'data-en') || '');
      if (!id) {
        console.warn(`  ! ${path.basename(filePath)}: data-i18n element without data-zh-hash — run stamp-hashes.js first.`);
        continue;
      }
      i18nItems.push({ id, en, zh: trimmed });
    }

    // <input>/<textarea> placeholders
    const phEn = attrValue(t.attrs, 'data-ph-en');
    if (phEn !== null) {
      const phZh = attrValue(t.attrs, 'placeholder');
      if (phZh && /[\u4e00-\u9fff]/.test(phZh)) {
        placeholders.push({ id: phEn, zh: phZh });
      }
    }

    // <option> text
    if (t.tagName === 'option') {
      const optEn = attrValue(t.attrs, 'data-opt-en');
      if (optEn !== null) {
        const closeIdx = findCloseIdx(content, 'option', t.tagEnd);
        if (closeIdx < 0) continue;
        const inner = content.slice(t.tagEnd, closeIdx).trim();
        if (/[\u4e00-\u9fff]/.test(inner)) {
          options.push({ id: optEn, zh: inner });
        }
      }
    }
  }

  if (i18nItems.length)  out.i18n = i18nItems;
  if (placeholders.length) out.placeholders = placeholders;
  if (options.length)     out.options = options;
  return out;
}

/* ── components.js extraction ── */

function extractComponents(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const out = { nav: [], footer: [] };

  // Top-level nav entries:  { href: 'X.html', ... zh: '中文', en: 'English', key: 'Y' }
  const topRe = /\{\s*href:\s*'([^']+)'[^}]*?zh:\s*'([^']+)'[^}]*?en:\s*'([^']+)'[^}]*?key:\s*'([^']+)'[^}]*?\}/g;
  let m;
  while ((m = topRe.exec(content)) !== null) {
    out.nav.push({ id: `nav.${m[4]}`, en: m[3], zh: m[2] });
  }

  // Dropdown parent:  { type: 'dropdown', key: 'Y', zh: '中文', en: 'English', children: [
  const dropRe = /type:\s*'dropdown'[^}]*?key:\s*'([^']+)'[^}]*?zh:\s*'([^']+)'[^}]*?en:\s*'([^']+)'/g;
  while ((m = dropRe.exec(content)) !== null) {
    out.nav.push({ id: `nav.${m[1]}`, en: m[3], zh: m[2] });
  }

  // Dropdown child leaves:  { href: 'X.html', zh: '中文', en: 'English' }   (no `key:` on line)
  const childRe = /\{\s*href:\s*'([^']+\.html)',\s*zh:\s*'([^']+)',\s*en:\s*'([^']+)'\s*\}/g;
  while ((m = childRe.exec(content)) !== null) {
    const href = m[1];
    // Skip if this href was already captured as a top-level item (has `key:`).
    if (out.nav.some(n => n.id === `nav.${href.replace('.html', '')}` && n.zh === m[2])) continue;
    const slug = href.replace(/\.html$/, '');
    if (out.nav.find(x => x.id === `nav.programs.${slug}`)) continue;
    out.nav.push({ id: `nav.programs.${slug}`, en: m[3], zh: m[2] });
  }

  // Footer: <name>: { zh: '中文', en: 'English' }
  const footRe = /(\w+):\s*\{\s*zh:\s*'([^']+)',\s*en:\s*'([^']+)'\s*\}/g;
  while ((m = footRe.exec(content)) !== null) {
    // Skip the brand entry (Chinese === English, no need to polish) and skip nav-shaped items
    if (m[2] === m[3]) continue;
    out.footer.push({ id: `footer.${m[1]}`, en: m[3], zh: m[2] });
  }

  // Dedupe nav by id (top-level and dropdown-parent can share the same key path)
  const seen = new Set();
  out.nav = out.nav.filter(n => (seen.has(n.id) ? false : (seen.add(n.id), true)));

  return out;
}

/* ── main ── */

function main() {
  const root = __dirname;
  const result = {
    __instructions__: [
      '只编辑每条记录的 "zh" 字段；不要改 "id" 或 "en"。',
      '如果某条没有 "en"（如 title/placeholder/option/footer），也请保留其结构。',
      '编辑完后运行：node apply-zh.js',
      '回写时会精确匹配 id，不会破坏 HTML/JS 格式。'
    ],
    'assets/components.js': extractComponents(path.join(root, 'assets/components.js'))
  };

  const htmlFiles = fs.readdirSync(root)
    .filter(f => f.endsWith('.html'))
    .sort();

  for (const f of htmlFiles) {
    const extracted = extractHtml(path.join(root, f));
    if (Object.keys(extracted).length > 0) {
      result[f] = extracted;
    }
  }

  const outPath = path.join(root, 'zh-content.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');

  let total = 0;
  for (const [file, data] of Object.entries(result)) {
    if (file.startsWith('__')) continue;
    const counts = [];
    if (data.title)        { counts.push('title'); total += 1; }
    if (data.nav)          { counts.push(`${data.nav.length} nav`); total += data.nav.length; }
    if (data.footer)       { counts.push(`${data.footer.length} footer`); total += data.footer.length; }
    if (data.i18n)         { counts.push(`${data.i18n.length} i18n`); total += data.i18n.length; }
    if (data.placeholders) { counts.push(`${data.placeholders.length} ph`); total += data.placeholders.length; }
    if (data.options)      { counts.push(`${data.options.length} opt`); total += data.options.length; }
    console.log(`  ${file.padEnd(30)} ${counts.join(', ')}`);
  }
  console.log(`\n  total: ${total} Chinese strings → zh-content.json\n`);
}

main();
