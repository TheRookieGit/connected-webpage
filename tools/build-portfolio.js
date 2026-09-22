#!/usr/bin/env node
// Builds the data-driven parts of the site from tools/data/programs.js:
//   programs/portfolio/index.html         — searchable / filterable Program Portfolio
//   programs/portfolio/<slug>.html        — one detail page per published record
//   assets/program-titles.js              — code → title map used to prefill the contact form
//   sitemap.xml                           — published routes only
// It also refreshes the six-card previews between the
// <!-- portfolio-preview:start --> / <!-- portfolio-preview:end --> markers in
// index.html and programs/index.html.
//
// Usage: node tools/build-portfolio.js   (no dependencies)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.connect-edu.org';
const programs = require('./data/programs.js').filter(p => p.published);

const TYPES = {
    foundations: { label: 'Research Foundations', filter: 'Foundations', page: 'programs/research-foundations.html' },
    methods:     { label: 'Research Methods & Data Analysis', filter: 'Methods & Data Analysis', page: 'programs/research-methods.html' },
    mentored:    { label: 'Mentored Research Projects', filter: 'Mentored Research', page: 'programs/mentored-research.html' },
    fellowships: { label: 'Research Fellowships', filter: 'Fellowships', page: 'programs/fellowships.html' },
    school:      { label: 'School & Institutional Programs', filter: 'School Programs', page: 'programs/school-programs.html' }
};

// Homepage / Programs preview — shown in this order when published.
const FEATURED = ['C01', 'C03', 'C02', 'C09', 'C10', 'C16'];

const OUTLINE_NOTICE = 'The sequence below illustrates how this program’s content can be organized. Topics, pacing, and project depth are adapted for each offering. This is not an archived record of a specific cohort’s weekly syllabus.';

const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pad = (n) => String(n).padStart(2, '0');

const byId = Object.fromEntries(programs.map(p => [p.id, p]));

function statusLabel(p) {
    const past = (p.offeringHistory || []).find(o => o.year);
    return past
        ? `<span class="badge badge--past">${esc(past.label || 'Past offering')} | ${esc(past.year)}</span>`
        : '<span class="badge">Representative program</span>';
}

function hasPast(p) {
    return (p.offeringHistory || []).some(o => o.year);
}

function relatedFor(p) {
    if (p.related) return p.related.filter(id => byId[id]).map(id => byId[id]);
    const score = (q) => (q.type === p.type ? 2 : 0) +
        q.disciplines.filter(d => p.disciplines.includes(d)).length;
    return programs
        .filter(q => q.id !== p.id)
        .map(q => ({ q, s: score(q) }))
        .sort((a, b) => b.s - a.s || a.q.id.localeCompare(b.q.id))
        .slice(0, 3)
        .map(x => x.q);
}

function head({ title, description, canonical, root }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${SITE}${canonical}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE}${canonical}">
    <link rel="icon" type="image/png" href="${root}assets/logo.png">
    <link rel="stylesheet" href="${root}assets/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>`;
}

function breadcrumbs(items) {
    const lis = items.map((it, i) => i === items.length - 1
        ? `<li aria-current="page">${esc(it.label)}</li>`
        : `<li><a href="${it.href}">${esc(it.label)}</a></li>`).join('');
    return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${lis}</ol></nav>`;
}

function breadcrumbJsonLd(items) {
    return `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
            '@type': 'ListItem', position: i + 1, name: it.label, item: SITE + it.canonical
        }))
    })}</script>`;
}

function card(p, linkPrefix, headingLevel = 'h3') {
    const tags = p.disciplines.slice(0, 3).map(d => `<li>${esc(d)}</li>`).join('');
    const preview = p.sessions.slice(0, 4).map(s => `<li>${esc(s)}</li>`).join('');
    const search = [p.title, p.card, p.fields, p.methods.join(' '), p.disciplines.join(' '), TYPES[p.type].label]
        .join(' ').toLowerCase();
    return `<li class="program-card" data-type="${p.type}" data-disciplines="${esc(p.disciplines.join('|'))}" data-past="${hasPast(p)}" data-search="${esc(search)}">
                <div class="program-card__meta"><span class="badge badge--type">${esc(TYPES[p.type].label)}</span>${statusLabel(p)}</div>
                <${headingLevel}><a href="${linkPrefix}${p.slug}.html">${esc(p.title)}</a></${headingLevel}>
                <p>${esc(p.card)}</p>
                <ul class="tag-list" aria-label="Fields">${tags}</ul>
                <details>
                    <summary>Preview the first four themes</summary>
                    <ol>${preview}</ol>
                </details>
                <div class="program-card__link"><a class="text-link" href="${linkPrefix}${p.slug}.html">View Program Overview<span class="visually-hidden">: ${esc(p.title)}</span></a></div>
            </li>`;
}

function page({ root, dataPage, body }) {
    return `
<body data-page="${dataPage}">

    <div id="site-nav"></div>
${body}
    <div id="site-footer"></div>

    <script src="${root}assets/components.js"></script>
