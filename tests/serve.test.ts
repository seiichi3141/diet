import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createStaticServer } from '../src/serve.ts'

async function withServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'diet-serve-'))
  writeFileSync(join(dir, 'dashboard.html'), '<html><body>テスト用ダッシュボード</body></html>')
  writeFileSync(join(dir, 'menu.md'), '# テストメニュー')
  const server: Server = createStaticServer(dir)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  try {
    await fn(`http://127.0.0.1:${port}`)
  } finally {
    server.close()
    rmSync(dir, { recursive: true, force: true })
  }
}

test('GET / は dashboard.html を返す', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /text\/html/)
    assert.ok((await res.text()).includes('テスト用ダッシュボード'))
  })
})

test('GET /menu.md は Markdown を返す', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/menu.md`)
    assert.equal(res.status, 200)
    assert.ok((await res.text()).includes('テストメニュー'))
  })
})

test('存在しないファイルは 404', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/nope.html`)
    assert.equal(res.status, 404)
  })
})

test('ディレクトリ外へのパストラバーサルは拒否する', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/..%2F..%2Fetc%2Fpasswd`)
    assert.notEqual(res.status, 200)
  })
})
