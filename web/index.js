/**
 * Web-only entry point. The shared `index.js` at the repo root is also consumed by native builds,
 * so the font stylesheet import lives here: the bundler resolves each `url()` in `fonts.css` to the
 * same content-hashed font asset the charts import, so every font ships under a single URL instead
 * of also being copied verbatim to `/fonts/`. See `config/rsbuild/rsbuild.common.ts`.
 */
import '../assets/css/fonts.css';
import '../index.js';
