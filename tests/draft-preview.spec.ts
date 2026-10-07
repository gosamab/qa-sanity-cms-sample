import {expect, test} from '@playwright/test'
import {PAGES, POSTS, previewSecret} from './helpers/content'

/**
 * Draft Mode / Presentation preview. A preview secret is created in global-setup exactly like the
 * Studio's Presentation tool does, then /api/draft-mode/enable is called with it.
 */
const enable = (pathname: string) =>
  `/api/draft-mode/enable?sanity-preview-secret=${previewSecret()}&sanity-preview-pathname=${encodeURIComponent(pathname)}`

test.describe('public site (no draft mode)', () => {
  test('draft-only post is not reachable', async ({page}) => {
    const res = await page.goto(POSTS.draftOnly)
    expect(res?.status()).toBe(404)
  })
  test('draft-only post is not listed', async ({page}) => {
    await page.goto(PAGES.home)
    await expect(page.getByText('DRAFT ONLY', {exact: false})).toHaveCount(0)
  })
  test('published post shows the published version, not unpublished changes', async ({page}) => {
    await page.goto(POSTS.hasDraft)
    await expect(page.locator('h1')).toHaveText('Pricing update (published v1)')
    await expect(page.getByText('UNPUBLISHED v2')).toHaveCount(0)
  })
})

test.describe('preview (draft mode on)', () => {
  test('invalid preview secret is rejected', async ({request}) => {
    const res = await request.get('/api/draft-mode/enable?sanity-preview-secret=not-a-real-secret&sanity-preview-pathname=/', {maxRedirects: 0})
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('drafts and unpublished changes are visible, then hidden again after Disable', async ({page}) => {
    await page.goto(enable(POSTS.draftOnly))
    await expect(page.locator('h1')).toHaveText(/DRAFT ONLY/)
    await expect(page.getByText('Draft Mode Enabled')).toBeVisible()

    await page.goto(POSTS.hasDraft)
    await expect(page.locator('h1')).toHaveText(/UNPUBLISHED v2/)

    await page.goto(PAGES.home)
    await expect(page.getByText('DRAFT ONLY', {exact: false}).first()).toBeVisible()

    // Disable from a page without CMS-03 overflow (on the emulated Pixel the home page's horizontal
    // overflow left the toast button covered — see report, emulation-only note).
    await page.goto(POSTS.hasDraft)
    await page.getByRole('button', {name: 'Disable'}).click()
    await expect(page.locator('h1')).toHaveText('Pricing update (published v1)', {timeout: 15_000})
    await page.goto(PAGES.home)
    await expect(page.getByText('DRAFT ONLY', {exact: false})).toHaveCount(0)
    const res = await page.goto(POSTS.draftOnly)
    expect(res?.status()).toBe(404)
  })
})
