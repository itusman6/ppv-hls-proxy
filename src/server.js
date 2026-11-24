import http from 'node:http'
import { port } from './env.js'
import { onReq } from './http/route.js'

const srv = http.createServer(onReq)

function boot() {
  const addr = srv.address()
  const host = typeof addr === 'string' ? addr : `localhost:${addr.port}`
  console.log(`listening on http://${host}/`)
}

// Increase header size tolerance in case a proxy forwards large cookies/URLs.
srv.headersTimeout = 65_000
srv.requestTimeout = 0 // no timeout — HLS relays are long-lived

if (process.env.HOST) srv.listen(port, process.env.HOST, boot)
else srv.listen(port, boot)

// Graceful shutdown so tunnels/proxies can drain in-flight relays.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} received, closing server…`)
    srv.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
  })
}