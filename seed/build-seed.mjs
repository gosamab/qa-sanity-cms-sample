// Builds seed/messy-content.json: realistic "messy" CMS entries for QA (written via the API, which skips Studio-only validation,
// the same way imports, migrations, scripts and drafts can).
import {writeFileSync} from 'node:fs'
const IMG = 'image-16447e659751e36e7469512c4b4846806c7d6160-1200x630-jpg'   // existing sample asset
const PERSON = '3cbb297f-3e80-471d-a4e5-a2b92dfe8bc2'
let k = 0; const key = () => `qa${(k++).toString(36).padStart(6, '0')}`
const block = (text, style = 'normal', marks = [], markDefs = []) =>
  ({_type: 'block', _key: key(), style, markDefs, children: [{_type: 'span', _key: key(), text, marks}]})
const date = (d) => `2026-10-0${d}T09:00:00.000Z`
const LONG_TITLE = 'Our biggest product update of the year: everything marketing, sales and customer success teams asked for, rebuilt from the ground up with faster pages, smarter forms, localized landing pages and a brand-new analytics dashboard for 2026'
const LONG_WORD = 'Supercalifragilisticexpialidocious-Pneumonoultramicroscopicsilicovolcanoconiosis-Hippopotomonstrosesquippedaliophobia-NoSpacesAtAll'
const LONG_URL = 'https://www.example.com/campaigns/2026/q4/landing-pages/very/deep/path/with-a-very-long-utm-string?utm_source=newsletter&utm_medium=email&utm_campaign=black_friday_cyber_monday_mega_sale_2026_final_v3'
const docs = [
  {_id: 'qa-post-long-title', _type: 'post', title: LONG_TITLE, slug: {_type: 'slug', current: 'qa-long-title'},
   excerpt: LONG_TITLE + '. ' + LONG_TITLE, date: date(1), author: {_type: 'reference', _ref: PERSON},
   coverImage: {_type: 'image', alt: 'Dashboard screenshot', asset: {_type: 'reference', _ref: IMG}},
   content: [block('Normal body copy for a post whose headline is far longer than the design expects.')]},
  {_id: 'qa-post-unbreakable', _type: 'post', title: `Read this: ${LONG_WORD}`, slug: {_type: 'slug', current: 'qa-unbreakable-word'},
   excerpt: `Campaign link: ${LONG_URL}`, date: date(2),
   content: [block(`Paste of an unbroken campaign URL straight from the brief: ${LONG_URL}`), block(LONG_WORD)]},
  {_id: 'qa-post-empty-fields', _type: 'post', title: 'Post with every optional field empty', slug: {_type: 'slug', current: 'qa-empty-fields'},
   content: []},
  {_id: 'qa-post-image-no-alt', _type: 'post', title: 'Cover image uploaded without alt text', slug: {_type: 'slug', current: 'qa-image-no-alt'},
   excerpt: 'The editor uploaded a meaningful image but skipped the alt field.', date: date(3),
   coverImage: {_type: 'image', asset: {_type: 'reference', _ref: IMG}}, content: [block('Body.')]},
  {_id: 'qa-post-broken-image', _type: 'post', title: 'Cover image whose asset was deleted', slug: {_type: 'slug', current: 'qa-broken-image'},
   excerpt: 'The image asset was removed from the media library after publishing.', date: date(3),
   coverImage: {_type: 'image', alt: 'Team photo', asset: {_type: 'reference', _ref: 'image-0000000000000000000000000000000000000000-1200x630-jpg', _weak: true}},
   content: [block('Body.')]},
  {_id: 'qa-post-arabic', _type: 'post', title: 'إطلاق المنصة الجديدة: كل ما تحتاجه لحملاتك التسويقية في 2026', slug: {_type: 'slug', current: 'qa-arabic-rtl'},
   excerpt: 'تم إطلاق Next.js 15 مع Sanity في الربع الرابع (Q4) — السعر يبدأ من 99$ شهريًا!', date: date(4), author: {_type: 'reference', _ref: PERSON},
   content: [block('هذه فقرة عربية كاملة لاختبار اتجاه النص من اليمين إلى اليسار، مع كلمات إنجليزية مثل Sanity و Next.js وأرقام مثل 2026 و 15%.', 'normal'),
             block('Mixed line: العرض ينتهي في 31/12 — use code SAVE20 للحصول على خصم 20%.')]},
  {_id: 'qa-post-html-emoji', _type: 'post', title: `Launch 🚀 <script>alert('x')</script> &amp; Tom & Jerry's “Big” Sale 🎉`, slug: {_type: 'slug', current: 'qa-html-emoji'},
   excerpt: `<b>Bold?</b> &lt;not a tag&gt; 👩‍💻🇸🇦 "quotes" 'single' – em—dash…`, date: date(5),
   content: [block(`<img src=x onerror=alert(1)> should render as text. Emoji: 👩‍👩‍👧‍👦 🇸🇦 ✅`)]},
  {_id: 'qa-post-long-body', _type: 'post', title: 'Very long article body', slug: {_type: 'slug', current: 'qa-long-body'}, date: date(5),
   excerpt: 'A long-form post to check scrolling, headings and lists.',
   content: Array.from({length: 40}, (_, i) => block(i % 10 === 0 ? `Section ${i / 10 + 1}` : `Paragraph ${i}: ` + 'Marketing copy that keeps going. '.repeat(12), i % 10 === 0 ? 'h2' : 'normal'))},
  {_id: 'qa-post-dup-a', _type: 'post', title: 'Duplicate slug A (published first)', slug: {_type: 'slug', current: 'qa-duplicate-slug'}, date: date(6), content: [block('I am post A.')]},
  {_id: 'qa-post-dup-b', _type: 'post', title: 'Duplicate slug B (published second)', slug: {_type: 'slug', current: 'qa-duplicate-slug'}, date: date(7), content: [block('I am post B.')]},
  {_id: 'qa-post-deleted-author', _type: 'post', title: 'Post whose author was deleted', slug: {_type: 'slug', current: 'qa-deleted-author'}, date: date(6),
   excerpt: 'The author document was removed after this post was published.',
   author: {_type: 'reference', _ref: 'qa-person-deleted', _weak: true}, content: [block('Body.')]},
  {_id: 'qa-post-no-slug', _type: 'post', title: 'Published post without a slug', date: date(6), content: [block('Body.')]},
  {_id: 'qa-post-has-draft', _type: 'post', title: 'Pricing update (published v1)', slug: {_type: 'slug', current: 'qa-has-draft'}, date: date(7),
   excerpt: 'Published excerpt v1.', content: [block('Published body v1: price is $49.')]},
  {_id: 'drafts.qa-post-has-draft', _type: 'post', title: 'Pricing update (UNPUBLISHED v2)', slug: {_type: 'slug', current: 'qa-has-draft'}, date: date(7),
   excerpt: 'Unpublished excerpt v2.', content: [block('Unpublished body v2: price is $59.')]},
  {_id: 'drafts.qa-post-draft-only', _type: 'post', title: 'DRAFT ONLY: not yet published announcement', slug: {_type: 'slug', current: 'qa-draft-only'}, date: date(7),
   excerpt: 'This must never appear on the public site.', content: [block('Secret draft body.')]},
  {_id: 'qa-page-messy', _type: 'page', name: 'QA messy landing page', slug: {_type: 'slug', current: 'qa-landing'},
   heading: LONG_TITLE, subheading: '',
   pageBuilder: [
     {_type: 'callToAction', _key: key(), heading: 'CTA whose linked page was deleted', eyebrow: 'Dead link',
      body: [block('The button below points to a page that no longer exists.')],
      button: {_type: 'button', buttonText: 'Book a demo →', link: {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: 'qa-page-deleted', _weak: true}}}},
     {_type: 'callToAction', _key: key(), heading: 'CTA with an image the editor described', body: [block('The image has its own meaning in the CMS.')],
      image: {_type: 'image', asset: {_type: 'reference', _ref: IMG}}, button: {_type: 'button', buttonText: 'Learn more', link: {_type: 'link', linkType: 'href', href: 'https://www.sanity.io'}}},
     {_type: 'infoSection', _key: key(), heading: '', subheading: '', content: []},
   ]},
  {_id: 'qa-page-no-slug', _type: 'page', name: 'Page published without slug', heading: 'No slug here', pageBuilder: []},
]
writeFileSync(new URL('./messy-content.json', import.meta.url), JSON.stringify(docs, null, 1))
console.log('docs', docs.length)
