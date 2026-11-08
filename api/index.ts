import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server/app.js';

/**
 * Single Vercel Function that serves every /api/* route through Express.
 *
 * vercel.json rewrites `/api/:path*` -> `/api?__path=:path*`, so requests of any
 * depth (e.g. /api/details/movie/687163) land here. We rebuild the original URL
 * from `__path` before handing off, so Express routing works no matter how the
 * platform presents req.url after the rewrite.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const forwarded = url.searchParams.get('__path');

  if (forwarded !== null) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    const pathname = `/api/${forwarded.replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/api';
    req.url = query ? `${pathname}?${query}` : pathname;
  }

  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
