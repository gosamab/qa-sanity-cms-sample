import {expect, test} from '@playwright/test'
import {PAGES, POSTS} from './helpers/content'

/** Small internal-link crawl from CMS-driven pages (max 60 URLs), plus slug edge cases. */
test('internal links from CMS pages resolve (2xx)', async ({page, request}, info) => {
  test.skip(info.project.name !== 'desktop-chrome', 'crawl once')
  const seen = new Set<string>(); const queue: string[] = [PAGES.home, PAGES.about, PAGES.messyLanding, POSTS.longBody]
  const bad: string[] = []
  while (queue.length && seen.size < 60) {
    const url = queue.shift()!; if (seen.has(url)) continue; seen.add(url)
    const res = await request.get(url)
    if (res.status() >= 400) { bad.push(`${res.status()} ${url}`); continue }
    if (!(res.headers()['content-type'] || '').includes('text/html')) continue
    await page.goto(url)
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
    for (const h of hrefs) if (!seen.has(h) && !h.startsWith('/api/')) queue.push(h)
  }
  expect(bad, `crawled ${seen.size}`).toEqual([])
})

test('slug edge cases', async ({request}, info) => {
  test.skip(info.project.name !== 'desktop-chrome', 'once')
  const s = async (u: string) => (await request.get(u, {maxRedirects: 0})).status()
  // Note: upper-case variants of existing slugs (e.g. /posts/QA-HAS-DRAFT) returned 200 or 404 depending on ISR cache
  // state during this pass — not deterministic, so not asserted here (see report, "discarded / unconfirmed").
  expect.soft(await s('/posts/qa-long-title/'), 'trailing slash → redirect or 200').toBeLessThan(400)
  expect.soft(await s('/posts/' + encodeURIComponent('مقال')), 'unknown Arabic slug').toBe(404)
})
