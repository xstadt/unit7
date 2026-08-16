import { defineConfig } from 'astro/config';

// The desktop shell itself is public/index.html — a static file served at /.
// Astro's job here is the prerendered frame pages under /frames/<slug>.
export default defineConfig({
  site: 'https://dillonstadt.com',
  server: { port: 4321 }
});
