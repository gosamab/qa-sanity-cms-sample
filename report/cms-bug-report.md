# CMS QA report: Next.js + Sanity marketing site with messy content

**What this is:** a sample QA pass on a self-hosted copy of Sanity's official **Next.js "clean" starter**. I seeded the CMS with realistic messy content and tested how CMS-driven pages hold up. It's a portfolio sample, not client work. Nothing here was deployed publicly.

**Tester:** Osama Azab · **Date:** 7 October 2026 · **Total test time:** ~3 h, including setup

---

## 1. Scope

| Item | Detail |
|---|---|
| Template | `sanity-io/sanity-template-nextjs-clean` (via `create-sanity` 6.0.51), unmodified |
| Stack | Next.js 16.2.7 (App Router, production build `next build && next start`), React 19.2.7, next-sanity 13.0.8, Sanity Studio 5.31.1 |
| CMS | Free Sanity project `isdq5nsx`, dataset `production`: the template's sample data **plus 17 seeded QA documents** |
| Draft/preview | Draft Mode enabled exactly like the Presentation tool does it (a preview-URL secret, then `/api/draft-mode/enable`) |
| Out of scope | Studio UI usability, performance/load, security testing beyond output-escaping checks |

**Seeded messy content** (`seed/build-seed.mjs`). Writes go through the API, which skips Studio-only validation, just as imports, migrations, scripts and drafts do in real projects:

- a 230-character headline; a single unbreakable 120-character word; a pasted 200-character campaign URL
- a post with every optional field empty (no excerpt, image, author or date; empty body `[]`)
- a cover image without alt text; a cover image whose asset was deleted
- an author reference to a deleted person; a CTA linking to a deleted page
- Arabic RTL content with mixed Arabic/English, numbers and percentages
- HTML-like strings (`<script>`, `<img onerror>`, `&amp;`), emoji with ZWJ sequences and flags
- a 40-paragraph body; two published posts sharing one slug; a published post without a slug; a page without a slug
- a **draft-only** post, and a published post with **unpublished changes**

## 2. Device and browser matrix

| Project | Engine | Viewport | Real or emulated |
|---|---|---|---|
| Desktop Chrome | Chromium 153 | 1280×720, plus a 360/768/1280 sweep | Real desktop engine |
| Desktop Safari | WebKit 26.6 (Playwright build) | 1280×720, plus the sweep | WebKit engine; not Apple's Safari binary |
| Desktop Firefox | Firefox 155 | 1280×720, plus the sweep | Real desktop engine |
| iPhone 14 | WebKit | 390×664 @3x, touch | **Emulated** |
| Pixel 7 | Chromium | 412×839 @2.6x, touch | **Emulated** |
| iPad (gen 7) | WebKit | 810×1080 @2x, touch | **Emulated** |

Each finding notes which environment it came from. On a client project, I'd confirm the emulated-only findings on real iPhone, iPad and Android devices (I own all three).

**Suite result:** 231 runs passed and 87 were skipped by design (some suites run on one project only). **93 runs are "expected to fail"**: those tests encode the confirmed bugs below and will flip to "unexpected pass" once each bug is fixed.

---

## 3. Confirmed findings

Severity scale: **Critical** (blocks launch) · **High** (visible to every visitor, or SEO or legal risk) · **Medium** (broken experience for some content or users) · **Low** (polish, or best practice).
**Type** says whether the bug is a **template defect** (code that ships with the starter) or a **content-handling gap** (the code trusts CMS content that can legitimately arrive empty, long or broken).

### CMS-01: Any unknown URL returns HTTP 200 with a public "Create Page" Studio prompt (soft 404)
- **Severity:** High. Every mistyped or old URL is indexable as a real page, and public visitors see an internal editor prompt with a link into the Studio.
- **Type:** template defect (`app/[slug]/page.tsx` renders `<PageOnboarding/>` instead of calling `notFound()`)
- **Environment:** all browsers; server response (also reproduced with `curl`)
- **Repro:** 1) Open `/this-page-does-not-exist`. 2) Check the status code in devtools or with `curl -I`.
- **Expected:** a 404 status and a not-found page, or `noindex`.
- **Actual:** **200 OK**, with an orange card saying *"About Page (/about) does not exist yet. Get started by creating an about page. Create Page"*. The text names `/about` regardless of the URL, and the button links to the Studio. Unknown `/posts/...` URLs correctly return 404.
- **Evidence:** `evidence/CMS-01-unknown-url-200.png`
- **Fix hint:** `if (!page?._id) notFound()` on the public site, and show onboarding only in Draft Mode or development.

