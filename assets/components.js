// ConnectEd Research Institute — shared layout components
// Injects nav + footer, wires hamburger, handles modals, scroll reveals, and subtle nav elevation.
// Nav/footer copy is maintained bilingually here (single source of truth), so translate.js can
// focus on page content. Language switching is wired via assets/lang.js.

(function () {
    // Nav links: data-driven so we don't duplicate HTML and can render either language.
    const navItems = [
        { href: 'index.html',     zh: '首页',       en: 'Home',         key: 'home' },
        { href: 'about.html',     zh: '关于',       en: 'About',        key: 'about' },
        {
            type: 'dropdown', key: 'programs',
            zh: '项目', en: 'Programs',
            children: [
                { href: 'fellowships.html',       zh: '研究 Fellowship', en: 'Research Fellowships' },
                { href: 'fellowship-tracks.html', zh: 'Fellowship 方向', en: 'Fellowship Tracks' },
                { href: 'mentorship.html',        zh: '导师指导项目',     en: 'Mentorship Programs' },
                { href: 'training.html',          zh: '研究培训与课程',   en: 'Research Training & Courses' },
                { href: 'networks.html',          zh: '学术交流与网络',   en: 'Scholarly Exchange & Networks' }
            ]
        },
        { href: 'get-involved.html', zh: '参与我们', en: 'Get Involved', key: 'get-involved' },
        { href: 'support.html',      zh: '支持我们', en: 'Support',      key: 'support' },
        { href: 'contact.html',      zh: '联系我们', en: 'Contact',      key: 'contact' }
    ];

    const footerCopy = {
        brand:   { zh: 'ConnectEd Research Institute', en: 'ConnectEd Research Institute' },
        privacy: { zh: '隐私政策', en: 'Privacy Policy' },
        terms:   { zh: '使用条款', en: 'Terms of Use' },
        rights:  { zh: '保留所有权利。', en: 'All rights reserved.' }
    };

    function renderNav() {
        const itemsHtml = navItems.map(item => {
            if (item.type === 'dropdown') {
                const childLinks = item.children.map(c =>
                    `<a href="${c.href}" data-i18n data-en="${escapeAttr(c.en)}">${c.zh}</a>`
                ).join('');
                return `
                <li class="dropdown">
                    <a href="#" role="button" aria-haspopup="true" aria-expanded="false"
                       data-nav="${item.key}" data-nav-trigger>
                       <span data-i18n data-en="${escapeAttr(item.en)}">${item.zh}</span>
                       <i class="fas fa-caret-down" aria-hidden="true"></i>
                    </a>
                    <div class="dropdown-content">${childLinks}</div>
                </li>`;
            }
            return `<li><a href="${item.href}" data-nav="${item.key}" data-i18n data-en="${escapeAttr(item.en)}">${item.zh}</a></li>`;
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
                <li class="lang-toggle-wrap">
                    <button class="lang-toggle" onclick="toggleLang()" aria-label="Switch to English">
                        <span class="lang-opt" data-lang="zh">中</span>
                        <span class="lang-sep">|</span>
                        <span class="lang-opt" data-lang="en">EN</span>
                    </button>
                </li>
            </ul>
        </nav>`;
    }

    function renderFooter() {
        return `
        <footer>
            <div class="footer-container">
                <a href="index.html" class="logo" data-i18n data-en="${escapeAttr(footerCopy.brand.en)}">${footerCopy.brand.zh}</a>
                <div class="footer-links">
                    <a href="privacy.html" data-i18n data-en="${escapeAttr(footerCopy.privacy.en)}">${footerCopy.privacy.zh}</a>
                    <a href="terms.html" data-i18n data-en="${escapeAttr(footerCopy.terms.en)}">${footerCopy.terms.zh}</a>
                </div>
            </div>
            <div class="copyright">
                &copy; 2026 ConnectEd Research Institute. <span data-i18n data-en="${escapeAttr(footerCopy.rights.en)}">${footerCopy.rights.zh}</span>
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

    // Auto-apply .reveal to common content blocks so existing HTML gets animations for free.
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
            el.classList.add('reveal');
        });

        document.querySelectorAll('.initiatives-grid, .fellowship-cards, .opportunity-grid, .stats-grid, .figure-row, .partners-logos').forEach(grid => {
            grid.classList.add('reveal-group');
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

        // Re-apply language to newly injected nav/footer.
        if (typeof window.applyLang === 'function' && typeof window.getLang === 'function') {
            window.applyLang(window.getLang());
        }
    });
})();
