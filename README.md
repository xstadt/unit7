# dillonstadt.com

The desktop shell plus prerendered pages for every frame. Content comes from Sanity
project `q3gdj37a`, dataset `production` — public, read straight over HTTPS, no token
anywhere in this repo.

## Two halves, on purpose

| What | Where | How it gets content |
| --- | --- | --- |
| The desktop at `/` | `public/index.html` | Fetches Sanity **live** in the browser on load. Publish in Sanity, refresh, it's there — no rebuild. |
| A page per frame at `/frames/<slug>` | `src/pages/frames/[slug].astro` | Prerendered at **build time**. Needs a rebuild to pick up new frames. |

The desktop is a plain static file, so Astro serves it untouched. Astro only builds the
frame pages — those exist so links are shareable and Google has something to index,
which a windowed desktop can't offer on its own.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
```

`http://localhost:4321` needs to be in Sanity's CORS origins (Manage → API) or the
desktop will load empty while the frame pages still build fine.

## Deploy

Vercel auto-detects Astro. Framework preset **Astro**, build `npm run build`, output
`dist`. Nothing to configure beyond that — there are no environment variables.

## Rebuild when you publish

Frame pages are static, so new photos won't appear at `/frames/...` until the site
rebuilds. Wire it up once:

1. Vercel → Settings → Git → **Deploy Hooks** → create one, copy the URL
2. Sanity → Manage → API → **Webhooks** → add it, trigger on create/update/delete
   of `frame`, method POST

Publishing then rebuilds the frame pages automatically. The desktop updates either way.

## Adding photos

Use the ingest script in the main project — it reads EXIF, prompts for album and title,
and uploads. Genres must exist in Sanity before frames can reference them.
