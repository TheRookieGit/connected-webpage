// ConnectEd Research Institute — shared layout components
// Injects nav + footer, wires hamburger and dropdowns, scroll reveals, and subtle nav elevation.
// Pages live at different folder depths, so every link is resolved against the site root,
// which is derived from this script's own URL (works over http and file://).

(function () {
    const script = document.currentScript;
    const ROOT = script ? script.src.replace(/assets\/components\.js(\?.*)?$/, '') : '';
    const url = (path) => ROOT + path;

    const navItems = [
        { href: 'about.html', label: 'About', key: 'about' },
        {
            type: 'dropdown', label: 'Programs', key: 'programs',
            children: [
                { href: 'programs/index.html',                label: 'Programs Overview' },
                { href: 'programs/research-foundations.html', label: 'Research Foundations' },
                { href: 'programs/research-methods.html',     label: 'Research Methods & Data Analysis' },
                { href: 'programs/mentored-research.html',    label: 'Mentored Research Projects' },
                { href: 'programs/fellowships.html',          label: 'Research Fellowships' },
                { href: 'programs/school-programs.html',      label: 'School & Institutional Programs' },
                { href: 'programs/portfolio/index.html',      label: 'Program Portfolio' }
            ]
        },
        {
            type: 'dropdown', label: 'Community', key: 'community',
            children: [
                { href: 'community/index.html',             label: 'Community & Academic Pathways' },
                { href: 'community/phd-incubator-2025.html', label: '2025 PhD Incubator' },
                { href: 'community/professional-development-panels-2022.html', label: '2022 Professional Development Panels' },
                { href: 'community/faculty-outreach-writing-workshop-2022.html', label: '2022 Writing to Prospective Advisors' },
                { href: 'community/phd-roundtables-2022.html', label: '2022 PhD Roundtables' }
            ]
        },
        { href: 'partnerships/index.html', label: 'Partnerships', key: 'partnerships' },
        { href: 'contact.html', label: 'Contact', key: 'contact' },
        { href: 'support.html', label: 'Support Our Work', key: 'support', mobileOnly: true }
    ];

    function renderNav() {
        const itemsHtml = navItems.map((item, i) => {
            if (item.type === 'dropdown') {
                const id = `nav-menu-${i}`;
                const childLinks = item.children.map(c =>
                    `<a href="${url(c.href)}">${escapeHtml(c.label)}</a>`
                ).join('');
                return `
                <li class="dropdown">
                    <button type="button" class="nav-trigger" aria-haspopup="true" aria-expanded="false"
                       aria-controls="${id}" data-nav="${item.key}" data-nav-trigger>
                       <span>${escapeHtml(item.label)}</span>
                       <i class="fas fa-caret-down" aria-hidden="true"></i>
                    </button>
                    <div class="dropdown-content" id="${id}">${childLinks}</div>
                </li>`;
            }
            const cls = item.mobileOnly ? ' class="nav-mobile-only"' : '';
            return `<li${cls}><a href="${url(item.href)}" data-nav="${item.key}">${escapeHtml(item.label)}</a></li>`;
        }).join('');

        return `
        <nav aria-label="Primary">
            <a href="${url('index.html')}" class="logo">
                <img src="${url('assets/logo.png')}" alt="ConnectEd Research Institute home">
            </a>
            <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
                <i class="fas fa-bars" aria-hidden="true"></i>
            </button>
            <ul class="nav-links">
                ${itemsHtml}
            </ul>
            <a href="${url('support.html')}" class="btn btn--gold nav-apply" data-nav="support">Support Our Work</a>
        </nav>`;
    }

    function renderFooter() {
        const year = new Date().getFullYear();
        const link = (href, label) => `<a href="${url(href)}">${label}</a>`;
        return `
        <footer>
            <div class="footer-container footer-container--columns">
                <div class="footer-brand">
                    <a href="${url('index.html')}" class="logo footer-logo">
                        <img src="${url('assets/logo.png')}" alt="ConnectEd Research Institute home">
                    </a>
                    <p class="footer-tagline">ConnectEd Research Institute</p>
                    <p class="footer-sub">Research education, mentorship, and academic opportunity.</p>
                </div>
                <div class="footer-col">
                    <h2 class="footer-col__title">Explore</h2>
                    ${link('about.html', 'About')}
                    ${link('programs/index.html', 'Programs')}
                    ${link('programs/portfolio/index.html', 'Program Portfolio')}
                    ${link('community/index.html', 'Community')}
                    ${link('partnerships/index.html', 'Partnerships')}
                </div>
                <div class="footer-col">
                    <h2 class="footer-col__title">Resources</h2>
                    ${link('academic-standards.html', 'Academic Standards')}
                    ${link('student-work.html', 'Student Work')}
                    ${link('for-mentors.html', 'For Educators &amp; Mentors')}
                </div>
                <div class="footer-col">
                    <h2 class="footer-col__title">Connect</h2>
                    ${link('contact.html', 'Contact')}
                    ${link('support.html', 'Support Our Work')}
                    ${link('privacy.html', 'Privacy')}
                    ${link('accessibility.html', 'Accessibility')}
                </div>
            </div>
            <p class="footer-note">ConnectEd is an independent organization. Participation by an individual academic does not imply endorsement or sponsorship by that individual&rsquo;s university.</p>
            <div class="copyright">
                &copy; ${year} ConnectEd Research Institute.
            </div>
        </footer>`;
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function mount(selector, html) {
        const el = document.querySelector(selector);
        if (el) el.outerHTML = html;
    }

    function wireHamburger() {
        const toggle = document.querySelector('.nav-toggle');
        const links = document.querySelector('.nav-links');
        if (!toggle || !links) return;

        toggle.addEventListener('click', () => {
            const isOpen = links.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
        });

        const triggers = document.querySelectorAll('.nav-links .dropdown > [data-nav-trigger]');
        const closeAll = (except) => {
            triggers.forEach(t => {
                if (t === except) return;
                t.parentElement.classList.remove('open');
                t.setAttribute('aria-expanded', 'false');
            });
        };

        triggers.forEach(trigger => {
            const parent = trigger.parentElement;
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                closeAll(trigger);
                const isOpen = parent.classList.toggle('open');
                trigger.setAttribute('aria-expanded', String(isOpen));
            });
        });

        document.addEventListener('click', (e) => {
            triggers.forEach(t => {
                if (!t.parentElement.contains(e.target)) {
                    t.parentElement.classList.remove('open');
                    t.setAttribute('aria-expanded', 'false');
                }
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            triggers.forEach(t => {
                if (t.parentElement.classList.contains('open')) {
                    t.parentElement.classList.remove('open');
                    t.setAttribute('aria-expanded', 'false');
                    t.focus();
                }
            });
        });
    }

    function normalizePath(p) {
        return p.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
    }

    function highlightActive() {
        const page = document.body.dataset.page;
        if (page) {
            document.querySelectorAll(`nav [data-nav="${page}"]`).forEach(el => el.classList.add('is-active'));
        }

        const here = normalizePath(location.pathname);
        document.querySelectorAll('.dropdown-content a').forEach(a => {
            if (normalizePath(new URL(a.href).pathname) === here) {
                a.classList.add('is-active');
                a.setAttribute('aria-current', 'page');
            }
        });
    }

    function wireNavScroll() {
        const nav = document.querySelector('nav');
        if (!nav) return;
        // Expose the nav height so sticky elements (e.g. the portfolio toolbar) sit right below it.
        const setNavH = () => document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
        setNavH();
        window.addEventListener('resize', setNavH, { passive: true });
        const update = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
        update();
        window.addEventListener('scroll', update, { passive: true });
    }

    function wireReveals() {
        const targets = document.querySelectorAll('.reveal, .reveal-group');
        if (!targets.length || !('IntersectionObserver' in window)) {
            targets.forEach(el => el.classList.add('is-visible'));
            return;
        }

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        targets.forEach(el => io.observe(el));
    }

    function autoDecorate() {
        const selectors = [
            'section > .section-header',
            'section > .container > .section-header',
            'section > .content-wrap > .section-header',
            '.mission-text',
            '.sidebar-callout',
            '.integrity-content',
            '.feature-panel',
            '.feature-text',
            '.feature-image',
            '.support-text',
            '.donation-portal',
            '.contact-form-container',
            '.check-list',
            '.pullquote-figure',
            '.pullquote-body',
            '.split-feature__media',
            '.split-feature__body',
            '.impact-band .section-header'
        ];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            if (!el.closest('[data-no-reveal]')) el.classList.add('reveal');
        });

        document.querySelectorAll('.type-grid, .initiatives-grid, .structure-grid, .fellowship-cards, .opportunity-grid, .stats-grid, .figure-row, .partners-logos').forEach(grid => {
            if (!grid.closest('[data-no-reveal]')) grid.classList.add('reveal-group');
        });
    }

    function wirePageEntry() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const header = document.querySelector('header');
        if (!header) return;

        let items = [];
        if (header.classList.contains('hero')) {
            const content = header.querySelector('.hero-content');
            if (content) items = Array.from(content.children);
        } else if (header.classList.contains('page-header')) {
            items = Array.from(header.children);
        }

        if (!items.length) return;

        items.forEach(el => el.classList.add('page-entry'));

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                items.forEach((el, i) => {
                    setTimeout(() => el.classList.add('page-entry--run'), i * 200);
                });
            });
        });
    }

    // Scroll-activated timeline items (.approach-item[data-timeline-item])
    function wireTimeline() {
        const items = document.querySelectorAll('[data-timeline-item]');
        if (!items.length) return;
        if (!('IntersectionObserver' in window)) {
            items.forEach(el => el.classList.add('is-active'));
            return;
        }
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-active'); });
        }, { threshold: 0.35 });
        items.forEach(el => io.observe(el));
    }

    // Modals: [data-modal="id"] opens #id; .modal-close, backdrop click, or Escape closes.
    function wireModals() {
        let lastTrigger = null;
        const close = () => {
            document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
            document.body.style.overflow = '';
            if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
        };
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal]');
            if (trigger) {
                e.preventDefault();
                const modal = document.getElementById(trigger.getAttribute('data-modal'));
                if (modal) {
                    lastTrigger = trigger;
                    modal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                    const first = modal.querySelector('.modal-close, button, input, a');
                    if (first) first.focus();
                }
                return;
            }
            if (e.target.closest('.modal-close') || e.target.classList.contains('modal')) close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.querySelector('.modal.open')) close();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        mount('#site-nav', renderNav());
        mount('#site-footer', renderFooter());
        wireHamburger();
        highlightActive();
        wireNavScroll();
        wirePageEntry();
        autoDecorate();
        wireReveals();
        wireTimeline();
        wireModals();
    });
})();