### CMS-02: An empty rich-text field renders a stray "0" on the page
- **Severity:** Medium. A visible glitch whenever an editor leaves a body or info section empty.
- **Type:** template defect, triggered by content (`{post.content?.length && …}` in `app/posts/[slug]/page.tsx:97` and `InfoSection.tsx:25`; React renders the number `0`)
- **Environment:** all browsers
- **Repro:** 1) In the CMS, create a post with an empty **Content** field (`[]`), or a page-builder **Info section** with empty content. 2) Open `/posts/qa-empty-fields` or `/qa-landing`.
- **Expected:** nothing renders for empty content.
- **Actual:** a lone **"0"** appears where the body would be (on the post page and below the CTAs on the landing page).
- **Evidence:** `evidence/CMS-02-stray-zero.png`, plus `evidence/CMS-06-dead-cta.png` (bottom of the page)
- **Fix hint:** `content?.length > 0 && …` or `!!content?.length && …`.

### CMS-03: Unbreakable words or pasted URLs in CMS fields cause horizontal scrolling
- **Severity:** Medium (High on mobile). The whole page scrolls sideways, the title is clipped and the header button is pushed off-screen.
- **Type:** content-handling gap (no `overflow-wrap:anywhere` / `break-words` on CMS-driven headings, cards or body)
- **Environment:** Chromium, WebKit and Firefox desktop engines at 360, 768 and 1280 px (the post page overflows at **all three widths**, e.g. scrollWidth 1491 vs a 1280 viewport). The home page overflows at 360 px because of the post card. Emulated phones show the same.
- **Repro:** 1) Publish a post whose title contains a long unbroken word, or whose body contains a long campaign URL (entry `qa-unbreakable-word`). 2) Open `/posts/qa-unbreakable-word` at 360 px, and the home page at 360 px.
- **Expected:** text wraps inside its container, with no horizontal scroll.
- **Actual:** the `h1` (text-7xl) and the body paragraph extend past the viewport, and the page scrolls horizontally.
- **Evidence:** `evidence/CMS-03-unbreakable-360.png`, `evidence/CMS-03-home-card-360.png`
- **Fix hint:** add `break-words` / `[overflow-wrap:anywhere]` to `h1`, card `h3` and `.prose`. Consider `hyphens:auto`.

### CMS-04: Arabic (RTL) content renders left-to-right, with misordered punctuation and numbers
- **Severity:** Medium (High for any MENA or multilingual client). The text reads wrongly, and `%`, `.` and `20` jump to the wrong side.
- **Type:** content-handling gap (`<html lang="en">` for all content, with no `dir`/`lang` per document or block)
- **Environment:** all engines
- **Repro:** 1) Publish a post with Arabic title, excerpt and body (`qa-arabic-rtl`). 2) Open `/posts/qa-arabic-rtl`.
- **Expected:** RTL alignment and direction (`dir="rtl"` / `lang="ar"` on the article, or `dir="auto"` on text blocks).
- **Actual:** the heading and paragraphs are left-aligned in LTR. "15%." shows as "%." at the start of the next line, and the mixed line *"العرض ينتهي في 31/12 — use code SAVE20 للحصول على خصم 20%"* renders as "SAVE20 20 للحصول…", with the numbers reordered.
- **Evidence:** `evidence/CMS-04-arabic-ltr.png`
- **Fix hint:** add a `language` field (or detect the script) and set `dir`/`lang` on the article. Use `dir="auto"` on Portable Text blocks.

### CMS-05: A deleted image asset leaves a broken image and a large empty gap
- **Severity:** Medium. The page looks broken after a routine media-library clean-up.
- **Type:** content-handling gap (the cover image renders whenever `coverImage` exists, even if its asset no longer exists)
- **Environment:** all engines
- **Repro:** 1) Publish a post with a cover image, then delete the image asset (entry `qa-broken-image`, a weak reference). 2) Open `/posts/qa-broken-image`.
- **Expected:** no image, or a branded placeholder.
- **Actual:** a broken-image icon with its alt text "Team photo", followed by roughly 540 px of empty reserved space. The CDN request fails with a 4xx.
- **Evidence:** `evidence/CMS-05-broken-image.png`
- **Fix hint:** dereference the asset in GROQ (`coverImage{..., asset->}`) and render only when `asset->url` is defined.

