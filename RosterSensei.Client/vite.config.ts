import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Link previews need an absolute image URL, so these tags are only added once the site's
// address is known (VITE_SITE_URL, e.g. https://rostersensei.example).
function socialImageTags(siteUrl: string | undefined): Plugin {
    return {
        name: 'social-image-tags',
        transformIndexHtml() {
            if (!siteUrl) return [];
            const base = siteUrl.replace(/\/+$/, '');
            return [
                { tag: 'meta', attrs: { property: 'og:url', content: `${base}/` }, injectTo: 'head' },
                { tag: 'meta', attrs: { property: 'og:image', content: `${base}/og-image.png` }, injectTo: 'head' },
                { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
                { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
                { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Roster Sensei, a red sun cut into roster lines' }, injectTo: 'head' },
                { tag: 'meta', attrs: { name: 'twitter:image', content: `${base}/og-image.png` }, injectTo: 'head' },
            ];
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        tailwindcss(),
        socialImageTags(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL),
    ],
}))
