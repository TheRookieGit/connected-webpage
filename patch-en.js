#!/usr/bin/env node
/**
 * patch-en.js — One-shot updater: for every data-i18n element whose stored data-zh-hash
 * no longer matches its Chinese, write the new English into data-en/data-en-html and
 * refresh data-zh-hash. Translations are provided inline in TRANSLATIONS keyed by oldHash.
 */
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
function encodeAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

// Translations keyed by the OLD data-zh-hash currently in the HTML.
// Each entry: { en?: string (plain), enHtml?: string (contains inline HTML) }
const TRANSLATIONS = {
  // about.html
  'ssxf8g': { en: 'Expanding access to research &mdash; institutionally, intentionally, and with care.' },
  '1wvw97': { en: 'ConnectEd Research Institute is a nonprofit dedicated to opening pathways to research mentorship and academic opportunity for talented, dedicated students who have been shut out of existing academic networks.' },
  'gmt8og': { en: 'The Institute develops programs that let students engage deeply with real research environments, build academic skills, and connect with faculty and research communities &mdash; connections whose value extends far beyond any single fellowship.' },
  'mao1m3': { en: 'Institutions and faculty not only can, but should take an active role in supporting emerging scholars.' },

  // fellowship-tracks.html
  '1nm35g': { en: 'Application-based programs that match advanced high school and undergraduate students with research groups, providing meaningful academic exposure.' },
  'jasdsa': { en: 'These application-based programs match advanced high school and undergraduate students with research groups, providing meaningful academic exposure and skill development.' },

  // fellowships.html
  'f0gejx': { en: 'Mentored research placements inside working academic environments &mdash; with the same expectations and rigor as any graduate-level research role.' },
  'lgs4mp': { en: 'The ConnectEd Research Fellowships support selected fellows in engaging deeply with mentored research practice under the guidance of faculty advisors at leading institutions.' },
  't86s50': { en: 'Paired one-on-one with a dedicated faculty advisor throughout the placement.' },

  // get-involved.html
  'hepyn9': { en: 'Join us.' },
  'v91xc8': { en: 'Mentor a fellow, support operations, or partner as an institution. The mission only grows with people who truly commit.' },
  '7crh83': { en: 'Financial contributions help provide fellowships and learning resources to students with limited institutional access.' },

  // index.html
  'iftmo5': { en: 'ConnectEd brings talented students into real academic environments &mdash; with meaningful research experiences and mentorship inside them, not at the edges.' },
  '34czo1': { en: 'ConnectEd works to expand that access: connecting motivated students with the environments, mentors, and pathways they need to pursue graduate study, academic careers, and research-driven fields.' },
  'awzpww': { en: 'Empowering the next generation of scholars through evidence-based mentorship and deep institutional integration &mdash; not shortcuts.' },
  'o1q7jf': { en: 'Convenings and peer networks supporting knowledge exchange across academic communities.' },
  'v0y5an': { en: 'Scholars Matched' },
  'v7el8':  { en: 'ConnectEd was the first place where my questions no longer felt out of place &mdash; and where I met the first mentor who treated them as real research.' },

  // mentorship.html
  'j4mgfr': { en: 'Mentorship placements take into account academic stage, research interest, and advisor availability. Start with a brief note through our contact form and we&rsquo;ll follow up.' },

  // networks.html
  '2rsqrp': { en: 'Convenings and peer networks that support knowledge exchange across academic communities and emerging scholars.' },
  '9owg1i': { en: 'Through convenings and peer networks, supporting knowledge exchange across academic communities and emerging scholars &mdash; the connective tissue that keeps early-career research moving forward.' },
  'ifyqmh': { en: 'Alumni stay connected through a small, working community rather than a credential directory &mdash; with recurring reading groups, writing critiques, and advisor office hours.' },

  // privacy.html
  'ppupna': { en: 'Information is used to administer our programs, respond to inquiries, coordinate fellowships, and send occasional updates if you opt in. We do not sell personal information.' },

  // young-scholars.html
  'rdk70z': { en: 'A structured, mentored environment for advanced high school students and early undergraduates entering real research for the first time.' },
};

const root = __dirname;
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let totalPatched = 0;
const missed = [];

for (const f of files) {
  const filePath = path.join(root, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  const tags = findOpeningTags(content);
  const edits = [];

  for (const t of tags) {
    if (!/\bdata-i18n\b/.test(t.attrs) || t.selfClosing) continue;
    const ce = closeIdx(content, t.tagName, t.tagEnd);
    if (ce < 0) continue;
    const inner = content.slice(t.tagEnd, ce).trim();
    if (!inner) continue;
    const oldHash = attrVal(t.attrs, 'data-zh-hash');
    if (!oldHash) continue;
    const newHash = hash(inner);
    if (oldHash === newHash) continue;

    const tr = TRANSLATIONS[oldHash];
    if (!tr) { missed.push({ file: f, oldHash, zh: inner }); continue; }

    // Rebuild attrs: strip old data-en/data-en-html/data-zh-hash, then append fresh.
    let attrs = t.attrs
      .replace(/\s*data-en-html="[^"]*"/g, '')
      .replace(/\s*data-en="[^"]*"/g, '')
      .replace(/\s*data-zh-hash="[^"]*"/g, '');
    if (tr.enHtml !== undefined) attrs += ` data-en-html="${encodeAttr(tr.enHtml)}"`;
    else                         attrs += ` data-en="${encodeAttr(tr.en)}"`;
    attrs += ` data-zh-hash="${newHash}"`;

    edits.push({ start: t.tagStart, end: t.tagEnd, replacement: `<${t.tagName}${attrs}>`, label: oldHash });
  }

  if (edits.length === 0) continue;
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) content = content.slice(0, e.start) + e.replacement + content.slice(e.end);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✓ ${f}  — ${edits.length} updated  [${edits.map(e => e.label).join(', ')}]`);
  totalPatched += edits.length;
}

console.log(`\n  ${totalPatched} element(s) patched.`);
if (missed.length) {
  console.log(`\n  ! ${missed.length} stale item(s) had no translation entry:`);
  for (const m of missed) console.log(`    - ${m.file}  ${m.oldHash}  ${m.zh.slice(0, 50)}`);
}
