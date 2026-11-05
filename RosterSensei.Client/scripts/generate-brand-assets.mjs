// Renders the PNG icons and the social sharing image in public/ from public/favicon.svg.
// Run it again whenever the logo changes:
//   npx -p playwright@1.56.1 playwright install chromium   (first time only)
//   npx -p playwright@1.56.1 node scripts/generate-brand-assets.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const logo = readFileSync(join(publicDir, 'favicon.svg'), 'utf8');
const kanjiPaths = [...readFileSync(join(root, 'src/components/brand/sensei-kanji.tsx'), 'utf8').matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
const font = file => `data:font/woff2;base64,${readFileSync(join(root, 'node_modules', file)).toString('base64')}`;

// Dark theme tokens from src/styles/tokens.css.
const CANVAS = '#0e0b0c';
const FG = '#f7f3ef';
const FG_MUTED = '#bdb3b5';
const ACCENT_TEXT = '#ff8496';

const page = (width, height, body) => `<!doctype html><html><head><style>
@font-face { font-family: 'Zen Kaku Gothic New'; font-weight: 900; src: url(${font('@fontsource/zen-kaku-gothic-new/files/zen-kaku-gothic-new-latin-900-normal.woff2')}); }
@font-face { font-family: 'Inter'; font-weight: 100 900; src: url(${font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}); }
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }
svg { display: block; }
</style></head><body>${body}</body></html>`;

// The logo centred on a square, at `scale` of its width.
const icon = (size, scale, background) => page(size, size, `
<div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:${background ?? 'transparent'}">
  <div style="width:${size * scale}px;height:${size * scale}px">${logo.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
</div>`);

const ogImage = page(1200, 630, `
<div style="position:relative;width:1200px;height:630px;background:${CANVAS};overflow:hidden;font-family:Inter;font-weight:500">
  <div style="position:absolute;right:-90px;top:-70px;width:560px;height:560px">
    ${logo.replace('<svg ', '<svg width="100%" height="100%" ')}
    <svg viewBox="0 0 1000 2000" fill="#fff" style="position:absolute;left:50%;top:13%;width:76px;height:152px;transform:translateX(-50%)">
      ${kanjiPaths.map(d => `<path d="${d}"/>`).join('')}
    </svg>
  </div>
  <div style="position:absolute;left:80px;bottom:88px;right:560px">
    <div style="font-family:'Zen Kaku Gothic New';font-weight:900;font-size:96px;line-height:1;letter-spacing:-0.025em;color:${FG}">Roster <span style="color:${ACCENT_TEXT}">Sensei</span></div>
    <div style="margin-top:28px;font-size:30px;line-height:1.35;color:${FG_MUTED}">Schedule praccs, log every map and see where your CS2 team wins.</div>
  </div>
</div>`);

const outputs = [
    { file: 'icon-192.png', size: 192, html: icon(192, 1) },
    { file: 'icon-512.png', size: 512, html: icon(512, 1) },
    // Maskable icons are cropped to a circle as small as 80% of the width.
    { file: 'icon-maskable-512.png', size: 512, html: icon(512, 0.62, CANVAS) },
    // iOS fills transparency with black and rounds the corners itself.
    { file: 'apple-touch-icon.png', size: 180, html: icon(180, 0.78, CANVAS) },
    { file: 'og-image.png', width: 1200, height: 630, html: ogImage },
];

const browser = await chromium.launch();
for (const { file, size, width = size, height = size, html } of outputs) {
    const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await tab.setContent(html);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(publicDir, file), omitBackground: true });
    await tab.close();
    console.log(`public/${file}`);
}
await browser.close();
