# ConnectEd Research Institute — Website

Static multi-page site for ConnectEd Research Institute, a nonprofit expanding access to research mentorship and academic opportunity.

## Structure

```
.
├── index.html                      # Home
├── about.html                      # About
├── academic-standards.html         # Academic Standards & Learning Quality
├── student-work.html               # Student Research & Scholarly Work
├── for-mentors.html                # For Educators & Mentors (no public directory)
├── support.html                    # Support Our Work (routes to a support inquiry)
├── contact.html                    # Inquiry form (?interest= & ?program= prefill)
├── privacy.html / accessibility.html / terms.html
├── programs/
│   ├── index.html                  # Programs overview + FAQ + portfolio preview
│   ├── research-foundations.html   # five program-type pages
│   ├── research-methods.html
│   ├── mentored-research.html
│   ├── fellowships.html
│   ├── school-programs.html
│   └── portfolio/                  # GENERATED — do not edit by hand
│       ├── index.html              # searchable / filterable Program Portfolio
│       └── <slug>.html             # 24 program detail pages
├── community/                      # index, workshops-panels, phd-incubator-2025
├── partnerships/                   # index, woodbridge-academy
├── tools/
│   ├── data/programs.js            # program catalog (public copy only)
│   └── build-portfolio.js          # generator
├── _redirects                      # Netlify / Cloudflare Pages redirects for retired URLs
├── vercel.json                     # Vercel: clean URLs + the same redirects (no build step)
├── sitemap.xml / robots.txt        # sitemap is generated
└── assets/                         # styles.css, components.js (nav + footer), portfolio.js, program-titles.js (generated)
```

Retired pages (fellowships, faculty, get-involved, mentorship, training, networks, fellowship-tracks,
young-scholars, volunteer-interest) are kept as instant-redirect stubs.
`fellowship-application.html` is kept as a hidden page (noindex, not linked) for future use — see the note at the top of the file.

Online donations: set `window.STRIPE_CHECKOUT_ENDPOINT` in [support.html](support.html). While it is empty the "Pledge Now" button stays hidden; add `?pledge=preview` to the URL to preview the modal.

## Program Portfolio (generated)

Edit program records in [tools/data/programs.js](tools/data/programs.js), then run:

```bash
node tools/build-portfolio.js
```

This rebuilds `programs/portfolio/`, the six-card previews on the homepage and Programs page
(between the `portfolio-preview` markers), `assets/program-titles.js`, and `sitemap.xml`.
Set `published: false` to hide a record. Only add an `offeringHistory` entry for an owner-confirmed
past offering; outlines stay labeled "illustrative" either way.

## How shared nav/footer works

Each page includes two placeholder divs:

```html
<div id="site-nav"></div>
...
<div id="site-footer"></div>
```

[assets/components.js](assets/components.js) replaces them on `DOMContentLoaded`. To change the navigation or footer, edit that one file. No build step required.

The active section is highlighted by `<body data-page="...">` (about, programs, community, partnerships, contact, support). Links are resolved relative to the site root, so pages can live in subfolders.

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

## 捐款支付集成方案 (Donation Payment — Planned Architecture)

Support 页面当前的捐款表单是 Formspree 占位，上线正式支付需要分两个独立方案，分别覆盖**美国 / 国际捐款人**和**中国境内捐款人**。两者的技术栈、合规路径、上线周期都不一样，不能塞进同一套表单。

Support 页面的最终 UI 是双 Tab：`[International / USD]` 和 `[中国大陆 / CNY]`，分别对应下面两个方案。

---

### 方案 A — 国际捐款（美国 + 海外）

**技术栈**：Stripe Checkout + serverless 函数（Vercel / Netlify / Cloudflare Workers）

**覆盖范围**：
- 美国及国际信用卡 / 借记卡
- Apple Pay / Google Pay
- 跨境 Alipay / WeChat Pay（走 Stripe 的 `alipay` / `wechat_pay` payment method，美元结算，用户体验为"跨境支付"）
- 一次性捐款和月捐均支持

**流程**：
```
前端 support.html
  用户选金额（$25 / $50 / $100 / $250 / Other）和币种 USD
  ↓ POST /api/create-checkout-session
Serverless: Stripe Node SDK 创建 Checkout Session
  payment_method_types: ['card', 'alipay', 'wechat_pay']
  mode: 'payment' 或 'subscription'（月捐）
  success_url / cancel_url
  ↓ 返回 session.url
前端重定向到 Stripe 托管支付页
  ↓
Stripe Webhook → /api/stripe-webhook
  监听 checkout.session.completed
  验签 → 落库 → 发送捐赠收据邮件
```

