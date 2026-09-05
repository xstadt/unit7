// Sanity data source for the desktop shell. This is the ONLY source of albums,
// frames, field notes and site settings — the desktop ships with no content of
// its own, so an empty dataset means an empty desktop.

export const CONFIG = {
  projectId: 'q3gdj37a',    // live
  dataset: 'production',    // <- from you if not "production"
  apiVersion: '2026-08-01',  // date-pinned API version
  useCdn: true              // apicdn = cached edge reads; set false while editing
};

export function isConfigured() {
  return Boolean(CONFIG.projectId);
}

function endpoint(query, params) {
  const host = CONFIG.useCdn ? 'apicdn.sanity.io' : 'api.sanity.io';
  const url = new URL('https://' + CONFIG.projectId + '.' + host + '/v' + CONFIG.apiVersion + '/data/query/' + CONFIG.dataset);
  url.searchParams.set('query', query);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set('$' + k, JSON.stringify(v)));
  return url.toString();
}

async function run(query, params) {
  const res = await fetch(endpoint(query, params));
  if (!res.ok) throw new Error('Sanity ' + res.status + ' ' + res.statusText);
  const json = await res.json();
  return json.result;
}

// ---- Image URLs -------------------------------------------------------
// Sanity asset ids look like: image-<hash>-<width>x<height>-<ext>
export function imageUrl(ref, opts) {
  if (!ref) return '';
  const [, id, dims, ext] = ref.split('-');
  const base = 'https://cdn.sanity.io/images/' + CONFIG.projectId + '/' + CONFIG.dataset + '/' + id + '-' + dims + '.' + ext;
  const q = new URLSearchParams({ auto: 'format', fit: 'crop', q: '82' });
  if (opts && opts.w) q.set('w', String(opts.w));
  if (opts && opts.h) q.set('h', String(opts.h));
  return base + '?' + q.toString();
}

// ---- Queries ----------------------------------------------------------
export const GENRES_QUERY = `*[_type == "genre"] | order(order asc){
  "id": slug.current,
  name,
  code,
  "color": color.hex,
  "count": count(*[_type == "frame" && references(^._id)])
}`;

export const FRAMES_QUERY = `*[_type == "frame" && defined(image.asset)] | order(coalesce(shotAt, _createdAt) desc){
  "id": _id,
  "slug": slug.current,
  title,
  place,
  year,
  shotAt,
  _createdAt,
  focal,
  "ap": aperture,
  shutter,
  iso,
  "genre": genre->slug.current,
  "asset": image.asset->{
    "ref": _id,
    "lqip": metadata.lqip,
    "w": metadata.dimensions.width,
    "h": metadata.dimensions.height
  }
}`;

export const SETTINGS_QUERY = `*[_type == "siteSettings"][0]{
  name,
  tagline,
  email,
  "wallpaper": wallpaper.hex,
  defaultOpen,
  social[]{ label, url },
  links[]{ label, url }
}`;

export const NOTES_QUERY = `*[_type == "fieldNote"] | order(publishedAt desc)[0...20]{
  "id": _id, title, "slug": slug.current, dek, readingMinutes, place,
  "date": publishedAt,
  "body": body[_type == "block"].children[].text
}`;

function yearOf(iso) {
  if (!iso) return '';
  const y = new Date(iso).getFullYear();
  return isNaN(y) ? '' : y;
}

// ---- Normalisation ----------------------------------------------------
// Returns the exact shape the desktop already uses, so nothing downstream changes.
export async function fetchCatalog() {
  const [genres, frames, notes, settings] = await Promise.all([
    run(GENRES_QUERY),
    run(FRAMES_QUERY),
    run(NOTES_QUERY).catch(() => []),
    run(SETTINGS_QUERY).catch(() => null)
  ]);

  const perGenre = {};
  const normFrames = (frames || []).map(f => {
    const g = f.genre || 'str';
    perGenre[g] = (perGenre[g] || 0);
    const idx = perGenre[g]++;
    return {
      id: f.id,
      slug: f.slug,
      genre: g,
      idx,
      title: f.title || 'Untitled',
      place: f.place || '',
      year: f.year || yearOf(f.shotAt || f._createdAt),
      focal: f.focal || '',
      ap: f.ap || '',
      shutter: f.shutter || '',
      iso: f.iso || '',
      image: f.asset ? {
        thumb: imageUrl(f.asset.ref, { w: 600 }),
        full: imageUrl(f.asset.ref, { w: 1800 }),
        lqip: f.asset.lqip || '',
        w: f.asset.w,
        h: f.asset.h
      } : null
    };
  });

  return {
    genres: (genres || []).map(g => ({
      id: g.id, name: g.name, code: g.code,
      color: g.color || '#e77aa6',
      count: g.count || 0
    })),
    frames: normFrames,
    notes: notes || [],
    settings: settings || null
  };
}
