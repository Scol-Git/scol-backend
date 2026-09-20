import type { Request } from 'express';

/**
 * Resolve the real client IP for rate limiting and session logging.
 *
 * On DigitalOcean App Platform the client IP is in `do-connecting-ip`
 * (X-Forwarded-For is the ingress). Elsewhere fall back to Express `req.ip`
 * (respects trust proxy) then the socket address.
 */
export function getClientIp(req: Request): string {
  const doConnectingIp = firstHeaderValue(req.headers['do-connecting-ip']);
  if (doConnectingIp) {
    return doConnectingIp;
  }

  if (req.ip) {
    return req.ip;
  }

  return req.socket?.remoteAddress || 'unknown';
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}