</body>
</html>
`;
}

function buildDetail(p) {
    const root = '../../';
    const t = TYPES[p.type];
    const crumbs = [
        { label: 'Home', href: `${root}index.html`, canonical: '/' },
        { label: 'Programs', href: `${root}programs/index.html`, canonical: '/programs/' },
        { label: 'Program Portfolio', href: 'index.html', canonical: '/programs/portfolio/' },
        { label: p.title, href: `${p.slug}.html`, canonical: `/programs/portfolio/${p.slug}` }
    ];
    const outcomes = p.outcomes.map(o => `<li>${esc(o)}</li>`).join('');
    const sessions = p.sessions.map((s, i) => `<li><span class="outline-list__num">${pad(i + 1)}</span><span>${esc(s)}</span></li>`).join('\n                        ');
    const history = (p.offeringHistory || []).filter(o => o.year);
    const historyHtml = history.length ? `
                <section class="detail-section" aria-labelledby="history-h">
                    <h2 id="history-h">Offering history</h2>
                    <ul>${history.map(o => `<li>${esc(o.label || 'Past offering')} | ${esc(o.year)}${o.organizer ? ` — ${esc(o.organizer)}` : ''}${o.summary ? `. ${esc(o.summary)}` : ''}</li>`).join('')}</ul>
                </section>` : '';
    const related = relatedFor(p).map(q => card(q, '')).join('\n            ');

    const body = `
    <header class="page-header">
        ${breadcrumbs(crumbs)}
        <div class="program-card__meta"><a class="badge badge--type" href="${root}${t.page}">${esc(t.label)}</a>${statusLabel(p)}</div>
        <h1 style="margin-top: var(--space-md);">${esc(p.title)}</h1>
        <p class="page-header__sub">${esc(p.card)}</p>
    </header>

    <section>
        <div class="container with-aside">
            <div class="prose">
                <h2 style="margin-top:0;">Overview</h2>
                <p>${esc(p.overview)}</p>

                <h2>Learning goals and possible work</h2>
                <p>Proposed learning outcomes for this program example:</p>
                <ul>${outcomes}</ul>
${historyHtml}
            </div>
            <aside class="glance">
                <h2>Program details</h2>
                <dl>
                    <dt>Program type</dt><dd>${esc(t.label)}</dd>
                    <dt>Fields</dt><dd>${esc(p.fields)}</dd>
                    <dt>Methods</dt><dd>${esc(p.methods.join('; '))}</dd>
                    <dt>Preparation</dt><dd>${esc(p.preparation)}</dd>
                    <dt>Format</dt><dd>${esc(p.format)}</dd>
                    <dt>Timing</dt><dd>${esc(p.timing)}</dd>
                </dl>
            </aside>
        </div>
    </section>

    <section class="programs-section">
        <div class="container">
            <div class="outline-block">
                <h2>${esc(p.outlineLabel)}</h2>
                <p class="outline-notice">${OUTLINE_NOTICE}</p>
                <ol class="outline-list">
                        ${sessions}
                </ol>
            </div>
            <div class="action-row">
                <a href="${root}contact.html?interest=programs&amp;program=${p.id}" class="btn btn--gold">Ask About This Program</a>
                <a href="index.html" class="btn btn--line">Back to the Program Portfolio</a>
            </div>
        </div>
    </section>

    <section>
        <div class="container">
            <div class="section-header">
                <h2>Related program examples</h2>
            </div>
            <ul class="portfolio-grid">
            ${related}
            </ul>
        </div>
    </section>
    ${breadcrumbJsonLd(crumbs)}
