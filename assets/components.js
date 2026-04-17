// ConnectEd Research Institute — shared layout components
// Injects nav + footer, wires hamburger, handles modals, scroll reveals, and subtle nav elevation.

(function () {
    const navItems = [
        { href: 'index.html',        label: 'Home',                    key: 'home' },
        { href: 'about.html',        label: 'About',                   key: 'about' },
        { href: 'fellowships.html',  label: 'Fellowship',              key: 'fellowship' },
        { href: 'faculty.html',      label: 'For Faculty',             key: 'faculty' },
        { href: 'programs.html',     label: 'Programs & Initiatives',  key: 'programs' },
        { href: 'get-involved.html', label: 'Collaborate & Volunteer', key: 'get-involved' },
        { href: 'support.html',      label: 'Support',                 key: 'support' },
        { href: 'contact.html',      label: 'Contact',                 key: 'contact' }
    ];

    function renderNav() {
        const itemsHtml = navItems.map(item => {
            if (item.type === 'dropdown') {
                const childLinks = item.children.map(c =>
                    `<a href="${c.href}">${escapeAttr(c.label)}</a>`
                ).join('');
                return `
                <li class="dropdown">
                    <a href="#" role="button" aria-haspopup="true" aria-expanded="false"
                       data-nav="${item.key}" data-nav-trigger>
                       <span>${escapeAttr(item.label)}</span>
                       <i class="fas fa-caret-down" aria-hidden="true"></i>
                    </a>
                    <div class="dropdown-content">${childLinks}</div>
                </li>`;
            }
            return `<li><a href="${item.href}" data-nav="${item.key}">${escapeAttr(item.label)}</a></li>`;
        }).join('');

        return `
        <nav>
            <a href="index.html" class="logo">
                <i class="fas fa-graduation-cap" aria-hidden="true"></i>
                <span>ConnectEd</span>
            </a>
            <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
                <i class="fas fa-bars" aria-hidden="true"></i>
            </button>
            <ul class="nav-links">
                ${itemsHtml}
            </ul>
            <a href="fellowship-application.html" class="btn btn--gold nav-apply">Apply Now</a>
        </nav>`;
    }

    function renderFooter() {
        return `
        <footer>
            <div class="footer-container">
                <a href="index.html" class="logo">ConnectEd Research Institute</a>
                <div class="footer-links">
                    <a href="privacy.html">Privacy Policy</a>
                    <a href="terms.html">Terms of Use</a>
                </div>
            </div>
            <div class="copyright">
                &copy; 2026 ConnectEd Research Institute. All rights reserved.
            </div>
        </footer>`;
    }

    function escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
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

        const dropdownTrigger = document.querySelector('.nav-links .dropdown > a[data-nav-trigger]');
        if (dropdownTrigger) {
            const parent = dropdownTrigger.parentElement;
            dropdownTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = parent.classList.toggle('open');
                dropdownTrigger.setAttribute('aria-expanded', String(isOpen));
            });

            document.addEventListener('click', (e) => {
                if (!parent.contains(e.target) && parent.classList.contains('open')) {
                    parent.classList.remove('open');
                    dropdownTrigger.setAttribute('aria-expanded', 'false');
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && parent.classList.contains('open')) {
                    parent.classList.remove('open');
                    dropdownTrigger.setAttribute('aria-expanded', 'false');
                    dropdownTrigger.focus();
                }
            });
        }
    }

    function highlightActive() {
        const page = document.body.dataset.page;
        if (page) {
            const link = document.querySelector(`.nav-links a[data-nav="${page}"]`);
            if (link) link.classList.add('is-active');
        }

        const here = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.dropdown-content a').forEach(a => {
            const href = (a.getAttribute('href') || '').split('/').pop();
            if (href && href === here) a.classList.add('is-active');
        });
    }

    function wireNavScroll() {
        const nav = document.querySelector('nav');
        if (!nav) return;
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
            '.interest-form',
            '.form-container',
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

        document.querySelectorAll('.initiatives-grid, .fellowship-cards, .opportunity-grid, .stats-grid, .figure-row, .partners-logos').forEach(grid => {
            grid.classList.add('reveal-group');
        });
    }

    function wireModals() {
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal]');
            if (trigger) {
                e.preventDefault();
                const modal = document.getElementById(trigger.getAttribute('data-modal'));
                if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
                return;
            }
            if (e.target.closest('.modal-close') || e.target.classList.contains('modal')) {
                document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
                document.body.style.overflow = '';
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const open = document.querySelectorAll('.modal.open');
            if (!open.length) return;
            open.forEach(m => m.classList.remove('open'));
            document.body.style.overflow = '';
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        mount('#site-nav', renderNav());
        mount('#site-footer', renderFooter());
        wireHamburger();
        highlightActive();
        wireNavScroll();
        autoDecorate();
        wireReveals();
        wireModals();
    });
})();
