import {readFileSync} from 'node:fs'
import path from 'node:path'

/** Seeded CMS entries (see seed/build-seed.mjs) and what each one exercises. */
export const POSTS = {
  longTitle: '/posts/qa-long-title',
  unbreakable: '/posts/qa-unbreakable-word',
  emptyFields: '/posts/qa-empty-fields',
  imageNoAlt: '/posts/qa-image-no-alt',
  brokenImage: '/posts/qa-broken-image',
  arabic: '/posts/qa-arabic-rtl',
  htmlEmoji: '/posts/qa-html-emoji',
  longBody: '/posts/qa-long-body',
  duplicateSlug: '/posts/qa-duplicate-slug',
  deletedAuthor: '/posts/qa-deleted-author',
  hasDraft: '/posts/qa-has-draft',
  draftOnly: '/posts/qa-draft-only',
} as const
export const PAGES = {home: '/', about: '/about', messyLanding: '/qa-landing'} as const

export function previewSecret(): string {
  return readFileSync(path.resolve(__dirname, '../../.preview-secret'), 'utf8').trim()
}

/** Elements wider than the viewport (cause horizontal scroll) — returns short descriptors. */
export const overflowScript = () => {
  const vw = document.documentElement.clientWidth
  const out: string[] = []
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const r = (el as HTMLElement).getBoundingClientRect()
    if (r.width > 0 && r.right > vw + 1) {
      const t = (el.textContent || '').trim().slice(0, 40)
      out.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} right=${Math.round(r.right)} vw=${vw} "${t}"`)
    }
  }
  return {scrollWidth: document.documentElement.scrollWidth, vw, offenders: out.slice(0, 8)}
}

/**
 * Marks a confirmed defect: the test asserts correct behaviour and is expected to fail until fixed.
 * Run with EXPLORE=1 to see raw pass/fail (used while verifying findings).
 */
import {test} from '@playwright/test'
export function knownBug(reason: string, condition = true) {
  if (process.env.EXPLORE === '1') return
  test.fail(condition, reason)
}
