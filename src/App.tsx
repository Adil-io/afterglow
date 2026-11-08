import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, displayTitle, posterUrl, releaseYear } from './api';
import VideoPlayer from './components/VideoPlayer';
import type { MediaDetails, MediaItem, MediaType, MediaVideo, ProviderRegion, SeasonDetails } from './types';

const REGION = import.meta.env.VITE_TMDB_REGION || 'IN';
const REGION_NAMES: Record<string, string> = { IN: 'India', US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia' };

function App() {
  const [type, setType] = useState<MediaType>('movie');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [region, setRegion] = useState(REGION.toUpperCase());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = window.localStorage.getItem('afterglow-theme');
    return savedTheme === 'light' ? 'light' : 'dark';
  });
  const catalogRequest = useRef<AbortController | null>(null);
  const detailsRequest = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const load = useCallback(async (nextType: MediaType, nextQuery: string, nextPage: number, append = false) => {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    setLoading(true);
    setError('');
    try {
      let results: MediaItem[];
      if (nextQuery) {
        const data = await api.search(nextQuery, controller.signal);
        results = data.results.filter((item) => item.media_type === nextType);
        setTotalPages(1);
      } else {
        const data = await api.catalog(nextType, nextPage, controller.signal);
        results = data.results;
        setTotalPages(data.total_pages);
      }
      setItems((current) => append ? [...current, ...results] : results);
      setPage(nextPage);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : 'Could not load the catalog.');
      if (!append) setItems([]);
    } finally {
      if (catalogRequest.current === controller) {
        catalogRequest.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(type, query, 1);
    return () => catalogRequest.current?.abort();
  }, [type, query, load]);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchText.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchText]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('afterglow-theme', theme);
  }, [theme]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || document.body.classList.contains('dialog-open')) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, []);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const updateHero = () => {
      const hero = heroRef.current;
      if (hero) {
        const progress = Math.min(Math.max(window.scrollY / Math.max(hero.offsetHeight, 1), 0), 1);
        hero.style.setProperty('--hero-scroll', progress.toFixed(3));
      }
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(updateHero); };
    updateHero();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const showDetails = async (item: MediaItem) => {
    const itemType: MediaType = item.media_type || type;
    detailsRequest.current?.abort();
    const controller = new AbortController();
    detailsRequest.current = controller;
    setSelected({ ...item, media_type: itemType });
    setDetails(null);
    setDetailLoading(true);
    try { setDetails(await api.details(itemType, item.id, controller.signal)); }
    catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load title details.');
    }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  };

  const featured = useMemo(() => items.find((item) => item.backdrop_path) || items[0], [items]);
  const heroCards = useMemo(() => items.filter((item) => item.poster_path).slice(0, 3), [items]);
  const featuredImage = posterUrl(featured?.backdrop_path || featured?.poster_path || null, 'original');
  const heroBackground = featuredImage ? (theme === 'light'
    ? `linear-gradient(90deg,#fff8f1f2 4%,#fff8f1d9 37%,#fff8f14d 73%,#fff8f19c),linear-gradient(0deg,#f7f4ef 0%,transparent 35%),url("${featuredImage}")`
    : `linear-gradient(90deg,#0b0b0d 18%,#0b0b0dd9 48%,#0b0b0d55),linear-gradient(0deg,#090a0c 0%,transparent 38%),url("${featuredImage}")`) : undefined;

  const changeType = (next: MediaType) => { setType(next); setQuery(''); setSearchText(''); };
  const closeDetails = () => { detailsRequest.current?.abort(); setSelected(null); setDetails(null); setDetailLoading(false); };
  const loadMore = () => { if (!query && page < totalPages && !loading) void load(type, '', page + 1, true); };
  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchText.trim());
    const catalog = catalogRef.current;
    if (catalog) {
      const resultsHeading = catalog.querySelector<HTMLElement>('.section-heading') || catalog;
      window.scrollTo({ top: Math.max(0, resultsHeading.getBoundingClientRect().top + window.scrollY - 88), behavior: 'smooth' });
    }
  };

  return <>
    <header className="topbar">
      <a className="brand" href="#home" aria-label="Afterglow home"><span className="brand-mark">a</span><span>afterglow<span className="brand-dot">.</span></span></a>
      <nav className="main-nav" aria-label="Browse"><button className={type === 'movie' ? 'nav-link active' : 'nav-link'} onClick={() => changeType('movie')}>Movies</button><button className={type === 'tv' ? 'nav-link active' : 'nav-link'} onClick={() => changeType('tv')}>TV &amp; series</button></nav>
      <div className="header-actions"><form className="search" onSubmit={submitSearch}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input ref={searchInputRef} value={searchText} onChange={(event) => setSearchText(event.target.value)} type="search" placeholder="Titles, people…" aria-label="Search TMDB" /><kbd>/</kbd></form><button className="theme-toggle" type="button" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span></button></div>
    </header>

    <main id="home">
      <section className="hero" ref={heroRef} aria-labelledby="hero-title" style={heroBackground ? { backgroundImage: heroBackground } : undefined}>
        <div className="hero-stage" aria-hidden="true"><div className="hero-stage-glow"/><div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/>{heroCards.map((item, index) => <div key={item.id} className={`hero-poster hero-poster-${index + 1}`} style={{ backgroundImage: `linear-gradient(0deg,${theme === 'light' ? '#3b251ed9' : '#070809e8'} 0%,transparent 48%),url("${posterUrl(item.poster_path, 'w500')}")` }}><span>{displayTitle(item)}</span><small>{releaseYear(item) || 'AFTERGLOW PICK'}</small></div>)}<div className="hero-stage-label"><span className="stage-label-dot"/> TONIGHT'S REEL</div></div>
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> YOUR NEXT GOOD STORY <span className="eyebrow-line"/></div><h1 id="hero-title">Stories worth<br />staying <em>up for.</em></h1><p>Find your next favorite film or series, then see where it’s available to watch in your region.</p><div className="hero-buttons"><button className="button button-primary" onClick={() => featured && void showDetails(featured)}><span>▶</span> Explore the featured title</button><a className="button button-quiet" href="#catalog">Browse the collection <span>↘</span></a></div><div className="hero-note"><span className="live-dot"/> MOVIES &amp; SERIES <i/> POWERED BY TMDB</div></div>
        <div className="hero-side-note">A LITTLE CINEMA, A LOT OF HEART <span>EST. 2026</span></div><div className="hero-bottom"><span>DISCOVER</span><span className="hero-progress"><i/></span><span>{type === 'movie' ? 'MOVIES' : 'TELEVISION'}</span></div>
      </section>

      <section className="quick-stats" aria-label="About the catalog"><div><span className="stat-icon">✳</span><span><b>Always something new</b><small>Popular picks from TMDB</small></span></div><div><span className="stat-icon">⌁</span><span><b>Watch options by region</b><small>Provider availability varies</small></span></div><div><span className="stat-icon">◷</span><span><b>Make it a movie night</b><small>Save your next discovery</small></span></div><a href="#about" className="stat-about">How it works <span>↗</span></a></section>

      <section className="catalog-section" ref={catalogRef} id="catalog"><div className="section-heading"><div><div className="section-kicker">A GOOD PLACE TO START</div><h2>{query ? <>Results for <em>“{query}”</em></> : <>Popular <em>{type === 'movie' ? 'movies' : 'series'}</em></>}</h2></div></div>
        {error && <div className="error-banner" role="alert"><span>{error}{/token|configured/i.test(error) && <> Add your TMDB access token to <code>.env</code>, then restart the server.</>}</span>{!loading && <button onClick={() => void load(type, query, 1)}>Retry <span aria-hidden="true">↻</span></button>}</div>}
        <div className="status-line" aria-live="polite">{loading && <><span className="tiny-loader"/> Loading titles from TMDB…</>}{!loading && !error && `${items.length} ${items.length === 1 ? 'title' : 'titles'} to explore`}</div>
        <div className="movie-grid">{items.map((item, index) => <MediaCard key={`${item.media_type || type}-${item.id}`} item={item} fallbackType={type} onOpen={showDetails} index={index}/>)}</div>
        {!loading && !items.length && !error && <div className="empty-state"><div className="empty-icon">⌕</div><h3>No titles found</h3><p>Try another search or switch between movies and series.</p></div>}
        {loading && !items.length && <div className="movie-grid skeleton-grid">{Array.from({ length: 10 }, (_, index) => <div className="skeleton-card" key={index}/>)}</div>}
        {!query && page < totalPages && <button className="load-more" onClick={loadMore} disabled={loading}>Show me more <span>＋</span></button>}
      </section>

      <section className="quote-band"><div className="quote-mark">“</div><p>Between the first frame<br/>and the final credits, <em>there’s a story.</em></p><span>— AFTERGLOW PROMISE</span></section>
      <section className="about-strip" id="about"><div className="about-heading"><div className="section-kicker">A NOTE ON THE REEL</div><h2>Good films.<br/><em>Good neighbors.</em></h2></div><div className="about-copy"><p>Movie and series details, artwork, and IDs come from TMDB. Regional watch availability is provided by JustWatch through TMDB; playback takes place through the provider you choose.</p><p>Availability can change by region. Afterglow does not host video. Follow a provider link to check its current catalog and subscription requirements.</p><p className="tmdb-notice">This product uses the TMDB API but is not endorsed or certified by TMDB.</p><a className="tmdb-brand-link" href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><img src="https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB"/> Visit TMDB ↗</a><p className="justwatch-notice">Watch provider data powered by JustWatch.</p></div></section>
    </main>
    <footer><a className="brand footer-brand" href="#home"><span className="brand-mark">a</span><span>afterglow<span className="brand-dot">.</span></span></a><span>Made for people who love a good story.</span><span>© 2026 AFTERGLOW <i/> DATA BY TMDB</span></footer>
    {selected && <DetailsDialog item={selected} details={details} loading={detailLoading} region={region} theme={theme} onRegionChange={setRegion} onClose={closeDetails}/>} 
  </>;
}

