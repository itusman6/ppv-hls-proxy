/**
 * Reconstruct the public-facing origin of this request.
 *
 * In production the Node process is almost always behind a reverse proxy or
 * tunnel (Caddy, nginx, Cloudflare, Railway, Fly, Render, ngrok, Cloudflare
 * Tunnel, …) that terminates TLS and forwards the request to us over plain
 * HTTP. In that case `req.headers.host` alone gives the right hostname but the
 * wrong scheme — and building an `http://` URL when the page is served over
 * HTTPS triggers the browser's "Mixed Content" block.
 *
 * Priority:
 *   1. X-Forwarded-Proto   (standard, set by every major proxy)
 *   2. Forwarded: proto=…  (RFC 7239, less common but honoured)
 *   3. req.socket.encrypted (true when we ourselves are the TLS terminator)
 *   4. fallback to "http"
 *
 * Host priority:
 *   1. X-Forwarded-Host    (when the proxy rewrites the Host header)
 *   2. Forwarded: host=…
 *   3. req.headers.host
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {string} e.g. "https://ppv-hls-proxy.enzonic.dev"
 */
export function getPublicOrigin(req) {
  const headers = req.headers || {}

  // ---- proto ----
  let proto = ''
  const xfp = headers['x-forwarded-proto']
  if (xfp) proto = String(xfp).split(',')[0].trim().toLowerCase()

  if (!proto) {
    const fwd = headers['forwarded']
    if (fwd) {
      const m = /(?:^|;|,)\s*proto\s*=\s*"?([a-z]+)"?/i.exec(String(fwd))
      if (m) proto = m[1].toLowerCase()
    }
  }

  if (!proto) {
    proto = req.socket?.encrypted ? 'https' : 'http'
  }

  // Only allow http/https to avoid header-injection weirdness.
  if (proto !== 'https' && proto !== 'http') proto = 'http'

  // ---- host ----
  let host = ''

  const xfh = headers['x-forwarded-host']
  if (xfh) host = String(xfh).split(',')[0].trim()

  if (!host) {
    const fwd = headers['forwarded']
    if (fwd) {
      const m = /(?:^|;|,)\s*host\s*=\s*"?([^";,]+)"?/i.exec(String(fwd))
      if (m) host = m[1].trim()
    }
  }

  if (!host) host = String(headers.host || '').trim()

  // Strip whitespace and any accidental protocol prefix in the forwarded host.
  host = host.replace(/^https?:\/\//i, '').replace(/\/+$/, '')

  if (!host) {
    // Last-ditch fallback so we never throw — route.js already validates host.
    host = 'localhost'
  }

  return `${proto}://${host}`
}