**需要新增**：
- `/api/create-checkout-session.js`（~30 行）
- `/api/stripe-webhook.js`（~50 行，含 Stripe-Signature 验签）
- 环境变量：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`
- 捐款记录存储：Airtable / Supabase / Google Sheet（最小化方案）
- 收据邮件：Resend 或 SendGrid，模板含 501(c)(3) EIN、税务声明、金额

**前置条件**：
- ConnectEd 已取得美国 501(c)(3) 身份（决定 Stripe 非营利费率 + 税务凭证合规）
- 托管平台从 GitHub Pages 迁移到支持 serverless 的平台（Vercel / Netlify / Cloudflare Pages）

**上线周期**：1–2 周

---

### 方案 B — 中国境内捐款

**核心瓶颈不是代码，是资质。** 根据《中华人民共和国慈善法》，只有具备**公开募捐资格**的慈善组织才能向中国公众募捐；微信支付和支付宝的商户号都需要中国营业执照或慈善组织登记证书。ConnectEd 作为美国非营利组织，**不能直接**在境内收取微信/支付宝捐款。

此外，中国个人每年有 5 万美元购汇额度，跨境捐赠受外汇管制；境内捐款人要抵税必须拿到合规慈善组织开具的**慈善捐赠票据**（电子票），ConnectEd 自己无法开具。

**推荐路径：挂靠有公募资格的基金会（唯一合规长期解）**

在**腾讯公益**（gongyi.qq.com）或**支付宝公益**（gongyi.alipay.com）发起项目，必须由一家有公开募捐资格的公募基金会作为执行方或资金方。

**流程**：
```
1. 联系有公开募捐资格的基金会（如中华思源工程基金会、爱德基金会、
   或各大学教育基金会）商谈合作
2. 签订项目执行协议（明确资金用途、报告义务、拨付节奏）
3. 基金会在腾讯公益 / 支付宝公益发起专项项目并通过平台审核
4. 捐款人通过项目页用微信 / 支付宝付款 → 资金进基金会账户
5. 基金会按协议定期拨付给 ConnectEd 或其境内合作方，并出具正式票据
```

**网站端只需要**：
- 在 Support 页面"中国大陆 / CNY" Tab 放两个外链按钮：
  - "通过腾讯公益捐赠" → 基金会项目页 URL
  - "通过支付宝公益捐赠" → 基金会项目页 URL
- 附一段说明：项目由 XX 基金会执行，捐赠人可申请基金会票据

**上线周期**：基金会接洽 + 立项审核通常 1–3 个月。**越早启动越好**，这是一条必须走行政流程的路径。

**不推荐的替代方案**（仅作过渡说明）：
- 在中国注册民办非企业 / 基金会：注册资金和周期过重，早期阶段不现实
- 挂创始人个人收款码：法律 / 税务风险在个人身上，无合规票据，不可持续

---

### 建议的落地顺序

1. **第 0 步（非技术，必须最先做）**
   - 确认 ConnectEd 美国 501(c)(3) 状态
   - **同步**启动方案 B 的基金会接洽，因为周期最长

2. **第 1 步（1–2 周）—— 方案 A 上线**
   - 迁移托管到支持 serverless 的平台
   - 实现 Stripe Checkout + webhook + 收据邮件
   - International Tab 可以独立上线、独立验证

3. **第 2 步 —— 中国 Tab 占位**
   - "中国大陆 / CNY" Tab 先放"建设中，如需境内捐赠请联系 admin@connect-edu.org"
   - 拿到腾讯公益 / 支付宝公益项目页 URL 后替换为正式外链

4. **第 3 步（可选）**
   - 方案 A 启用 Stripe 的 `alipay` / `wechat_pay` 跨境通道，覆盖有国际卡的境内用户和海外华人

---

### 未决问题

- 是否支持月捐（recurring）？影响 Stripe Checkout 的 `mode` 和 Price 对象设计
- 捐款最小金额下限（建议 $5）
- 收据由 Stripe 自带还是自建模板（自建更灵活）
- 捐款数据存储方案（Airtable / Supabase / Google Sheet）
- 中国境内合作基金会人选是否已锁定

## Known TODOs (Phase 3+)

- Replace placeholder privacy / terms with counsel-reviewed copy
- Add sitemap.xml + robots.txt for SEO
- Add analytics (Plausible or Google Analytics)
- Optimize images (WebP, local hosting, lazy loading)
- Accessibility audit (WCAG 2.1 AA)
