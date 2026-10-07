import {expect, test} from '@playwright/test'
import {PAGES, POSTS, knownBug, overflowScript} from './helpers/content'

/**
 * How CMS-driven components behave with messy content entered through the API / imports / drafts
 * (Studio validation is client-side only, so these values do reach production in real projects).
 * Confirmed defects are marked test.fail() with their report ID: the test asserts the CORRECT
 * behaviour, so it shows as "expected to fail" until the bug is fixed, then flips to an
 * unexpected pass — the signal to remove test.fail().
 */
const isDesktop = (name: string) => name.startsWith('desktop-')

test.describe('layout with messy CMS text', () => {
  for (const [label, url] of Object.entries({
    longTitle: POSTS.longTitle, unbreakable: POSTS.unbreakable, arabic: POSTS.arabic,
    htmlEmoji: POSTS.htmlEmoji, messyLanding: PAGES.messyLanding, home: PAGES.home,
  })) {
    for (const width of [360, 768, 1280]) {
      test(`no horizontal overflow: ${label} @${width}px`, async ({page}, info) => {
        test.skip(!isDesktop(info.project.name), 'breakpoint sweep runs on desktop engines; devices are covered below')
        knownBug('CMS-03: unbreakable title/URL overflows the viewport', label === 'unbreakable' || (label === 'home' && width === 360))
        knownBug('CMS-14: WebKit-only 7px overflow from the home hero at 768px', label === 'home' && width === 768 && info.project.name === 'desktop-safari-webkit')
        await page.setViewportSize({width, height: 900})
        await page.goto(url)
        const r = await page.evaluate(overflowScript)
        await page.screenshot({path: `test-results/screens/${info.project.name}/${label}-${width}.png`, fullPage: false})
        expect(r.scrollWidth, JSON.stringify(r.offenders)).toBeLessThanOrEqual(r.vw)
      })
    }
  }

  test('no horizontal overflow on device viewports (emulated)', async ({page}, info) => {
    test.skip(isDesktop(info.project.name), 'device projects only')
    for (const url of [POSTS.longTitle, POSTS.unbreakable, POSTS.arabic, PAGES.messyLanding]) {
      await page.goto(url)
      const r = await page.evaluate(overflowScript)
      await page.screenshot({path: `test-results/screens/${info.project.name}${url.replace(/\//g, '_')}.png`})
      if (url === POSTS.unbreakable) {
        expect.soft(r.scrollWidth, `CMS-03 ${url} ${JSON.stringify(r.offenders)}`).toBeGreaterThan(r.vw) // known defect, documented
      } else {
        expect.soft(r.scrollWidth, `${url} ${JSON.stringify(r.offenders)}`).toBeLessThanOrEqual(r.vw)
      }
    }
  })
})

test.describe('empty and missing fields', () => {
  test('empty post body does not render a stray "0"', async ({page}) => {
    knownBug('CMS-02: `{post.content?.length && …}` renders 0 when content is []')
    await page.goto(POSTS.emptyFields)
    const articleText = (await page.locator('article').first().innerText()).trim()
    expect(articleText).not.toMatch(/^0$|^0\s|\s0$/)
  })

  test('cover image whose asset was deleted is not shown as a broken image', async ({page}) => {
    knownBug('CMS-05: dangling image reference renders a broken <img>')
    const failed: string[] = []
    page.on('response', (r) => { if (r.url().includes('cdn.sanity.io') && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
    await page.goto(POSTS.brokenImage)
    await page.waitForLoadState('networkidle')
    const broken = await page.locator('article img').evaluateAll((imgs) =>
      imgs.filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0).length)
    expect(broken + failed.length, failed.join('\n')).toBe(0)
  })

  test('post whose author was deleted renders without a dangling byline', async ({page}) => {
    await page.goto(POSTS.deletedAuthor)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText(/^By\s*$/)).toHaveCount(0)
  })

  test('CTA whose linked page was deleted does not render as dead text', async ({page}) => {
    knownBug('CMS-06: CTA button text is rendered as plain text when its link cannot be resolved')
    await page.goto(PAGES.messyLanding)
    const cta = page.getByText('Book a demo →')
    await expect(cta).toHaveCount(1)
    const tag = await cta.evaluate((el) => (el.closest('a,button') ? 'interactive' : 'plain-text'))
    expect(tag).toBe('interactive')
  })

  test('empty info section does not leave empty headings', async ({page}) => {
    await page.goto(PAGES.messyLanding)
    const emptyHeadings = await page.locator('h1,h2,h3').evaluateAll((hs) => hs.filter((h) => !(h.textContent || '').trim()).length)
    expect(emptyHeadings).toBe(0)
  })

  test('empty info section does not render a stray "0"', async ({page}) => {
    knownBug('CMS-02: same `content?.length &&` pattern in InfoSection.tsx')
    await page.goto(PAGES.messyLanding)
    const zeros = await page.locator('main section, main div').evaluateAll((els) =>
      els.filter((e) => e.children.length === 0 && (e.textContent || '').trim() === '0').length)
    expect(zeros).toBe(0)
  })
})

test.describe('images and alt text from the CMS', () => {
  test('CTA image alt comes from content, not a hard-coded string', async ({page}) => {
    knownBug('CMS-07: every CTA image gets alt="Demo image"')
    await page.goto(PAGES.messyLanding)
    const alts = await page.locator('section img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt')))
    expect(alts).not.toContain('Demo image')
  })

  test('cover image without CMS alt text is flagged, not silently made decorative', async ({page}) => {
    knownBug('CMS-08: missing alt falls back to alt="" (decorative) for a content image')
    await page.goto(POSTS.imageNoAlt)
    const alt = await page.locator('article img').first().getAttribute('alt')
    expect(alt && alt.trim().length).toBeTruthy()
  })
})

test.describe('RTL and special characters', () => {
  test('Arabic post is rendered right-to-left', async ({page}, info) => {
    knownBug('CMS-04: no dir/lang handling for RTL content')
    await page.goto(POSTS.arabic)
    await page.screenshot({path: `test-results/screens/${info.project.name}-arabic-full.png`, fullPage: true})
    const dir = await page.locator('h1').evaluate((h) => getComputedStyle(h).direction)
    expect(dir).toBe('rtl')
  })

  test('HTML-like text from the CMS is escaped, not executed', async ({page}) => {
    let dialog = false
    page.on('dialog', async (d) => { dialog = true; await d.dismiss() })
    await page.goto(POSTS.htmlEmoji)
    await expect(page.locator('h1')).toContainText("<script>alert('x')</script>")
    expect(await page.locator('article script').count()).toBe(0)
    expect(dialog).toBe(false)
  })
})

test.describe('slugs', () => {
  test('two published posts never share one URL', async ({page}) => {
    knownBug('CMS-09: duplicate slugs make one post unreachable')
    await page.goto(PAGES.home)
    const hrefs = await page.locator('article a[href^="/posts/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    const dupes = hrefs.filter((h, i) => hrefs.indexOf(h) !== i)
    expect(dupes, `duplicate card links: ${dupes.join(', ')}`).toEqual([])
  })
})
