// ConnectEd Research Institute — shared layout components
// Injects nav + footer, wires hamburger, handles modals, scroll reveals, and subtle nav elevation.

(function () {
    const navHTML = `
    <nav>
        <a href="index.html" class="logo">
            <i class="fas fa-graduation-cap" aria-hidden="true"></i>
            <span>ConnectEd</span>
        </a>
        <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
            <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
        <ul class="nav-links">
            <li><a href="index.html" data-nav="home">Home</a></li>
            <li><a href="about.html" data-nav="about">About</a></li>
            <li class="dropdown">
                <a href="programs.html" data-nav="programs">Programs <i class="fas fa-caret-down" aria-hidden="true"></i></a>
                <div class="dropdown-content">
                    <a href="programs.html#fellowships">Research Fellowships</a>
                    <a href="programs.html#mentorship">Mentorship Programs</a>
                    <a href="programs.html#training">Research Training &amp; Courses</a>
                    <a href="programs.html#networks">Scholarly Exchange &amp; Networks</a>
                </div>
            </li>
            <li><a href="get-involved.html" data-nav="get-involved">Get Involved</a></li>
            <li><a href="support.html" data-nav="support">Support</a></li>
            <li><a href="contact.html" data-nav="contact">Contact</a></li>
        </ul>
    </nav>`;

    const footerHTML = `
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

        const dropdown = document.querySelector('.nav-links .dropdown > a');
        if (dropdown) {
            dropdown.addEventListener('click', (e) => {
                if (window.matchMedia('(max-width: 768px)').matches) {
                    const parent = dropdown.parentElement;
                    if (!parent.classList.contains('open')) {
                        e.preventDefault();
                        parent.classList.add('open');
                    }
                }
            });
        }
    }

    function highlightActive() {
        const page = document.body.dataset.page;
        if (!page) return;
        const link = document.querySelector(`.nav-links a[data-nav="${page}"]`);
        if (link) link.classList.add('is-active');
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
            '.check-list'
        ];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            el.classList.add('reveal');
        });

        // Grids stagger their children.
        document.querySelectorAll('.initiatives-grid, .fellowship-cards, .opportunity-grid').forEach(grid => {
            grid.classList.add('reveal-group');
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        mount('#site-nav', navHTML);
        mount('#site-footer', footerHTML);
        wireHamburger();
        highlightActive();
        wireNavScroll();
        autoDecorate();
        wireReveals();
    });
})();
