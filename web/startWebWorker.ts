import {spawn} from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config();

if (process.env.USE_CLOUDFLARE_WORKER === 'false') {
    process.stdout.write('Skipping the Cloudflare Worker as USE_CLOUDFLARE_WORKER was set to false.\n');
    process.exit();
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, '..');
const workerDir = path.join(rootDir, 'web', 'cloudflare-worker');

// The origin the browser opens. The rsbuild dev server (config/rsbuild/rsbuild.config.ts) reads the same variables,
// so the Worker and the dev server always agree on both ports.
const publicPort = process.env.WEB_PORT ?? '8082';
const internalPort = process.env.WEB_INTERNAL_PORT ?? '8083';

/**
 * Runs the NewDot Cloudflare Worker (web/cloudflare-worker) in workerd via `wrangler dev`, in front of the rsbuild
 * dev server. It applies the same CSP, security headers and routing as staging and production, with the
 * development-only additions from its `development` environment. TLS uses the same mkcert certificates as the dev
 * server did before (`npm run setup-https`).
 */
const wrangler = spawn(
    'npx',
    [
        'wrangler',
        'dev',
        '--env',
        'development',
        '--port',
        publicPort,
        '--local-protocol',
        'https',
        '--https-key-path',
        path.join(rootDir, 'config', 'rsbuild', 'key.pem'),
        '--https-cert-path',
        path.join(rootDir, 'config', 'rsbuild', 'certificate.pem'),
        '--var',
        `DEV_SERVER_ORIGIN:http://localhost:${internalPort}`,
    ],
    {cwd: workerDir, stdio: 'inherit'},
);

wrangler.on('exit', (code) => process.exit(code ?? 0));
