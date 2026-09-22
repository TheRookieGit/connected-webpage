// Program Portfolio — client-side search and filtering over the statically rendered cards.
// Filters combine with AND logic and persist in the query string (?q=&type=&discipline=&offering=).

(function () {
    const form = document.getElementById('portfolio-filters');
    const grid = document.getElementById('pf-grid');
    if (!form || !grid) return;

    const cards = Array.from(grid.querySelectorAll('.program-card'));
    const count = document.getElementById('pf-count');
    const empty = document.getElementById('pf-empty');
    const fields = {
        q: form.querySelector('#pf-q'),
        type: form.querySelector('#pf-type'),
        discipline: form.querySelector('#pf-discipline'),
        offering: form.querySelector('#pf-offering')
    };

    function hasOption(select, value) {
        return select && Array.from(select.options).some(o => o.value === value);
    }

    // Restore state from the URL, ignoring values that no longer exist.
    const params = new URLSearchParams(location.search);
    if (fields.q) fields.q.value = params.get('q') || '';
    ['type', 'discipline', 'offering'].forEach(key => {
        const v = params.get(key) || '';
        if (fields[key] && hasOption(fields[key], v)) fields[key].value = v;
    });

    function apply() {
        const q = (fields.q ? fields.q.value : '').trim().toLowerCase();
        const terms = q ? q.split(/\s+/) : [];
        const type = fields.type ? fields.type.value : '';
        const discipline = fields.discipline ? fields.discipline.value : '';
        const offering = fields.offering ? fields.offering.value : '';

        let shown = 0;
        cards.forEach(card => {
            const text = card.dataset.search || '';
            const ok =
                terms.every(t => text.includes(t)) &&
                (!type || card.dataset.type === type) &&
                (!discipline || (card.dataset.disciplines || '').split('|').includes(discipline)) &&
                (offering !== 'past' || card.dataset.past === 'true');
            card.hidden = !ok;
            if (ok) shown++;
        });

        count.textContent = `Showing ${shown} of ${cards.length} program examples`;
        empty.hidden = shown !== 0;

        const next = new URLSearchParams();
        if (q) next.set('q', q);
        if (type) next.set('type', type);
        if (discipline) next.set('discipline', discipline);
        if (offering) next.set('offering', offering);
        const qs = next.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    form.addEventListener('submit', e => { e.preventDefault(); apply(); });
    form.addEventListener('reset', () => setTimeout(apply, 0));

    apply();
})();
