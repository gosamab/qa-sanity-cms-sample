// Renders report/cms-bug-report.md to report/cms-bug-report.pdf (headless Chromium). Images referenced as evidence/... are listed, not embedded.
import {readFileSync, writeFileSync} from 'node:fs'
import {marked} from 'marked'
import {chromium} from '@playwright/test'
const dir = new URL('../../report/', import.meta.url).pathname
const md = readFileSync(dir + 'cms-bug-report.md', 'utf8')
const body = marked.parse(md)
const shots = ['CMS-01-unknown-url-200.png', 'CMS-03-unbreakable-360.png', 'CMS-04-arabic-ltr.png', 'CMS-05-broken-image.png', 'CMS-06-dead-cta.png']
const appendix = '<h2 style="page-break-before:always">Appendix: key screenshots</h2>' + shots.map((s) =>
  `<figure><img src="evidence/${s}" style="max-width:100%;max-height:520px;border:1px solid #ddd"><figcaption>${s}</figcaption></figure>`).join('')
const html = `<!doctype html><html><head><meta charset="utf-8"><base href="file://${dir}"><style>
body{font:12.5px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#1d2433;margin:0}h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;border-bottom:2px solid #0f3d3e;padding-bottom:4px;margin-top:22px}
h3{font-size:14px;margin:18px 0 6px;color:#0f3d3e}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #d6dbe3;padding:5px 7px;vertical-align:top;text-align:left}th{background:#eef2f6}
code{background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:11.5px}li{margin:2px 0}figure{margin:10px 0}figcaption{font-size:11px;color:#667}hr{border:0;border-top:1px solid #e3e6ea}</style></head><body>${body}${appendix}</body></html>`
writeFileSync(dir + '_render.html', html)
const b = await chromium.launch(); const p = await b.newPage()
await p.goto('file://' + dir + '_render.html'); await p.waitForLoadState('networkidle')
await p.pdf({path: dir + 'cms-bug-report.pdf', format: 'A4', margin: {top: '16mm', bottom: '16mm', left: '14mm', right: '14mm'}, printBackground: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#889">CMS QA sample · Next.js + Sanity · page <span class="pageNumber"></span>/<span class="totalPages"></span></div>'})
await b.close()
console.log('pdf ok')
