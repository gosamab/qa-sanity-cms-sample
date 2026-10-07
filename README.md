# QA sample: Next.js + Sanity marketing site with messy CMS content

A **sample QA pass** on a self-hosted copy of Sanity's official Next.js starter (`sanity-io/sanity-template-nextjs-clean`). The CMS is seeded with realistic messy content: long and unbreakable headlines, empty fields, deleted images and links, Arabic RTL, HTML-like text, duplicate slugs, and drafts with unpublished changes. It's a portfolio sample, **not client work**, and nothing is deployed publicly.

- **Report:** [`report/cms-bug-report.md`](report/cms-bug-report.md) (PDF: `report/cms-bug-report.pdf`), with 10 confirmed findings plus 4 minor ones, repro steps, evidence and fix hints.
- **Evidence:** `report/evidence/` (screenshots, axe JSON, sitemap output).

## Layout
```
site/                 the unmodified starter (frontend/ = Next.js, studio/ = Sanity Studio)
seed/build-seed.mjs   builds seed/messy-content.json (17 QA documents)
tests/                Playwright + TypeScript suites
  helpers/            global setup (preview secret), content map, evidence capture
playwright.config.ts  device/browser matrix
report/               bug report + evidence
```

## Run it
Requires Node 20+ and a (free) Sanity project. Tokens live only in `site/frontend/.env.local` (git-ignored).
```bash
# 1. Starter + content
cd site && npm install && npm run import-sample-data && cd ..
npm install && npx playwright install chromium webkit firefox
npm run seed                                   # writes the messy QA documents via the Sanity CLI

# 2. Production build of the site
cd site/frontend && npm run build && npx next start -p 3000 &   # back in the repo root afterwards

# 3. Tests (BASE_URL defaults to http://localhost:3000)
npm test                                       # full matrix
npx playwright test --project=desktop-chrome   # one project
EXPLORE=1 npx playwright test                  # raw pass/fail, ignoring known-bug markers
npm run report                                 # HTML report
```

## Matrix
Desktop Chrome (Chromium), desktop Safari (WebKit), desktop Firefox, iPhone 14, Pixel 7 and iPad. The last three are **emulated** (viewport, DPR, touch, UA). The report labels which findings come from emulation.

## What each suite covers
| Suite | Covers |
|---|---|
| `cms-messy-content.spec.ts` | Horizontal overflow at 360/768/1280 px and on device viewports; empty-field fallbacks ("0" bug); deleted image, author and CTA link targets; CMS alt text; RTL rendering; HTML-like text escaping; duplicate slugs |
| `draft-preview.spec.ts` | Public site hides drafts and unpublished changes; Draft Mode via a Presentation-style preview secret shows them; the Disable control returns to published content; invalid secret rejected |
| `seo-meta.spec.ts` | Title, description, `lang` and single `h1` per CMS document; description fallback; RTL language declaration; 404 vs soft-404; sitemap validity |
| `links.spec.ts` | Internal link crawl (≤ 60 URLs) and slug edge cases |
| `a11y.spec.ts` | axe-core WCAG 2.2 A/AA on key pages (desktop and one phone), with violations saved to `test-results/a11y/` |

**Known bugs are encoded, not ignored:** confirmed defects call `knownBug('CMS-xx …')` and assert the *correct* behaviour, so they show as expected failures. When a fix lands, the test reports an **unexpected pass**. Remove the marker then, and the test becomes a permanent regression check.
