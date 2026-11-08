# Afterglow

Afterglow is a React + TypeScript app built with Vite. TMDB powers movie and TV search, popular listings, posters, details, and regional watch availability. Playback is handed off to the provider through the listing link; this app does not fetch, extract, host, or proxy video streams.

## Requirements

- Node.js 20 or newer
- A TMDB API Read Access Token

Create a TMDB account, request an API token from the account's API settings, then copy `.env.example` to `.env` and set `TMDB_ACCESS_TOKEN`. The token stays on the server and is not exposed to the browser. The default region is India (`IN`); set `VITE_TMDB_REGION` to `US`, `GB`, `CA`, or `AU` to change the initial region.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The Vite development server proxies `/api` requests to the local Express API on port 8787. Don’t open `index.html` directly; it now shows a local setup message because the app requires the API server.

For a production build, use `npm run build` and then `npm start`. The Express server serves the generated `dist` site and its API from the same origin.

## API routes

- `GET /api/catalog?type=movie|tv&page=1` — popular TMDB discover results
- `GET /api/search?query=...` — movie and TV title search
- `GET /api/details/:type/:id` — title details by TMDB media ID
- `GET /api/series/:seriesId/seasons/:seasonNumber` — TMDB season details and episode list
- `GET /api/providers/:type/:id` — regional watch providers and TMDB listing link
- `GET /api/videos/:type/:id` — movie or TV video metadata for official YouTube trailers

The app defaults watch availability to the viewer's selected region. Listings can be incomplete or change over time. Provider links open the corresponding TMDB listing, where current availability can be checked. Title details also include official YouTube trailers returned by TMDB's movie/TV videos endpoints. Only entries marked official by TMDB and hosted on YouTube are shown; the player loads when the viewer presses Play.

Playback is encapsulated in `src/components/VideoPlayer.tsx`. Set `VITE_STREAM_URL` in `.env` to the embed base URL. The component constructs movie URLs as `BASE/movie/movieId` and series URLs as `BASE/tv/seriesId/seasonNumber/episodeNumber`. The series ID comes from the selected TMDB title, while season and episode are the selected TMDB season and episode numbers. Restart Vite after changing `.env`. Vite embeds `VITE_` variables in the client bundle, so this value should be a public base URL and must not contain a secret.

## Attribution and terms

The app includes TMDB's required API notice and logo link in its About section. TMDB API usage is free for non-commercial projects with attribution; commercial use requires contacting TMDB. The regional streaming availability data is supplied through TMDB's JustWatch partnership and the app credits JustWatch. Review the current [TMDB API FAQ](https://developer.themoviedb.org/docs/faq), [watch provider API documentation](https://developer.themoviedb.org/reference/movie-watch-providers), and [TMDB terms](https://www.themoviedb.org/terms-of-use) before launch.

The requested `vidsrc.ts` project describes itself as a proof-of-concept extractor. This app does not integrate it or expose extracted stream URLs. It uses TMDB's provider listings so users can continue to the listed services.
