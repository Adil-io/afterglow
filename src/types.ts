export type MediaType = 'movie' | 'tv';

export interface MediaItem {
  id: number;
  media_type?: MediaType;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
}

export interface CatalogResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: MediaItem[];
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface ProviderRegion {
  link?: string;
  flatrate?: WatchProvider[];
  free?: WatchProvider[];
  ads?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export interface MediaDetails extends MediaItem {
  genres?: Array<{ id: number; name: string }>;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: SeasonSummary[];
}

export interface SeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
}

export interface SeasonEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface SeasonDetails {
  id: number;
  name: string;
  season_number: number;
  air_date: string | null;
  overview: string;
  episodes: SeasonEpisode[];
}

export interface ProviderResponse {
  id: number;
  results: Record<string, ProviderRegion>;
}

export interface MediaVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
  iso_639_1?: string;
}

export interface VideosResponse {
  id: number;
  results: MediaVideo[];
}

export interface SearchResponse {
  results: Array<MediaItem & { media_type?: string }>;
}
