# ConnectEd Research Institute — Website

Static multi-page site for ConnectEd Research Institute, a nonprofit expanding access to research mentorship and academic opportunity.

## Structure

```
.
├── index.html                    # Home
├── about.html                    # About
├── programs.html                 # Programs overview
├── young-scholars.html           # Young Scholars Fellowship detail
├── fellowship-application.html   # Application form
├── get-involved.html             # Volunteer / mentor / partner interest
├── support.html                  # Donation portal
├── contact.html                  # Contact form
├── privacy.html                  # Privacy policy (placeholder — needs legal review)
├── terms.html                    # Terms of use  (placeholder — needs legal review)
└── assets/
    ├── styles.css                # Shared stylesheet (all pages)
    ├── components.js             # Injects shared nav + footer, wires hamburger menu
    └── favicon.svg               # Favicon
```

## How shared nav/footer works

Each page includes two placeholder divs:

```html
<div id="site-nav"></div>
...
<div id="site-footer"></div>
```

[assets/components.js](assets/components.js) replaces them on `DOMContentLoaded`. To change the navigation or footer, edit that one file. No build step required.

The active page is highlighted by setting `<body data-page="home">` (or `about`, `programs`, etc.); the script matches that against `data-nav` on each link.

## Forms

All forms POST to [Formspree](https://formspree.io). Create a free account, grab your form endpoint, and replace every occurrence of `YOUR_FORM_ID` in:

- [get-involved.html](get-involved.html)
- [support.html](support.html)
- [contact.html](contact.html)
- [fellowship-application.html](fellowship-application.html)

(You can use one endpoint for everything, or a different one per form for routing.)

## Local preview

No build step. Just double-click `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

The site is plain static HTML/CSS/JS — drop the folder onto any static host:

- **Cloudflare Pages** or **Netlify**: connect the repo, set the output dir to `/`, no build command
- **GitHub Pages**: enable Pages on the repo, source = `main` branch, root

> Linux hosts are case-sensitive. All filenames and links must be lowercase — this is already the case here.

## Known TODOs (Phase 3+)

- Wire up real payment processing for donations (Stripe Checkout or Donorbox)
- Replace placeholder privacy / terms with counsel-reviewed copy
- Add sitemap.xml + robots.txt for SEO
- Add analytics (Plausible or Google Analytics)
- Optimize images (WebP, local hosting, lazy loading)
- Accessibility audit (WCAG 2.1 AA)
