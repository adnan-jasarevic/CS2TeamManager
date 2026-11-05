# Roster Sensei: frontend

React 19, TypeScript, Vite, Tailwind CSS 4 and React Router 7.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
npm run lint
```

The app calls `https://localhost:7185/api` by default. To point it elsewhere, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`.

For a deployed build, set `VITE_SITE_URL` to the site's address too. Link previews need an absolute image URL, so the `og:image` tags are only added when it's set.

The PNG icons and `public/og-image.png` are rendered from `public/favicon.svg` by `scripts/generate-brand-assets.mjs`. Run it again after changing the logo; the commands are at the top of the script.

See the [main README](../README.md) for the backend and full setup.
