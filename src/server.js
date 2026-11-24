import http from 'node:http'
import { port } from './env.js'
import { onReq } from './http/route.js'

const srv = http.createServer(onReq)

function boot() {
  const addr = srv.address()
  // If addr is an object (which it is when listening on IPs), read the port
  const actualPort = typeof addr === 'string' ? addr : addr.port
  
  // Determine the host we actually bound to
  const hostToPrint = process.env.HOST || '0.0.0.0'
  console.log(`listening on http://${hostToPrint}:${actualPort}/`)
}

// Increase header size tolerance in case a proxy forwards large cookies/URLs.
srv.headersTimeout = 65_000
srv.requestTimeout = 0 // no timeout — HLS relays are long-lived

// Bind to 0.0.0.0 so Enzonic's proxy can reach it
const host = process.env.HOST || '0.0.0.0'

srv.listen(port, host, boot)

// Graceful shutdown so tunnels/proxies can drain in-flight relays.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} received, closing server…`)
    srv.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
  })
}