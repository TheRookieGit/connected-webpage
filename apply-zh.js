#!/usr/bin/env node
/**
 * apply-zh.js — Apply polished Chinese from zh-content.json back to source files.
 *
 *   node apply-zh.js             apply every change
 *   node apply-zh.js --dry       print changes without writing
 *
 * Safe to re-run. Only edits elements whose "zh" value differs from what's currently
 * in the source. After running, `node translate.js` will retranslate the changed items.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT = __dirname;
const JSON_PATH = path.join(ROOT, 'zh-content.json');

/* ── same HTML scanner as extract-zh.js / translate.js ── */

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

function escapeAttrVal(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/* ── HTML apply ── */

function applyHtml(filePath, spec) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const before = content;
  const edits = []; // { start, end, replacement, label }

  // <title>
  if (spec.title !== undefined) {
    const titleRe = /<title>([\s\S]*?)<\/title>/;
    const m = content.match(titleRe);
    if (m && m[1] !== spec.title) {
      const start = m.index + '<title>'.length;
      const end = m.index + m[0].length - '</title>'.length;
      edits.push({ start, end, replacement: spec.title, label: 'title' });
    }
  }

  const tags = findOpeningTags(content);

  // Build lookups
  const i18nMap = new Map();
  for (const it of (spec.i18n || [])) i18nMap.set(it.id, it.zh);

  const phMap = new Map();
  for (const it of (spec.placeholders || [])) phMap.set(it.id, it.zh);

  const optMap = new Map();
  for (const it of (spec.options || [])) optMap.set(it.id, it.zh);

  for (const t of tags) {
    // data-i18n body
    if (/\bdata-i18n\b/.test(t.attrs) && !t.selfClosing) {
      const id = attrValue(t.attrs, 'data-zh-hash');
      if (!id || !i18nMap.has(id)) continue;
      const newZh = i18nMap.get(id);
      const closeIdx = findCloseIdx(content, t.tagName, t.tagEnd);
      if (closeIdx < 0) continue;
      const innerHtml = content.slice(t.tagEnd, closeIdx);
      const leading = innerHtml.match(/^\s*/)[0];
      const trailing = innerHtml.match(/\s*$/)[0];
      const currentTrimmed = innerHtml.trim();
      if (currentTrimmed === newZh) continue;
      edits.push({
        start: t.tagEnd,
        end: closeIdx,
        replacement: leading + newZh + trailing,
        label: `i18n ${id}`,
      });
    }

    // placeholder attribute
    const phEn = attrValue(t.attrs, 'data-ph-en');
    if (phEn !== null && phMap.has(phEn)) {
      const newZh = phMap.get(phEn);
      const currentPh = attrValue(t.attrs, 'placeholder');
      if (currentPh === newZh) continue;
      // Locate placeholder="..." within the attrs string, map back to file positions.
      const attrsStart = t.tagStart + 1 + t.tagName.length;
      const phIdxInAttrs = t.attrs.search(/\bplaceholder="[^"]*"/);
      if (phIdxInAttrs < 0) continue;
      const mm = t.attrs.match(/\bplaceholder="[^"]*"/);
      const start = attrsStart + phIdxInAttrs;
      const end = start + mm[0].length;
      edits.push({
        start,
        end,
        replacement: `placeholder="${escapeAttrVal(newZh)}"`,
        label: `placeholder ${phEn}`,
      });
    }

    // <option> text
    if (t.tagName === 'option') {
      const optEn = attrValue(t.attrs, 'data-opt-en');
      if (optEn !== null && optMap.has(optEn)) {
        const newZh = optMap.get(optEn);
        const closeIdx = findCloseIdx(content, 'option', t.tagEnd);
        if (closeIdx < 0) continue;
        const inner = content.slice(t.tagEnd, closeIdx);
        if (inner.trim() === newZh) continue;
        const leading = inner.match(/^\s*/)[0];
        const trailing = inner.match(/\s*$/)[0];
        edits.push({
          start: t.tagEnd,
          end: closeIdx,
          replacement: leading + newZh + trailing,
          label: `option ${optEn}`,
        });
      }
    }
  }

  if (edits.length === 0) return { changed: 0, labels: [] };

  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    content = content.slice(0, e.start) + e.replacement + content.slice(e.end);
  }

  if (!DRY) fs.writeFileSync(filePath, content, 'utf-8');
  return { changed: edits.length, labels: edits.map(e => e.label) };
}

/* ── components.js apply ── */

