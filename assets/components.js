// ConnectEd Research Institute — shared layout components
// Injects nav + footer, wires hamburger menu, and handles privacy/terms modals.

(function () {
    const navHTML = `
    <nav>
        <a href="index.html" class="logo">
            <i class="fas fa-graduation-cap" aria-hidden="true"></i>&nbsp;ConnectEd
        </a>
        <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
            <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
        <ul class="nav-links">
            <li><a href="index.html" data-nav="home">HOME</a></li>
            <li><a href="about.html" data-nav="about">ABOUT</a></li>
            <li class="dropdown">
                <a href="programs.html" data-nav="programs">PROGRAMS <i class="fas fa-caret-down" aria-hidden="true"></i></a>
                <div class="dropdown-content">
                    <a href="programs.html#fellowships">Research Fellowships</a>
                    <a href="programs.html#mentorship">Mentorship Programs</a>
                    <a href="programs.html#training">Research Training &amp; Courses</a>
                    <a href="programs.html#networks">Scholarly Exchange &amp; Networks</a>
                </div>
            </li>
            <li><a href="get-involved.html" data-nav="get-involved">GET INVOLVED</a></li>
            <li><a href="support.html" data-nav="support">SUPPORT</a></li>
            <li><a href="contact.html" data-nav="contact">CONTACT</a></li>
        </ul>
    </nav>`;

    const footerHTML = `
    <footer>
        <div class="footer-container">
            <a href="index.html" class="logo">ConnectEd Research Institute</a>
            <div class="footer-links">
                <a href="privacy.html">PRIVACY POLICY</a>
                <a href="terms.html">TERMS OF USE</a>
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

        // On mobile, let the user tap the Programs label to open its dropdown
        // without immediately navigating away.
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
        if (link) link.style.color = 'var(--lpi-blue)';
    }

    document.addEventListener('DOMContentLoaded', () => {
        mount('#site-nav', navHTML);
        mount('#site-footer', footerHTML);
        wireHamburger();
        highlightActive();
    });
})();