### CMS-06: A CTA button whose linked page was deleted turns into dead plain text
- **Severity:** Medium. It quietly breaks a conversion path, and it doesn't look like a button, so editors won't notice.
- **Type:** template defect (`ResolvedLink` returns bare `children` when the link can't be resolved, and drops the button styling)
- **Environment:** all engines
- **Repro:** 1) Create a Call to Action whose button links to a page, then delete that page (`qa-landing`, first CTA). 2) Open `/qa-landing`.
- **Expected:** the button is hidden (or flagged in preview), never shown as dead text.
- **Actual:** "Book a demo →" renders as unstyled, non-clickable text under the CTA heading.
- **Evidence:** `evidence/CMS-06-dead-cta.png`
- **Fix hint:** in `Cta.tsx`, render the button only if `linkResolver(button.link)` returns a string, and in Draft Mode show a warning badge.

### CMS-07: Every CTA image gets alt="Demo image", whatever the content
- **Severity:** Medium. Screen readers and image search get wrong, repeated descriptions on every landing page.
- **Type:** template defect (`alt="Demo image"` is hard-coded in `Cta.tsx`; the CTA image schema has no alt field)
- **Environment:** all engines (DOM check)
- **Repro:** 1) Add a CTA with an image (`qa-landing`, second CTA). 2) Inspect the image.
- **Expected:** alt text comes from the CMS.
- **Actual:** `<img alt="Demo image">`.
- **Fix hint:** add an `alt` field to the CTA image (required when an image is set) and render it.

### CMS-09: Duplicate slugs make one published post unreachable
- **Severity:** Medium. One article silently disappears: its card opens a different post.
- **Type:** content-handling gap (slug uniqueness is enforced only in the Studio UI; API, import and migration writes bypass it)
- **Environment:** all engines
- **Repro:** 1) Publish two posts with the slug `qa-duplicate-slug`. 2) On the home page, click both cards.
- **Expected:** unique URLs, or a build/CI check that fails on duplicates.
- **Actual:** both cards link to `/posts/qa-duplicate-slug`, and both open **"Duplicate slug A"**. Post B can't be reached, and the sitemap lists the URL twice.
- **Fix hint:** a uniqueness check in the import/migration scripts, plus a CI query `count(*[_type=="post" && slug.current==^.slug.current]) > 1`.

### CMS-11: The sitemap is invalid: relative URLs, a "/null" entry and duplicates
- **Severity:** Medium (SEO). Search engines reject or ignore entries without a scheme.
- **Type:** template defect
  - `url: domain` uses the raw `Host` header (`localhost:3000`, no `https://`).
  - In `sitemapData`, `_type == "page" || _type == "post" && defined(slug.current)` means pages **without** a slug are included (operator precedence), which produces `/null`.
- **Environment:** server output (`/sitemap.xml`)
- **Repro:** open `/sitemap.xml`.
- **Expected:** absolute `https://` URLs, no null slugs, unique entries.
- **Actual:** `<loc>localhost:3000/about</loc>`, `<loc>localhost:3000/null</loc>`, and `…/posts/qa-duplicate-slug` twice.
- **Evidence:** `evidence/CMS-11-sitemap.xml`
- **Fix hint:** build URLs from a configured site URL, wrap the filter in parentheses (`(_type=="page" || _type=="post") && defined(slug.current)`), and de-duplicate.

