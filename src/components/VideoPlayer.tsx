import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MediaType } from '../types';

export interface VideoPlayerSource {
  mediaId: number;
  mediaType: MediaType;
  title: string;
  videoKey?: string;
  seasonId?: number;
  episodeId?: number;
  mode?: 'inline' | 'dialog';
  buttonLabel?: string;
  disabled?: boolean;
}

export type MoviePlaybackRequest = { movieId: number };
export type SeriesPlaybackRequest = { seriesId: number; seasonId: number; episodeId: number };
export type PlaybackRequest = MoviePlaybackRequest | SeriesPlaybackRequest;

const streamUrl = import.meta.env.VITE_STREAM_URL?.trim().replace(/\/+$/, '') ?? '';

/** VITE_STREAM_URL is the embed base path; add the media kind and selected TMDB values. */
export function buildIframeUrl(request: PlaybackRequest): string | null {
  if (!streamUrl) return null;

  if ('movieId' in request) {
    return `${streamUrl}/movie/${request.movieId}`;
  }

  return `${streamUrl}/tv/${request.seriesId}/${request.seasonId}/${request.episodeId}`;
}

function buildTrailerUrl(videoKey: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?playsinline=1&rel=0`;
}

export default function VideoPlayer(source: VideoPlayerSource) {
  const [playing, setPlaying] = useState(false);
  const { mediaId, mediaType, title, videoKey, seasonId, episodeId, mode = 'inline', buttonLabel = 'Play', disabled = false } = source;
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const trailerUrl = videoKey ? buildTrailerUrl(videoKey) : null;

  useEffect(() => { setPlaying(false); setIframeUrl(null); }, [mediaId, mediaType, videoKey]);

  const openPlayer = () => {
    if (mediaType === 'tv' && (seasonId === undefined || episodeId === undefined)) return;

    let request: PlaybackRequest;
    if (mediaType === 'movie') {
      request = { movieId: mediaId };
    } else {
      if (seasonId === undefined || episodeId === undefined) return;
      request = { seriesId: mediaId, seasonId, episodeId };
    }
    setIframeUrl(buildIframeUrl(request));
    setPlaying(true);
  };

  if (mode === 'dialog') {
    return <>
      <button className="button-player" onClick={openPlayer} disabled={disabled}><span className="button-player-icon">▶</span>{buttonLabel}</button>
      {playing && createPortal(<div className="playback-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlaying(false); }}>
        <section className="playback-dialog" role="dialog" aria-modal="true" aria-label={`Play ${title}`} data-media-id={mediaId} data-media-type={mediaType} data-season-id={seasonId} data-episode-id={episodeId}>
          <header className="playback-head"><div><small>AFTERGLOW PLAYER</small><h2>{title}</h2><span>{mediaType === 'tv' ? 'SERIES' : 'MOVIE'} <i>·</i> TMDB {mediaId}{seasonId !== undefined && ` · S${seasonId}`}{episodeId !== undefined && ` E${episodeId}`}</span></div><button onClick={() => setPlaying(false)} aria-label="Close player">×</button></header>
          <div className="playback-screen">{iframeUrl ? <iframe title={`${title} player`} src={iframeUrl} allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <div className="playback-placeholder"><span className="placeholder-reel">▶</span><small>PLAYER READY</small><b>Connect a playback source</b><p>Set <code>VITE_STREAM_URL</code> in your <code>.env</code> to the embed base URL, then restart the dev server.</p><span className="placeholder-ids">{mediaType.toUpperCase()} · TMDB {mediaId}{seasonId !== undefined && ` · S${seasonId}`}{episodeId !== undefined && ` E${episodeId}`}</span></div>}</div>
        </section>
      </div>, document.body)}
    </>;
  }

  if (!trailerUrl || !videoKey) return null;

  return (
    <div
      className={`video-player ${playing ? 'is-playing' : ''}`}
      data-media-id={mediaId}
      data-media-type={mediaType}
      data-season-id={seasonId}
      data-episode-id={episodeId}
    >
      {playing ? (
        <>
          {iframeUrl && <iframe
            title={`${title} — official trailer`}
            src={trailerUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />}
          <button className="player-close" onClick={() => setPlaying(false)} aria-label="Close trailer">×</button>
        </>
      ) : (
        <button
          className="video-launch"
          onClick={() => setPlaying(true)}
          style={{ backgroundImage: `linear-gradient(90deg,#08090ae8,#08090a38),url("https://img.youtube.com/vi/${encodeURIComponent(videoKey)}/hqdefault.jpg")` }}
          aria-label={`Play official trailer for ${title}`}
        >
          <span className="launch-play"><i>▶</i></span>
          <span className="launch-copy"><small>OFFICIAL TRAILER</small><b>Play trailer</b><em>{title}</em></span>
          <span className="launch-id">{mediaType.toUpperCase()} <i>·</i> TMDB {mediaId}</span>
        </button>
      )}
    </div>
  );
}
