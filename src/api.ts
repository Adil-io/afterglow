import type { CatalogResponse, MediaDetails, MediaType, ProviderResponse, SearchResponse, SeasonDetails, VideosResponse } from './types';

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { signal, cache: 'no-store' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Could not reach the local Afterglow API. Start it with `npm run dev` and open the Vite URL shown in the terminal.');
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('The local server returned a web page instead of API data. Restart Afterglow with `npm run dev` and open its Vite URL.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  catalog(type: MediaType, page = 1, signal?: AbortSignal) {
    return request<CatalogResponse>(`/api/catalog?type=${type}&page=${page}`, signal);
  },
  search(query: string, signal?: AbortSignal) {
    return request<SearchResponse>(`/api/search?query=${encodeURIComponent(query)}`, signal);
  },
  details(type: MediaType, id: number, signal?: AbortSignal) {
    return request<MediaDetails>(`/api/details/${type}/${id}`, signal);
  },
  season(seriesId: number, seasonNumber: number, signal?: AbortSignal) {
    return request<SeasonDetails>(`/api/series/${seriesId}/seasons/${seasonNumber}`, signal);
  },
  providers(type: MediaType, id: number, signal?: AbortSignal) {
    return request<ProviderResponse>(`/api/providers/${type}/${id}`, signal);
  },
  videos(type: MediaType, id: number, signal?: AbortSignal) {
    return request<VideosResponse>(`/api/videos/${type}/${id}`, signal);
  },
};

export const posterUrl = (path: string | null, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : '';

export const displayTitle = (item: { title?: string; name?: string }) => item.title || item.name || 'Untitled';
export const releaseYear = (item: { release_date?: string; first_air_date?: string }) =>
  (item.release_date || item.first_air_date || '').slice(0, 4);