function MediaCard({ item, fallbackType, onOpen, index }: { item: MediaItem; fallbackType: MediaType; onOpen: (item: MediaItem) => void; index: number }) {
  const title = displayTitle(item);
  const image = posterUrl(item.poster_path);
  const year = releaseYear(item);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';
  const open = () => onOpen({ ...item, media_type: item.media_type || fallbackType });
  return <article className="movie-card" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }} onPointerMove={(event) => { if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const y = (event.clientY - rect.top) / rect.height; event.currentTarget.style.setProperty('--tilt-y', `${(x - .5) * 9}deg`); event.currentTarget.style.setProperty('--tilt-x', `${(.5 - y) * 7}deg`); event.currentTarget.style.setProperty('--shine-x', `${x * 100}%`); event.currentTarget.style.setProperty('--shine-y', `${y * 100}%`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--tilt-y', '0deg'); event.currentTarget.style.setProperty('--tilt-x', '0deg'); }}><button className="poster poster-trigger" onClick={open} aria-label={`Show details for ${title}`}>{image ? <img loading="lazy" decoding="async" src={image} alt={`${title} poster`} onError={(event) => { event.currentTarget.style.display = 'none'; }}/> : <div className="poster-placeholder">{title.slice(0, 1)}</div>}<span className="poster-overlay"><span className="play-small">▶</span><span className="poster-play-label">VIEW TITLE</span></span><span className="card-rating">★ {rating}</span></button><h3 className="movie-title" title={title}>{title}</h3><div className="movie-sub"><span>{year || 'Release date unknown'}</span><span>{(item.media_type || fallbackType) === 'tv' ? 'SERIES' : 'FILM'}</span></div></article>;
}

function DetailsDialog({ item, details, loading, region, theme, onRegionChange, onClose }: { item: MediaItem; details: MediaDetails | null; loading: boolean; region: string; theme: 'dark' | 'light'; onRegionChange: (region: string) => void; onClose: () => void }) {
  const [providerData, setProviderData] = useState<ProviderRegion | undefined>();
  const [providerLoading, setProviderLoading] = useState(false);
  const [trailers, setTrailers] = useState<MediaVideo[]>([]);
  const [trailersLoading, setTrailersLoading] = useState(false);
  const [trailerError, setTrailerError] = useState('');
  const [trailerRetry, setTrailerRetry] = useState(0);
  const [selectedTrailerId, setSelectedTrailerId] = useState('');
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<SeasonDetails | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonError, setSeasonError] = useState('');
  const type = (item.media_type || 'movie') as MediaType;
  const title = displayTitle(item);
  const detailsArt = item.backdrop_path ? `linear-gradient(0deg,${theme === 'light' ? '#fffdf9' : '#111214'} 3%,${theme === 'light' ? '#fffdf900' : '#11121400'} 100%),linear-gradient(90deg,${theme === 'light' ? '#fffdf978' : '#11121477'},transparent),url("${posterUrl(item.backdrop_path, 'w1280')}")` : undefined;
  useEffect(() => {
    const firstSeason = details?.seasons?.find((season) => season.season_number > 0) || details?.seasons?.[0];
    setSeasonNumber(type === 'tv' ? firstSeason?.season_number ?? null : null);
    setEpisodeNumber(null);
    setSeasonDetails(null);
  }, [item.id, type, details?.id]);
  useEffect(() => {
    if (type !== 'tv' || seasonNumber === null) {
      setSeasonDetails(null);
      setEpisodeNumber(null);
      setSeasonLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setSeasonLoading(true);
    setSeasonError('');
    setSeasonDetails(null);
    setEpisodeNumber(null);
    api.season(item.id, seasonNumber, controller.signal)
      .then((season) => {
        if (!active) return;
        setSeasonDetails(season);
        setEpisodeNumber(season.episodes?.[0]?.episode_number ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSeasonError(error instanceof Error ? error.message : 'Could not load season details.');
      })
      .finally(() => { if (active) setSeasonLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [item.id, seasonNumber, type]);
  useEffect(() => {
    const controller = new AbortController();
    setProviderData(undefined);
    setProviderLoading(true);
    api.providers(type, item.id, controller.signal)
      .then((response) => setProviderData(response.results?.[region]))
      .catch(() => setProviderData(undefined))
      .finally(() => setProviderLoading(false));
    return () => controller.abort();
  }, [item.id, region, type]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setTrailers([]);
    setSelectedTrailerId('');
    setTrailerError('');
    setTrailersLoading(true);
    api.videos(type, item.id, controller.signal)
      .then((response) => {
        if (!active) return;
        const official = (response.results || [])
          .filter((video) => video.official && video.site === 'YouTube' && Boolean(video.key) && (/^(trailer|teaser)$/i.test(video.type.trim()) || /\b(trailer|teaser)\b/i.test(video.name)))
          .filter((video, index, all) => all.findIndex((candidate) => candidate.key === video.key) === index)
          .sort((a, b) => trailerOrder(a) - trailerOrder(b) || (a.published_at || '').localeCompare(b.published_at || ''));
        setTrailers(official);
        setSelectedTrailerId(official[0]?.id || '');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTrailers([]);
        setTrailerError(error instanceof Error ? error.message : 'Could not load trailers.');
      })
      .finally(() => { if (active) setTrailersLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [item.id, trailerRetry, type]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('dialog-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('dialog-open'); };
  }, [onClose]);
  const providers = [ ...(providerData?.flatrate || []), ...(providerData?.free || []), ...(providerData?.ads || []), ...(providerData?.rent || []), ...(providerData?.buy || []) ];
  const uniqueProviders = [...new Map(providers.map((provider) => [provider.provider_id, provider])).values()];
  const selectedTrailer = trailers.find((video) => video.id === selectedTrailerId) || trailers[0];
  const trailerOptions = useMemo(() => labelTrailers(trailers), [trailers]);
  const seasonChoices = (details?.seasons || []).map((season) => ({ value: String(season.season_number), label: season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`, detail: `${season.episode_count} episodes${season.air_date ? ` · ${season.air_date.slice(0, 4)}` : ''}` }));
  const episodeChoices = (seasonDetails?.episodes || []).map((episode) => ({ value: String(episode.episode_number), label: `Episode ${episode.episode_number}`, detail: episode.name || 'Episode details unavailable' }));
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="details-dialog" role="dialog" aria-modal="true" aria-labelledby="details-title"><button className="close-dialog" onClick={onClose} aria-label="Close details">×</button><div className="details-art" style={detailsArt ? { backgroundImage: detailsArt } : undefined}/><div className="details-content"><div className="section-kicker">{type === 'tv' ? 'SERIES' : 'FEATURE FILM'} {releaseYear(item) && `· ${releaseYear(item)}`}</div><h2 id="details-title">{title}</h2>{details?.genres?.length ? <div className="genre-list">{details.genres.map((genre) => <span key={genre.id}>{genre.name}</span>)}</div> : null}<p className="details-overview">{loading ? 'Loading title details…' : details?.overview || item.overview || 'No overview is available.'}</p>{type === 'tv' && details && <p className="details-facts">{details.number_of_seasons ?? '—'} seasons <i/> {details.number_of_episodes ?? '—'} episodes</p>}<div className="details-play-action">{type === 'tv' && <div className="episode-picker"><ChoiceDropdown caption="SEASON" value={seasonNumber === null ? '' : String(seasonNumber)} options={seasonChoices} placeholder="Choose season" disabled={loading || seasonChoices.length === 0} onSelect={(value) => { setSeasonNumber(Number(value)); setEpisodeNumber(null); }}/><ChoiceDropdown caption="EPISODE" value={episodeNumber === null ? '' : String(episodeNumber)} options={episodeChoices} placeholder={seasonLoading ? 'Loading episodes…' : 'Choose episode'} disabled={seasonLoading || episodeChoices.length === 0} onSelect={(value) => setEpisodeNumber(Number(value))}/></div>}{type === 'tv' && seasonError && <span className="season-error">{seasonError}</span>}<VideoPlayer mode="dialog" mediaId={item.id} mediaType={type} title={title} seasonId={type === 'tv' ? seasonNumber ?? undefined : undefined} episodeId={type === 'tv' ? episodeNumber ?? undefined : undefined} disabled={type === 'tv' && (seasonLoading || seasonNumber === null || episodeNumber === null)} buttonLabel={type === 'tv' ? 'Play episode' : 'Play movie'}/></div>
      <section className="trailer-section" aria-label="Official trailers"><div className="provider-heading"><div><div className="section-kicker">OFFICIAL TRAILERS</div><h3>Take a first look</h3></div>{trailerOptions.length > 1 && <TrailerPicker options={trailerOptions} selectedId={selectedTrailerId} onSelect={setSelectedTrailerId}/>}</div>{trailersLoading ? <div className="provider-loading"><span className="tiny-loader"/> Finding official trailers…</div> : trailerError ? <p className="no-providers trailer-error">{trailerError} <button onClick={() => setTrailerRetry((value) => value + 1)}>Try again ↻</button></p> : selectedTrailer ? <VideoPlayer key={selectedTrailer.id} mediaId={item.id} mediaType={type} title={selectedTrailer.name} videoKey={selectedTrailer.key}/> : <p className="no-providers">No official YouTube trailer is listed for this title.</p>}</section>
      <div className="provider-heading"><div><div className="section-kicker">WHERE TO WATCH</div><h3>Available in {REGION_NAMES[region] || region}</h3></div><div className="details-region-picker"><label htmlFor="details-region">YOUR REGION</label><select id="details-region" value={region} onChange={(event) => onRegionChange(event.target.value)}><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option></select>{providerData?.link && <a href={providerData.link} target="_blank" rel="noreferrer">All options ↗</a>}</div></div>
      {providerLoading ? <div className="provider-loading"><span className="tiny-loader"/> Checking provider listings…</div> : uniqueProviders.length ? <div className="provider-list">{uniqueProviders.map((provider) => <a className="provider" key={provider.provider_id} href={providerData?.link || 'https://www.themoviedb.org'} target="_blank" rel="noreferrer" title={`Find ${title} on ${provider.provider_name}`}>{provider.logo_path ? <img src={posterUrl(provider.logo_path, 'w92')} alt=""/> : <span>{provider.provider_name.slice(0, 1)}</span>}<b>{provider.provider_name}</b></a>)}</div> : <p className="no-providers">No provider listing is currently available for this title and region. Check back later or choose another region.</p>}
      <p className="provider-footnote">Availability provided by JustWatch through TMDB; it can change. Provider links open their listing on TMDB.</p></div></section></div>;
}

function labelTrailers(videos: MediaVideo[]) {
  const counts = { trailer: 0, teaser: 0, final: 0, international: 0, redBand: 0 };
  return videos.map((video) => {
    const name = video.name.toLowerCase();
    let label: string;
    if (name.includes('final')) {
      counts.final += 1;
      label = counts.final === 1 ? 'Final Trailer' : `Final Trailer ${counts.final}`;
    } else if (name.includes('red band')) {
      counts.redBand += 1;
      label = counts.redBand === 1 ? 'Red Band Trailer' : `Red Band Trailer ${counts.redBand}`;
    } else if (name.includes('international')) {
      counts.international += 1;
      label = counts.international === 1 ? 'International Trailer' : `International Trailer ${counts.international}`;
    } else if (/teaser/i.test(video.type) || name.includes('teaser')) {
      counts.teaser += 1;
      label = `Teaser ${counts.teaser}`;
    } else {
      counts.trailer += 1;
      label = `Trailer ${counts.trailer}`;
    }
    return { video, label };
  });
}

function trailerOrder(video: MediaVideo) {
  const name = `${video.type} ${video.name}`.toLowerCase();
  if (name.includes('teaser')) return 0;
  if (name.includes('final')) return 3;
  if (name.includes('international') || name.includes('red band')) return 2;
  return 1;
}

interface ChoiceOption { value: string; label: string; detail?: string }

function ChoiceDropdown({ caption, value, options, placeholder, disabled = false, onSelect }: { caption: string; value: string; options: ChoiceOption[]; placeholder: string; disabled?: boolean; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, []);
  return <div className={`tmdb-choice ${open ? 'is-open' : ''}`} ref={rootRef}>
    <span className="tmdb-choice-caption">{caption}</span>
    <button className="tmdb-choice-trigger" type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={`Select ${caption.toLowerCase()}`} onClick={() => setOpen((state) => !state)}>
      <span>{selected?.label || placeholder}</span><span className="tmdb-choice-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="tmdb-choice-menu" role="listbox" aria-label={caption}>{options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className="tmdb-choice-option" onClick={() => { onSelect(option.value); setOpen(false); }}><span className="tmdb-choice-copy"><b>{option.label}</b>{option.detail && <small>{option.detail}</small>}</span><span className="tmdb-choice-check">{option.value === value ? '✓' : ''}</span></button>)}</div>}
  </div>;
}

function TrailerPicker({ options, selectedId, onSelect }: { options: ReturnType<typeof labelTrailers>; selectedId: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.video.id === selectedId) || options[0];

  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (options.length < 2) return null;
  return <div className={`trailer-picker ${open ? 'is-open' : ''}`} ref={rootRef}>
    <button className="trailer-picker-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-label="Choose a trailer" onClick={() => setOpen((value) => !value)}>
      <span className="picker-overline">SELECT PREVIEW</span><span className="picker-current">{selected.label}</span><span className="picker-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="trailer-picker-menu" role="listbox" aria-label="Available trailers">{options.map(({ video, label }) => <button key={video.id} type="button" role="option" aria-selected={video.id === selected.video.id} className="trailer-picker-option" onClick={() => { onSelect(video.id); setOpen(false); }} title={video.name}><span className="option-play">▶</span><span className="option-label">{label}<small>{video.type}</small></span><span className="option-check">{video.id === selected.video.id ? '✓' : ''}</span></button>)}</div>}
  </div>;
}

export default App;
