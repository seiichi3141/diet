import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'text/plain; charset=utf-8',
}

/** root ディレクトリ配下だけを配信する静的サーバー。/ は dashboard.html を返す。 */
export function createStaticServer(root: string): Server {
  const rootAbs = resolve(root)
  return createServer((req, res) => {
    void (async () => {
      const url = (req.url ?? '/').split('?')[0]
      let rel: string
      try {
        rel = decodeURIComponent(url)
      } catch {
        res.writeHead(400).end('bad request')
        return
      }
      if (rel === '/' || rel === '') rel = '/dashboard.html'
      const path = normalize(join(rootAbs, rel.replace(/^\/+/, '')))
      if (path !== rootAbs && !path.startsWith(rootAbs + sep)) {
        res.writeHead(403).end('forbidden')
        return
      }
      try {
        const body = await readFile(path)
        res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
        res.end(body)
      } catch {
        res.writeHead(404).end('not found')
      }
    })()
  })
}

function lanAddresses(): string[] {
  const addresses: string[] = []
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) addresses.push(info.address)
    }
  }
  return addresses
}

function main(): void {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  const port = Number(process.argv[2] ?? 8787)
  const server = createStaticServer(root)
  server.listen(port, '0.0.0.0', () => {
    console.log(`ダッシュボードを配信中です:`)
    console.log(`  このPC:   http://localhost:${port}`)
    for (const addr of lanAddresses()) {
      console.log(`  スマホ:   http://${addr}:${port}  （同じWi-Fiに接続して開く）`)
    }
    console.log('終了するには Ctrl+C')
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
