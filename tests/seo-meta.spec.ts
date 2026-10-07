import {expect, test} from '@playwright/test'
import {PAGES, POSTS, knownBug} from './helpers/content'

/** Metadata generated from CMS fields, and fallbacks when those fields are empty. */
const meta = (page: import('@playwright/test').Page) => page.evaluate(() => ({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
  ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null,
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
  lang: document.documentElement.lang,
  h1: document.querySelectorAll('h1').length,
  robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
}))

test.describe('per-document metadata', () => {
  for (const url of [PAGES.home, PAGES.about, PAGES.messyLanding, POSTS.longTitle, POSTS.arabic, POSTS.htmlEmoji]) {
    test(`title, description, lang and one h1: ${url}`, async ({page}) => {
      await page.goto(url)
      const m = await meta(page)
      expect.soft(m.title.trim().length, 'title').toBeGreaterThan(0)
      expect.soft(m.description, 'meta description').toBeTruthy()
      expect.soft(m.lang, 'html lang').toBeTruthy()
      expect.soft(m.h1, 'exactly one h1').toBe(1)
    })
  }

  test('post with empty excerpt still gets a meta description (fallback)', async ({page}) => {
    knownBug('CMS-10: no description fallback when excerpt is empty')
    await page.goto(POSTS.emptyFields)
    expect((await meta(page)).description).toBeTruthy()
  })

  test('Arabic post declares its language/direction', async ({page}) => {
    knownBug('CMS-04: html lang="en" on Arabic content, no dir')
    await page.goto(POSTS.arabic)
    const ok = await page.evaluate(() => !!document.querySelector('[lang^="ar"], [dir="rtl"]'))
    expect(ok).toBe(true)
  })
})

test.describe('not found and sitemap', () => {
  test('unknown page URL returns 404 (no soft-404)', async ({page}) => {
    knownBug('CMS-01: unknown /[slug] returns 200 with the "Create Page" onboarding card')
    const res = await page.goto('/this-page-does-not-exist')
    expect(res?.status()).toBe(404)
  })

  test('unknown post URL returns 404', async ({page}) => {
    const res = await page.goto('/posts/this-post-does-not-exist')
    expect(res?.status()).toBe(404)
  })

  test('sitemap uses absolute URLs, no /null, no duplicates', async ({request}) => {
    knownBug('CMS-11: sitemap <loc> has no scheme, includes /null and duplicate URLs')
    const xml = await (await request.get('/sitemap.xml')).text()
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
    expect.soft(locs.filter((l) => !/^https?:\/\//.test(l)), 'locs without scheme').toEqual([])
    expect.soft(locs.filter((l) => /\/(null|undefined)$/.test(l)), 'null slugs').toEqual([])
    expect.soft(locs.filter((l, i) => locs.indexOf(l) !== i), 'duplicates').toEqual([])
  })
})
