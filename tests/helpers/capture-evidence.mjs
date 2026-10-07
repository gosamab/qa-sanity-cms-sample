// Re-captures the evidence screenshots used in report/cms-bug-report.md (manual verification aid).
import {chromium} from '@playwright/test'
const B = process.env.BASE_URL || 'http://localhost:3000'
const out = new URL('../../report/evidence/', import.meta.url).pathname
const b = await chromium.launch()
const shot = async (name, url, {w = 1280, h = 900, full = false, clip, locator} = {}) => {
  const p = await b.newPage({viewport: {width: w, height: h}})
  await p.goto(B + url, {waitUntil: 'networkidle'})
  if (locator) await p.locator(locator).first().scrollIntoViewIfNeeded()
  if (locator) await p.locator(locator).first().screenshot({path: out + name})
  else await p.screenshot({path: out + name, fullPage: full, clip})
  await p.close(); console.log('saved', name)
}
await shot('CMS-01-unknown-url-200.png', '/this-page-does-not-exist', {w: 1280})
await shot('CMS-02-stray-zero.png', '/posts/qa-empty-fields', {w: 1280, locator: 'article'})
await shot('CMS-03-unbreakable-360.png', '/posts/qa-unbreakable-word', {w: 360, h: 780})
await shot('CMS-03-home-card-360.png', '/', {w: 360, h: 780, full: true})
await shot('CMS-04-arabic-ltr.png', '/posts/qa-arabic-rtl', {w: 1280, h: 900})
await shot('CMS-05-broken-image.png', '/posts/qa-broken-image', {w: 1280, h: 900})
await shot('CMS-06-dead-cta.png', '/qa-landing', {w: 1280, locator: 'section:has-text("CTA whose linked page was deleted")'})
await b.close()