function applyComponents(filePath, spec) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const edits = [];

  // Re-scan the file to find each Chinese literal's current position + value, keyed by id.
  // nav top-level: { href: 'X.html', ... zh: 'C', en: 'E', key: 'Y' }
  const topRe = /(\{\s*href:\s*'[^']+'[^}]*?zh:\s*')([^']+)('[^}]*?en:\s*'[^']+'[^}]*?key:\s*')([^']+)('[^}]*?\})/g;
  let m;
  while ((m = topRe.exec(content)) !== null) {
    const id = `nav.${m[4]}`;
    const currentZh = m[2];
    const fullStart = m.index;
    const zhStart = fullStart + m[1].length;
    const zhEnd = zhStart + m[2].length;
    scheduleReplace(id, currentZh, zhStart, zhEnd);
  }

  // dropdown parent: type: 'dropdown', ... key: 'Y', zh: 'C', en: 'E'
  const dropRe = /(type:\s*'dropdown'[^}]*?key:\s*')([^']+)('[^}]*?zh:\s*')([^']+)('[^}]*?en:\s*'[^']+')/g;
  while ((m = dropRe.exec(content)) !== null) {
    const id = `nav.${m[2]}`;
    const currentZh = m[4];
    const zhStart = m.index + m[1].length + m[2].length + m[3].length;
    const zhEnd = zhStart + m[4].length;
    scheduleReplace(id, currentZh, zhStart, zhEnd);
  }

  // dropdown child leaves: { href: 'X.html', zh: 'C', en: 'E' }
  const childRe = /(\{\s*href:\s*')([^']+\.html)(',\s*zh:\s*')([^']+)(',\s*en:\s*'[^']+'\s*\})/g;
  while ((m = childRe.exec(content)) !== null) {
    const href = m[2];
    const slug = href.replace(/\.html$/, '');
    const topId = `nav.${slug}`;
    // If this line is a top-level entry (captured by topRe), skip — spec has no `nav.programs.<slug>` for it.
    const isTop = (spec.nav || []).some(n => n.id === topId);
    if (isTop) continue;
    const id = `nav.programs.${slug}`;
    const currentZh = m[4];
    const zhStart = m.index + m[1].length + m[2].length + m[3].length;
    const zhEnd = zhStart + m[4].length;
    scheduleReplace(id, currentZh, zhStart, zhEnd);
  }

  // footer: name: { zh: 'C', en: 'E' }
  const footRe = /(\b(\w+):\s*\{\s*zh:\s*')([^']+)(',\s*en:\s*')([^']+)('\s*\})/g;
  while ((m = footRe.exec(content)) !== null) {
    const name = m[2];
    if (m[3] === m[5]) continue;     // skip brand (zh === en)
    const id = `footer.${name}`;
    const currentZh = m[3];
    const zhStart = m.index + m[1].length;
    const zhEnd = zhStart + m[3].length;
    scheduleReplace(id, currentZh, zhStart, zhEnd);
  }

  function scheduleReplace(id, currentZh, zhStart, zhEnd) {
    const entry = [...(spec.nav || []), ...(spec.footer || [])].find(e => e.id === id);
    if (!entry) return;
    if (entry.zh === currentZh) return;
    if (entry.zh.includes("'")) {
      console.warn(`  ! ${id}: new zh contains an apostrophe — will escape as \\'`);
    }
    const escaped = entry.zh.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    edits.push({ start: zhStart, end: zhEnd, replacement: escaped, label: id });
  }

  if (edits.length === 0) return { changed: 0, labels: [] };

  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    content = content.slice(0, e.start) + e.replacement + content.slice(e.end);
  }

  if (!DRY) fs.writeFileSync(filePath, content, 'utf-8');
  return { changed: edits.length, labels: edits.map(e => e.label) };
}

/* ── main ── */

function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`\n缺少 zh-content.json. 先运行: node extract-zh.js\n`);
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  let grandTotal = 0;

  for (const [file, data] of Object.entries(spec)) {
    if (file.startsWith('__')) continue;
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  ! missing: ${file}`);
      continue;
    }

    const result = file.endsWith('.html')
      ? applyHtml(fullPath, data)
      : applyComponents(fullPath, data);

    if (result.changed === 0) {
      console.log(`  · ${file}  (no changes)`);
    } else {
      console.log(`  ${DRY ? '[dry] ' : ''}✓ ${file}  — ${result.changed} updated`);
      for (const label of result.labels) console.log(`      - ${label}`);
    }
    grandTotal += result.changed;
  }

  console.log(`\n  ${DRY ? '[dry-run] ' : ''}${grandTotal} total change(s)${DRY ? ' would be written.' : ' written.'}`);
  if (!DRY && grandTotal > 0) {
    console.log(`\n  Next: run  node translate.js  to refresh English translations.\n`);
  }
}

main();
