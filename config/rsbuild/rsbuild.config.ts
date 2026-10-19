import type {RsbuildConfig} from '@rsbuild/core';

import {defineConfig} from '@rsbuild/core';
import {ReactRefreshRspackPlugin} from '@rspack/plugin-react-refresh';
import fs from 'fs';
import path from 'path';
import portfinder from 'portfinder';
import {fileURLToPath} from 'url';

import type Environment from './types.ts';

// @ts-expect-error -- Can't use .ts extensions without allowImportingTsExtensions in tsconfig
import getCommonConfiguration from './rsbuild.common.ts';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const BASE_PORT = 8082;

let envFile: Environment['file'] = '.env';
switch (process.env.ENV) {
    case 'production':
        envFile = '.env.production';
        break;
    case 'staging':
        envFile = '.env.staging';
        break;
    case 'adhoc':
        envFile = '.env.adhoc';
        break;
    default:
        envFile = '.env';
}

export default defineConfig(async ({command}) => {
    const isDevServer = command === 'dev';
    const common: RsbuildConfig = await getCommonConfiguration({file: envFile, platform: 'web', isDevServer});

    if (!isDevServer) {
        return {
            ...common,
            performance: {
                ...common.performance,
                // Invalidate the persistent cache (enabled in rsbuild.common.ts) if this config file
                // itself changes, same as the dev-server branch below.
                buildCache: {buildDependencies: [filename]},
            },
        };
    }

    // By default `npm run web` serves the app through the NewDot Cloudflare Worker (web/cloudflare-worker), so local
    // development runs with the same CSP, security headers and routing as staging and production. The Worker owns the
    // public origin (https://dev.new.expensify.com:8082, started by web/startWebWorker.ts) and proxies to this dev
    // server, which listens on plain HTTP on an internal port. USE_CLOUDFLARE_WORKER=false restores the direct setup.
    const useCloudflareWorker = process.env.USE_CLOUDFLARE_WORKER !== 'false';
    const publicPort = Number(process.env.WEB_PORT ?? BASE_PORT);
    const internalPort = Number(process.env.WEB_INTERNAL_PORT ?? BASE_PORT + 1);
    const port = useCloudflareWorker ? internalPort : await portfinder.getPortPromise({port: BASE_PORT});
    // Check if the USE_WEB_PROXY variable has been provided and rewrite any requests to the local proxy server
    const proxy = process.env.USE_WEB_PROXY === 'false' ? undefined : [{pathFilter: ['/api', '/staging', '/chat-attachments', '/receipts'], target: 'http://[::1]:9000'}];

    const commonRspackTool = common.tools?.rspack;

    const devConfig: RsbuildConfig = {
        ...common,
        dev: {
            client: {
                overlay: false,
                // The page is served from the Worker's origin, which proxies WebSocket upgrades back to this server,
                // so the HMR client must connect there instead of to this server's own host and port.
                ...(useCloudflareWorker && {protocol: 'wss', host: 'dev.new.expensify.com', port: String(publicPort)}),
            },
            lazyCompilation: false,
        },
        source: {
            ...common.source,
            define: {
                ...common.source?.define,
                // The port of the origin the app is reached on: the Worker's port, or, without the Worker, the dev
                // server's resolved port (which can differ from BASE_PORT if 8082 is already in use).
                // CONFIG.DEV_PORT (src/CONFIG.ts) reads this at runtime to build correct dev environment URLs.
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'process.env.PORT': useCloudflareWorker ? publicPort : port,
            },
        },
        server: {
            proxy,
            port,
            host: useCloudflareWorker ? 'localhost' : 'dev.new.expensify.com',
            // Rsbuild's --open flag defaults to the first entry's route, e.g. "/main" for our "main" entry key,
            // which 404s since the app has no route by that name. Open the actual app root instead — on the Worker's
            // origin when it is in front of this server.
            open: useCloudflareWorker ? `https://dev.new.expensify.com:${publicPort}/` : '/',
            // Behind the Worker the dev server is a local-only upstream, and the Worker terminates TLS with these
            // same certificates (web/startWebWorker.ts), so the browser still sees HTTPS.
            ...(!useCloudflareWorker && {
                https: {
                    key: fs.readFileSync(path.join(dirname, 'key.pem')),
                    cert: fs.readFileSync(path.join(dirname, 'certificate.pem')),
                },
            }),
            headers: {
                // HTTP header names aren't valid camelCase identifiers.
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Document-Policy': 'js-profiling',
            },
        },
        performance: {
            ...common.performance,
            buildCache: {
                buildDependencies: [filename],
            },
        },
        tools: {
            ...common.tools,
            rspack: (config, utils) => {
                // See the equivalent cast in rsbuild.common.ts for why the Promise branch is discarded here.
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                const afterCommon = (typeof commonRspackTool === 'function' ? (commonRspackTool(config, utils) ?? config) : config) as typeof config;

                afterCommon.plugins ??= [];
                afterCommon.plugins.push(new ReactRefreshRspackPlugin());

                return afterCommon;
            },
        },
    };

    return devConfig;
});