### CMS-12: Post cards contain a link with no accessible name (WCAG 2.4.4 / 4.1.2)
- **Severity:** Medium (accessibility). Screen-reader users hear "link" 15 times on the home page with no destination.
- **Type:** template defect (the card's `<Link>` wraps only an empty `absolute inset-0` span; the title sits outside the link)
- **Environment:** axe-core 4.13 on Chromium (desktop) and emulated iPhone; serious impact, 15 nodes on `/`
- **Repro:** run axe on `/` after the post list has loaded, or tab through the cards with VoiceOver.
- **Expected:** each card link is announced with the post title.
- **Actual:** `link-name` violations ("Element does not have text that is visible to screen readers").
- **Evidence:** `evidence/CMS-12-axe-home.json`
- **Fix hint:** put the title inside the link, or add `aria-label={title}` to the overlay link.

### Additional minor findings
| ID | Finding | Severity | Type | Environment |
|---|---|---|---|---|
| CMS-08 | A cover image without CMS alt text silently becomes `alt=""` (decorative) instead of being flagged | Low | Content gap (Studio's "alt required" rule doesn't apply to API writes) | All |
| CMS-10 | A post with an empty excerpt gets **no** meta description; there's no fallback to the site description or a body extract | Low | Template defect | All |
| CMS-13 | Colour contrast: post dates `#727892` on white at **4.35:1**, and orange inline links `#ff5500` on white at **3.2:1** (need 4.5:1) | Low | Template defect (design tokens) | axe, Chromium; `evidence/CMS-13-axe-*.json` |
| CMS-14 | Home hero overflows by 7 px at 768 px in the WebKit engine only (the starter's demo hero, not CMS content) | Low | Template defect | WebKit desktop engine; `evidence/CMS-14-webkit-home-768.png` |

### Emulation-only observation (needs a real device)
- On **emulated Pixel 7**, the Draft Mode toast's **Disable** button couldn't be tapped on the home page, because Playwright reported the page container intercepting the tap. The same flow works on emulated iPhone and iPad, and on Pixel 7 from a page without overflow. This is most likely a side effect of **CMS-03** (the 412-px home page scrolls sideways). It's not reported as a separate bug until confirmed on a real Android phone.

---

## 4. Checked and working (no bug)
- **Draft Mode:** drafts are hidden on the public site (404, and not listed). Published posts show the published version, not unpublished changes. With a valid preview secret, the draft-only post, the unpublished v2 and the draft in the listing all appear, the "Draft Mode Enabled" toast shows, and **Disable** returns to published content. An invalid preview secret is rejected. This passes in all 6 projects.
- **Escaping:** `<script>`, `<img onerror>` and `&amp;` in titles and excerpts render as text. No script runs and no dialog opens.
- **A deleted author** is handled cleanly (no dangling "By" line).
- **Unknown post URLs** return 404. The internal link crawl (up to 60 URLs from home, about, landing and a post) found no 4xx/5xx links. An unknown Arabic slug returns 404.
- **Long headlines with normal spaces** (230 characters) wrap correctly at every breakpoint. The empty info-section heading doesn't leave empty heading elements.

## 5. How CMS-driven pages failed differently from hardcoded pages
- **Valid content in the CMS ≠ valid content on the page.** Studio validation (required alt text, unique slugs, required link targets) runs only in the editor. Imports, migrations, API scripts and drafts bypass it. Several findings (CMS-03, 04, 05, 08 and 09) only appear once content arrives that way.
- **References rot over time.** A hardcoded page can't link to a page that doesn't exist, but a CMS page can once someone deletes the target (CMS-05 image, CMS-06 CTA). These bugs appear weeks after launch, not during the build, so regression tests need to seed broken references deliberately.
- **Empty vs missing behaves differently.** `[]`, `""` and an absent field each take a different code path (`[]` produced CMS-02's "0", `""` was handled, an absent field was handled). Testing only "filled" and "absent" misses it.
- **The same component fails in several places.** One card component carries CMS-03, CMS-09 and CMS-12 to every listing (home and "More posts"), so a CMS bug multiplies across pages.
- **Preview is a second product.** Draft Mode has its own rendering path (perspective, toast, live updates), so it needs its own test pass. Here it worked, but its exit control was the one item affected by an unrelated layout bug on emulated mobile.

## 6. How AI was used, and where it misled me
**Used for:** generating the messy-content permutations (the seed script), drafting the Playwright specs, parsing axe JSON and console output, and summarising sitemap and DOM checks. Every finding above was re-run and checked by eye on screenshots or DOM/HTTP output before it went into this report.

**Where it misled me (and what I changed):**
1. **The overflow detector reported "no offending elements" while the page clearly scrolled sideways.** The AI-written check compared element bounding boxes with the viewport, but long unbroken text overflows its box without the box itself growing. I added a second check (`scrollWidth > clientWidth` with `overflow: visible`) and confirmed CMS-03 visually.
2. **The first axe run said the home page was clean.** The scan ran before the post list streamed in (React Suspense), so 15 `link-name` violations were missed. The suite now waits for network idle, and CMS-12 is real.
3. **"Uppercase slugs return 200": discarded.** One run showed `/posts/QA-LONG-TITLE` → 200. Repeating it showed 200 or 404 depending on the ISR cache state (GROQ itself is case-sensitive). It isn't deterministic, so it's not reported as a bug. It's noted here for a follow-up on the deployed host.
4. **The AI drafted the Pixel "Disable" failure as a separate mobile bug.** On manual re-check it only happens on the overflowing page, so it's downgraded to an emulation-only note linked to CMS-03.

## 7. Re-running
See `README.md`. `npm test` runs the whole matrix. Confirmed bugs are encoded as expected-failures, so after a fix the matching test reports **"unexpected pass"**: that's the signal to remove its `knownBug(...)` line and keep it as a permanent regression test.
