import {execFileSync} from 'node:child_process'
import {randomBytes, randomUUID} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import path from 'node:path'

/**
 * Creates a fresh Presentation-tool style preview secret (valid 1 hour) so draft-preview tests can
 * call /api/draft-mode/enable exactly like the Studio does. Written with the user's Sanity CLI login;
 * the secret is stored locally in .preview-secret (git-ignored) and never printed.
 */
export default async function globalSetup() {
  const root = path.resolve(__dirname, '../..')
  const secret = randomBytes(16).toString('hex')
  const doc = {_id: `drafts.${randomUUID()}`, _type: 'sanity.previewUrlSecret', secret, source: 'qa-playwright',
    studioUrl: 'http://localhost:3333', userId: 'qa-playwright'}
  const file = path.join(root, 'test-results', 'preview-secret-doc.json')
  execFileSync('mkdir', ['-p', path.dirname(file)])
  writeFileSync(file, JSON.stringify(doc))
  execFileSync('npx', ['sanity', 'documents', 'create', file, '--replace'], {cwd: path.join(root, 'site/studio'), stdio: 'ignore'})
  writeFileSync(file, '{}')
  writeFileSync(path.join(root, '.preview-secret'), secret)
}