`;

    return head({
        title: `${p.title} | ConnectEd`,
        description: p.card,
        canonical: `/programs/portfolio/${p.slug}`,
        root
    }) + page({ root, dataPage: 'programs', body });
}

function buildIndex() {
    const root = '../../';
    const crumbs = [
        { label: 'Home', href: `${root}index.html`, canonical: '/' },
        { label: 'Programs', href: `${root}programs/index.html`, canonical: '/programs/' },
        { label: 'Program Portfolio', href: 'index.html', canonical: '/programs/portfolio/' }
    ];
    const usedTypes = Object.keys(TYPES).filter(k => programs.some(p => p.type === k));
    const disciplines = [...new Set(programs.flatMap(p => p.disciplines))].sort();
    const anyPast = programs.some(hasPast);
    const cards = programs.map(p => card(p, '')).join('\n            ');

    const offeringFilter = anyPast ? `
            <div>
                <label for="pf-offering">Offering</label>
                <select id="pf-offering" name="offering">
                    <option value="">All examples</option>
                    <option value="past">Confirmed past offerings</option>
                </select>
            </div>` : '';

    const body = `
    <header class="page-header">
        ${breadcrumbs(crumbs)}
        <span class="eyebrow">Programs</span>
        <h1>Program Portfolio</h1>
        <p class="page-header__sub">Explore representative research courses, methods programs, and mentored projects across disciplines. These examples show the questions, skills, and learning experiences a program can include; they are not an exhaustive catalog or a statement of current enrollment availability.</p>
        <p class="page-header__sub">Where a past offering has been confirmed, its year or term and delivery context appear in the record. Learning sequences labeled illustrative were developed to explain program scope and may differ from the sessions used in a particular offering.</p>
    </header>

    <section class="programs-section">
        <div class="container">
            <form class="portfolio-filters" id="portfolio-filters" role="search" aria-label="Filter program examples">
                <div>
                    <label for="pf-q">Search</label>
                    <input type="search" id="pf-q" name="q" placeholder="Search by topic, method, or keyword" autocomplete="off">
                </div>
                <div>
                    <label for="pf-type">Program type</label>
                    <select id="pf-type" name="type">
                        <option value="">All types</option>
                        ${usedTypes.map(k => `<option value="${k}">${esc(TYPES[k].filter)}</option>`).join('\n                        ')}
                    </select>
                </div>
                <div>
                    <label for="pf-discipline">Discipline</label>
                    <select id="pf-discipline" name="discipline">
                        <option value="">All disciplines</option>
                        ${disciplines.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('\n                        ')}
                    </select>
                </div>${offeringFilter}
                <div>
                    <button type="reset" id="pf-clear">Clear filters</button>
                </div>
            </form>
            <p class="portfolio-count" id="pf-count" role="status" aria-live="polite"></p>
            <ul class="portfolio-grid" id="pf-grid">
            ${cards}
            </ul>
            <div class="empty-state" id="pf-empty" hidden>
                <p>No program examples match these filters. Try a different topic or clear the filters.</p>
            </div>
        </div>
    </section>

    <section>
        <div class="container">
            <p class="lede">Looking for academic guidance beyond a course? Our community initiatives include workshops, faculty-path conversations, and doctoral-preparation mentoring.</p>
            <div class="action-row">
                <a href="${root}community/index.html" class="btn btn--line">Community &amp; Academic Pathways</a>
                <a href="${root}contact.html?interest=programs" class="btn btn--gold">Ask About Program Fit</a>
            </div>
        </div>
    </section>
    ${breadcrumbJsonLd(crumbs)}
    <script src="${root}assets/portfolio.js" defer></script>
`;

    return head({
        title: 'Program Portfolio | ConnectEd',
        description: 'Representative research courses, methods programs, and mentored projects across disciplines, each with learning goals and an illustrative session outline.',
        canonical: '/programs/portfolio/',
        root
    }) + page({ root, dataPage: 'programs', body });
}

function buildPreview(linkPrefix) {
    return FEATURED.filter(id => byId[id]).map(id => card(byId[id], linkPrefix)).join('\n                ');
}

function injectPreview(file, linkPrefix) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) return;
    const src = fs.readFileSync(abs, 'utf8');
    const re = /(<!-- portfolio-preview:start -->)[\s\S]*?(<!-- portfolio-preview:end -->)/;
    if (!re.test(src)) return;
    const out = src.replace(re, `$1\n                ${buildPreview(linkPrefix)}\n                $2`);
    fs.writeFileSync(abs, out);
}

function buildTitles() {
    const map = Object.fromEntries(programs.map(p => [p.id, p.title]));
    return `// Generated by tools/build-portfolio.js — do not edit by hand.\n// Maps a program code from ?program= to its published title for the inquiry form.\nwindow.CONNECTED_PROGRAM_TITLES = ${JSON.stringify(map, null, 2)};\n`;
}

const STATIC_ROUTES = [
    '/', '/about', '/academic-standards', '/student-work', '/support', '/for-mentors', '/contact',
    '/privacy', '/accessibility', '/terms',
    '/programs/', '/programs/research-foundations', '/programs/research-methods',
    '/programs/mentored-research', '/programs/fellowships', '/programs/school-programs',
    '/programs/portfolio/',
    '/community/', '/community/workshops-panels', '/community/phd-incubator-2025',
    '/partnerships/', '/partnerships/woodbridge-academy'
];

function buildSitemap() {
    const urls = [...STATIC_ROUTES, ...programs.map(p => `/programs/portfolio/${p.slug}`)];
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`;
}

// ---- write ----
const outDir = path.join(ROOT, 'programs', 'portfolio');
fs.mkdirSync(outDir, { recursive: true });

// Remove detail pages for records that are no longer published.
const keep = new Set(['index.html', ...programs.map(p => `${p.slug}.html`)]);
for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(outDir, f));
}

fs.writeFileSync(path.join(outDir, 'index.html'), buildIndex());
programs.forEach(p => fs.writeFileSync(path.join(outDir, `${p.slug}.html`), buildDetail(p)));
fs.writeFileSync(path.join(ROOT, 'assets', 'program-titles.js'), buildTitles());
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap());
injectPreview('index.html', 'programs/portfolio/');
injectPreview(path.join('programs', 'index.html'), 'portfolio/');

console.log(`Built ${programs.length} program pages, portfolio index, previews, titles map, and sitemap.`);
