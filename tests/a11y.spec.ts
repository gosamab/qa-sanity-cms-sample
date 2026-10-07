import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {writeFileSync, mkdirSync} from 'node:fs'
import {PAGES, POSTS, knownBug} from './helpers/content'

/** axe-core WCAG 2.2 A/AA scan. Violations are written to test-results/a11y/ for the report. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
for (const url of [PAGES.home, PAGES.about, PAGES.messyLanding, POSTS.longTitle, POSTS.arabic]) {
  test(`axe WCAG 2.2 AA: ${url}`, async ({page}, info) => {
    test.skip(info.project.name !== 'desktop-chrome' && info.project.name !== 'iphone-14-emulated', 'desktop + one phone')
    if (url !== PAGES.messyLanding) knownBug('CMS-12/CMS-13: card links without accessible name and/or low-contrast dates and brand links')
    await page.goto(url)
    await page.waitForLoadState('networkidle')   // post lists stream in after first paint
    const r = await new AxeBuilder({page}).withTags(TAGS).analyze()
    const summary = r.violations.map((v) => ({id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes[0]?.target}))
    mkdirSync('test-results/a11y', {recursive: true})
    writeFileSync(`test-results/a11y/${info.project.name}${url.replace(/\//g, '_') || '_home'}.json`, JSON.stringify(summary, null, 1))
    expect(summary.filter((v) => v.impact === 'critical' || v.impact === 'serious'), JSON.stringify(summary)).toEqual([])
  })
}
