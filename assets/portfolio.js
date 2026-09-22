// Program Portfolio — catalog browser.
// Cards are rendered statically by tools/build-portfolio.js; this script adds the
// filter rail (live counts), search, selected-filter chips, card/list density,
// the mobile filter drawer, and the slide-out program panel.
// State persists in the query string: ?q=&type=a,b&discipline=a,b&offering=past

(function () {
    const app = document.getElementById('pf-app');
    const dataEl = document.getElementById('pf-data');
    if (!app || !dataEl) return;

    const DATA = JSON.parse(dataEl.textContent);
    const PROGRAMS = DATA.programs;
    const byId = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));
    const typeLabel = Object.fromEntries(DATA.types.map(t => [t.key, t.label]));
    const ROOT = '../../';

    const $ = (id) => document.getElementById(id);
    const grid = $('pf-grid');
    const cards = Array.from(grid.querySelectorAll('.pf-card'));
    const cardById = Object.fromEntries(cards.map(c => [c.dataset.id, c]));
    const q = $('pf-q');

    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const searchText = (p) => [p.title, p.card, p.fields, p.methods.join(' '), p.disciplines.join(' '), p.typeLabel].join(' ').toLowerCase();
    PROGRAMS.forEach(p => { p._search = searchText(p); p._title = p.title; });

    // ---------- state ----------
    const state = { q: '', type: new Set(), discipline: new Set(), offering: '' };
    const params = new URLSearchParams(location.search);
    state.q = params.get('q') || '';
    (params.get('type') || '').split(',').filter(k => typeLabel[k]).forEach(k => state.type.add(k));
    const allDisciplines = [...new Set(PROGRAMS.flatMap(p => p.disciplines))].sort();
    (params.get('discipline') || '').split(',').filter(d => allDisciplines.includes(d)).forEach(d => state.discipline.add(d));
    const anyPast = PROGRAMS.some(p => p.past.length);
    if (anyPast && params.get('offering') === 'past') state.offering = 'past';
    q.value = state.q;

    function matches(p, skip) {
        const terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.every(t => p._search.includes(t))) return false;
        if (skip !== 'type' && state.type.size && !state.type.has(p.type)) return false;
        if (skip !== 'discipline' && state.discipline.size && !p.disciplines.some(d => state.discipline.has(d))) return false;
        if (skip !== 'offering' && state.offering === 'past' && !p.past.length) return false;
        return true;
    }

    // ---------- facets ----------
    const facetsEl = $('pf-facets');
    const DISCIPLINE_PREVIEW = 8;
    let showAllDisciplines = false;

    function option(group, value, label, count, checked, dotType) {
        const id = `pf-${group}-${value.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
        return `<label class="pf-opt${count === 0 && !checked ? ' is-zero' : ''}" for="${id}"${dotType ? ` data-type="${dotType}"` : ''}>
            <input type="checkbox" id="${id}" data-group="${group}" value="${esc(value)}"${checked ? ' checked' : ''}>
            <span class="pf-box" aria-hidden="true"></span>
            ${dotType ? '<span class="pf-opt__dot" aria-hidden="true"></span>' : ''}
            <span class="pf-opt__label">${esc(label)}</span>
            <span class="pf-opt__count">${count}</span>
        </label>`;
    }

    function renderFacets() {
        const typeCounts = {}, discCounts = {};
        PROGRAMS.forEach(p => {
            if (matches(p, 'type')) typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
            if (matches(p, 'discipline')) p.disciplines.forEach(d => { discCounts[d] = (discCounts[d] || 0) + 1; });
        });
        const discList = showAllDisciplines ? allDisciplines : allDisciplines.slice(0, DISCIPLINE_PREVIEW);
        // Keep checked disciplines visible even when the list is collapsed.
        state.discipline.forEach(d => { if (!discList.includes(d)) discList.push(d); });

        let html = `<div class="pf-facet"><div class="pf-facet__title">Program type</div><div class="pf-facet__list">
            ${DATA.types.map(t => option('type', t.key, t.label, typeCounts[t.key] || 0, state.type.has(t.key), t.key)).join('')}
        </div></div>`;
        html += `<div class="pf-facet"><div class="pf-facet__title">Discipline</div><div class="pf-facet__list">
            ${discList.map(d => option('discipline', d, d, discCounts[d] || 0, state.discipline.has(d))).join('')}
        </div>${allDisciplines.length > DISCIPLINE_PREVIEW ? `<button type="button" class="pf-facet__more" id="pf-more">${showAllDisciplines ? 'Show fewer' : `Show all ${allDisciplines.length} disciplines`}</button>` : ''}</div>`;
        if (anyPast) {
            const pastCount = PROGRAMS.filter(p => matches(p, 'offering') && p.past.length).length;
            html += `<div class="pf-facet"><div class="pf-facet__title">Offering</div><div class="pf-facet__list">
                ${option('offering', 'past', 'Confirmed past offerings', pastCount, state.offering === 'past')}
            </div></div>`;
        }
        facetsEl.innerHTML = html;
        const more = $('pf-more');
        if (more) more.addEventListener('click', () => { showAllDisciplines = !showAllDisciplines; renderFacets(); });
    }

    facetsEl.addEventListener('change', (e) => {
        const input = e.target.closest('input[data-group]');
        if (!input) return;
        const g = input.dataset.group;
        if (g === 'offering') state.offering = input.checked ? 'past' : '';
        else input.checked ? state[g].add(input.value) : state[g].delete(input.value);
        update();
    });

    // ---------- chips ----------
    const chipsEl = $('pf-chips');
    function renderChips() {
        const chips = [];
        state.type.forEach(k => chips.push({ g: 'type', v: k, label: typeLabel[k], type: k }));
        state.discipline.forEach(d => chips.push({ g: 'discipline', v: d, label: d }));
        if (state.offering) chips.push({ g: 'offering', v: 'past', label: 'Confirmed past offerings' });
        if (state.q.trim()) chips.push({ g: 'q', v: '', label: `“${state.q.trim()}”` });
        chipsEl.innerHTML = chips.map(c => `<span class="pf-chip"${c.type ? ` data-type="${c.type}"` : ''}>${esc(c.label)}<button type="button" data-g="${c.g}" data-v="${esc(c.v)}" aria-label="Remove filter: ${esc(c.label)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" width="10" height="10" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>`).join('');
        const active = state.type.size + state.discipline.size + (state.offering ? 1 : 0);
        $('pf-clear-all').hidden = !(active || state.q.trim());
        const badge = $('pf-filter-badge');
        badge.hidden = !active;
        badge.textContent = active;
    }
    chipsEl.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-g]');
        if (!b) return;
        const { g, v } = b.dataset;
        if (g === 'q') { state.q = ''; q.value = ''; }
        else if (g === 'offering') state.offering = '';
        else state[g].delete(v);
        update();
    });

    function clearAll() {
        state.q = ''; q.value = ''; state.type.clear(); state.discipline.clear(); state.offering = '';
        update();
    }
    $('pf-clear-all').addEventListener('click', clearAll);
    $('pf-empty-reset').addEventListener('click', clearAll);

    // ---------- results ----------
    let visible = PROGRAMS.slice();
    function highlight(text) {
        const terms = state.q.trim().split(/\s+/).filter(t => t.length > 1).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const safe = esc(text);
        if (!terms.length) return safe;
        return safe.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark>$1</mark>');
    }

    function renderResults() {
        visible = PROGRAMS.filter(p => matches(p));
        const show = new Set(visible.map(p => p.id));
        PROGRAMS.forEach(p => {
            const card = cardById[p.id];
            card.hidden = !show.has(p.id);
            card.querySelector('.pf-card__title a').innerHTML = highlight(p._title);
        });
        const n = visible.length;
        $('pf-count').innerHTML = `<b>${n}</b> ${n === 1 ? 'program example' : 'program examples'}`;
        $('pf-empty').hidden = n !== 0;
        grid.hidden = n === 0;
    }

    function syncUrl() {
        const next = new URLSearchParams();
        if (state.q.trim()) next.set('q', state.q.trim());
        if (state.type.size) next.set('type', [...state.type].join(','));
        if (state.discipline.size) next.set('discipline', [...state.discipline].join(','));
        if (state.offering) next.set('offering', state.offering);
        const qs = next.toString();
        history.replaceState(history.state, '', qs ? `?${qs}${location.hash}` : location.pathname + location.hash);
    }

    function update() {
        renderFacets();
        renderChips();
        renderResults();
        syncUrl();
    }

    // ---------- search ----------
    const qClear = $('pf-q-clear');
    q.addEventListener('input', () => { state.q = q.value; qClear.hidden = !q.value; update(); });
    qClear.addEventListener('click', () => { q.value = ''; state.q = ''; qClear.hidden = true; update(); q.focus(); });
    qClear.hidden = !q.value;
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !/input|textarea|select/i.test(document.activeElement.tagName) && panel.hidden) {
            e.preventDefault();
            q.focus();
        }
    });

    // ---------- density ----------
    const densityBtns = app.querySelectorAll('.pf-density button');
    function setDensity(mode) {
        grid.classList.toggle('compact', mode === 'compact');
        densityBtns.forEach(b => {
            const on = b.dataset.density === mode;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        try { localStorage.setItem('pf-density', mode); } catch (e) { /* storage unavailable */ }
    }
    densityBtns.forEach(b => b.addEventListener('click', () => setDensity(b.dataset.density)));
    let savedDensity = 'cozy';
    try { savedDensity = localStorage.getItem('pf-density') || 'cozy'; } catch (e) { /* storage unavailable */ }
    setDensity(savedDensity);

    // ---------- scroll lock (panel + mobile drawer) ----------
    function lockScroll(on) {
        const sbw = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.setProperty('--pf-sbw', `${on ? sbw : 0}px`);
        document.body.classList.toggle('pf-locked', on);
    }

    // ---------- mobile filter drawer ----------
    const rail = $('pf-rail'), railScrim = $('pf-rail-scrim'), filterBtn = $('pf-filter-btn');
    function openFilters(on) {
        document.body.classList.toggle('pf-filters-open', on);
        railScrim.hidden = !on;
        requestAnimationFrame(() => railScrim.classList.toggle('open', on));
        filterBtn.setAttribute('aria-expanded', String(on));
        lockScroll(on);
        if (on) rail.querySelector('input, button')?.focus();
        else filterBtn.focus();
    }
    filterBtn.addEventListener('click', () => openFilters(true));
    railScrim.addEventListener('click', () => openFilters(false));
    $('pf-rail-done').addEventListener('click', () => openFilters(false));

    // ---------- slide-out panel ----------
    const panel = $('pf-panel'), panelScrim = $('pf-panel-scrim'), panelBody = $('pf-panel-body');
    let currentId = null, lastTrigger = null;

    function panelHtml(p) {
        const pad = (n) => String(n).padStart(2, '0');
        const past = p.past.length
            ? `<span class="pf-card__status pf-card__status--past">${esc(p.past[0].label || 'Past offering')} | ${esc(p.past[0].year)}</span>`
            : '<span class="pf-card__status">Representative program</span>';
        return `
            <div class="pf-panel__meta"><span class="pf-card__type">${esc(p.typeShort)}</span>${past}</div>
            <h2 class="pf-panel__title" id="pf-panel-title">${highlight(p.title)}</h2>
            <p class="pf-panel__lede">${esc(p.card)}</p>

            <h3 class="pf-panel__label">Overview</h3>
            <p class="pf-panel__text">${esc(p.overview)}</p>

            <dl class="pf-panel__facts">
                <dt>Fields</dt><dd>${esc(p.fields)}</dd>
                <dt>Methods</dt><dd>${esc(p.methods.join('; '))}</dd>
                <dt>Preparation</dt><dd>${esc(p.preparation)}</dd>
                <dt>Format</dt><dd>${esc(p.format)}</dd>
                <dt>Timing</dt><dd>${esc(p.timing)}</dd>
            </dl>

            <h3 class="pf-panel__label">Learning goals and possible work</h3>
            <ul class="pf-panel__list">${p.outcomes.map(o => `<li>${esc(o)}</li>`).join('')}</ul>

            <h3 class="pf-panel__label">${esc(p.outlineLabel)}</h3>
            <p class="pf-panel__notice">${esc(DATA.outlineNotice)}</p>
            <ol class="pf-panel__outline">${p.sessions.map((s, i) => `<li><span>${pad(i + 1)}</span>${esc(s)}</li>`).join('')}</ol>
            ${p.past.length ? `<h3 class="pf-panel__label">Offering history</h3><ul class="pf-panel__list">${p.past.map(o => `<li>${esc(o.label || 'Past offering')} | ${esc(o.year)}${o.organizer ? ` — ${esc(o.organizer)}` : ''}</li>`).join('')}</ul>` : ''}

            <p class="pf-panel__permalink"><a href="${p.slug}.html">Open the full program page &rarr;</a></p>`;
    }

    function showProgram(id) {
        const p = byId[id];
        if (!p) return;
        currentId = id;
        panel.dataset.type = p.type;
        $('pf-panel-crumb').innerHTML = `<span class="pf-panel__dot" aria-hidden="true"></span><span>${esc(p.typeLabel)}</span>`;
        panelBody.innerHTML = panelHtml(p);
        panelBody.scrollTop = 0;
        $('pf-cta').href = `${ROOT}contact.html?interest=programs&program=${encodeURIComponent(p.id)}`;
        const i = visible.findIndex(v => v.id === id);
        $('pf-prev').disabled = i <= 0;
        $('pf-next').disabled = i < 0 || i >= visible.length - 1;
        $('pf-pos').textContent = i >= 0 ? `${i + 1} / ${visible.length}` : '';
    }

    function openPanel(id, trigger) {
        lastTrigger = trigger || null;
        showProgram(id);
        panel.hidden = false;
        panelScrim.hidden = false;
        lockScroll(true);
        requestAnimationFrame(() => { panel.classList.add('open'); panelScrim.classList.add('open'); });
        $('pf-panel-close').focus();
    }

    function closePanel() {
        panel.classList.remove('open');
        panelScrim.classList.remove('open');
        lockScroll(false);
        const done = () => { panel.hidden = true; panelScrim.hidden = true; };
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
        else setTimeout(done, 320);
        if (lastTrigger) lastTrigger.focus();
        currentId = null;
    }

    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.pf-card');
        if (!card) return;
        // Let modified clicks open the full page (new tab, etc.).
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        openPanel(card.dataset.id, card.querySelector('.pf-card__title a'));
    });

    $('pf-panel-close').addEventListener('click', closePanel);
    panelScrim.addEventListener('click', closePanel);
    $('pf-prev').addEventListener('click', () => {
        const i = visible.findIndex(v => v.id === currentId);
        if (i > 0) showProgram(visible[i - 1].id);
    });
    $('pf-next').addEventListener('click', () => {
        const i = visible.findIndex(v => v.id === currentId);
        if (i >= 0 && i < visible.length - 1) showProgram(visible[i + 1].id);
    });

    document.addEventListener('keydown', (e) => {
        if (!panel.hidden) {
            if (e.key === 'Escape') closePanel();
            else if (e.key === 'ArrowRight' && !$('pf-next').disabled && !/input|textarea/i.test(document.activeElement.tagName)) $('pf-next').click();
            else if (e.key === 'ArrowLeft' && !$('pf-prev').disabled && !/input|textarea/i.test(document.activeElement.tagName)) $('pf-prev').click();
            else if (e.key === 'Tab') {
                // Keep focus inside the dialog.
                const f = panel.querySelectorAll('a[href], button:not([disabled])');
                const first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        } else if (e.key === 'Escape' && document.body.classList.contains('pf-filters-open')) {
            openFilters(false);
        }
    });

    update();
})();
