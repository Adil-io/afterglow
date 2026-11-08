import 'dotenv/config';
import express from 'express';

const app = express();
const TMDB = 'https://api.themoviedb.org/3';

type MediaType = 'movie' | 'tv';
const validType = (value: unknown): value is MediaType => value === 'movie' || value === 'tv';

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  next();
});

async function tmdb(pathname: string, query: Record<string, string> = {}, attempt = 0): Promise<unknown> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw Object.assign(new Error('TMDB access token is not configured.'), { status: 503 });
  const url = new URL(`${TMDB}${pathname}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
  } catch (error) {
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return tmdb(pathname, query, 1);
    }
    throw error;
  }
  if (response.status >= 500 && attempt === 0) {
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 350));
    return tmdb(pathname, query, 1);
  }
  const payload = await response.json().catch(() => ({})) as { status_message?: string };
  if (!response.ok) throw Object.assign(new Error(payload.status_message || `TMDB request failed (${response.status})`), { status: response.status });
  return payload;
}

app.get('/api/catalog', async (req, res) => {
  const type = req.query.type;
  if (!validType(type)) return res.status(400).json({ error: 'type must be movie or tv' });
  try {
    const page = String(Math.min(Math.max(Number(req.query.page) || 1, 1), 500));
    res.json(await tmdb(`/discover/${type}`, { language: 'en-US', sort_by: 'popularity.desc', include_adult: 'false', page }));
  } catch (error) { handleError(res, error); }
});

app.get('/api/search', async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (query.length > 120) return res.status(400).json({ error: 'query is too long' });
  try { res.json(await tmdb('/search/multi', { query, include_adult: 'false', language: 'en-US', page: '1' })); }
  catch (error) { handleError(res, error); }
});

app.get('/api/details/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (!validType(type)) return res.status(400).json({ error: 'type must be movie or tv' });
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id must be numeric' });
  try { res.json(await tmdb(`/${type}/${id}`, { language: 'en-US' })); }
  catch (error) { handleError(res, error); }
});

app.get('/api/series/:seriesId/seasons/:seasonNumber', async (req, res) => {
  const { seriesId, seasonNumber } = req.params;
  if (!/^\d+$/.test(seriesId) || !/^\d+$/.test(seasonNumber)) {
    return res.status(400).json({ error: 'seriesId and seasonNumber must be numeric' });
  }
  try {
    res.json(await tmdb(`/tv/${seriesId}/season/${seasonNumber}`, { language: 'en-US' }));
  } catch (error) { handleError(res, error); }
});

app.get('/api/providers/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (!validType(type)) return res.status(400).json({ error: 'type must be movie or tv' });
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id must be numeric' });
  try { res.json(await tmdb(`/${type}/${id}/watch/providers`)); }
  catch (error) { handleError(res, error); }
});

app.get('/api/videos/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (!validType(type)) return res.status(400).json({ error: 'type must be movie or tv' });
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id must be numeric' });
  try { res.json(await tmdb(`/${type}/${id}/videos`, { language: 'en-US', include_video_language: 'en-US,en,null' })); }
  catch (error) { handleError(res, error); }
});

function handleError(res: express.Response, error: unknown) {
  const failure = error as Error & { status?: number };
  const message = failure.message === 'fetch failed'
    ? 'TMDB could not be reached by the local server. Check your internet connection and try again.'
    : failure.message || 'TMDB request failed.';
  res.status(failure.status || 500).json({ error: message });
}

// Never let an unknown API route fall through and return index.html as a successful response.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown Afterglow API route.' }));

export default app;