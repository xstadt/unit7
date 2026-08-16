// Build-time Sanity reads. No SDK, no token — the production dataset is public,
// so a plain fetch is all this needs. Mirrors content/sanity.js on the client side.

export const CONFIG = {
  projectId: 'q3gdj37a',
  dataset: 'production',
  apiVersion: '2026-08-01'
};

export async function query(groq, params) {
  const url = new URL(
    'https://' + CONFIG.projectId + '.apicdn.sanity.io/v' + CONFIG.apiVersion +
    '/data/query/' + CONFIG.dataset
  );
  url.searchParams.set('query', groq);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set('$' + k, JSON.stringify(v)));
  const res = await fetch(url);
  if (!res.ok) throw new Error('Sanity ' + res.status + ' ' + res.statusText + ' — is the dataset still public?');
  return (await res.json()).result;
}

// Asset ids look like: image-<hash>-<width>x<height>-<ext>
export function imageUrl(ref, opts) {
  if (!ref) return '';
  const [, id, dims, ext] = ref.split('-');
  const base = 'https://cdn.sanity.io/images/' + CONFIG.projectId + '/' + CONFIG.dataset + '/' + id + '-' + dims + '.' + ext;
  const q = new URLSearchParams({ auto: 'format', q: '82' });
  if (opts && opts.w) q.set('w', String(opts.w));
  if (opts && opts.h) q.set('h', String(opts.h));
  if (opts && opts.fit) q.set('fit', opts.fit);
  return base + '?' + q.toString();
}

export const FRAMES_QUERY = `*[_type == "frame" && defined(image.asset) && defined(slug.current)]
  | order(coalesce(shotAt, _createdAt) desc){
  "slug": slug.current,
  title, place, shotAt, _createdAt, focal, "ap": aperture, shutter, iso, gear,
  "alt": image.alt,
  "genre": genre->{ name, "slug": slug.current, code, "color": color.hex },
  "asset": image.asset->{
    "ref": _id,
    "lqip": metadata.lqip,
    "w": metadata.dimensions.width,
    "h": metadata.dimensions.height
  }
}`;
