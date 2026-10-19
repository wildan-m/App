import type {Compilation, Compiler} from '@rspack/core';

type HtmlPluginBeforeEmitData = {
    html: string;
};

/**
 * A minimal, structural subset of `HtmlRspackPlugin`'s compilation hooks, mirroring
 * `RspackPreloadPlugin.ts`: only `beforeEmit` is used below, and the concrete plugin classes the
 * callers pass in come from different packages whose hook typings aren't structurally identical,
 * so `callback` is typed as `any` to keep their more specific `tap` signatures assignable.
 */
type HtmlPluginClass = {
    getCompilationHooks: (compilation: Compilation) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        beforeEmit: {tap: (name: string, callback: any) => void};
    };
};

type Options = {
    /**
     * Source file names (e.g. `ExpensifyNeue-Regular.woff2`) whose `/fonts/<name>` references in the
     * generated HTML should be rewritten to the content-hashed asset the bundler emitted for them.
     */
    fonts: string[];
    /** See the equivalent option on `RspackPreloadPlugin` for why callers must pass the class in. */
    htmlPlugin: HtmlPluginClass;
};

/**
 * Rewrites the fixed `/fonts/<name>` URLs in `web/index.html`'s inline `@font-face` rules to the
 * content-hashed URLs the bundler emitted for those fonts.
 *
 * The inline rules exist so the splash screen's fonts start downloading while the HTML is parsed
 * (see https://github.com/Expensify/App/pull/90773), but the fonts are only emitted under hashed
 * names (via `fonts.css` and `chartFontAssets.ts` imports), and the HTML plugin's template
 * parameters are evaluated before the compilation's assets exist, so the hashed names can only be
 * injected from a compilation hook that runs after asset emission.
 */
class RspackInlineFontUrlPlugin {
    private readonly options: Options;

    constructor(options: Options) {
        this.options = options;
    }

    apply(compiler: Compiler): void {
        compiler.hooks.compilation.tap(this.constructor.name, (compilation) => {
            const hooks = this.options.htmlPlugin.getCompilationHooks(compilation);
            hooks.beforeEmit.tap(this.constructor.name, (htmlPluginData: HtmlPluginBeforeEmitData) => {
                const publicPath = compilation.outputOptions.publicPath;
                const resolvedPublicPath = typeof publicPath === 'string' && publicPath !== 'auto' ? publicPath : '';
                const assetNames = compilation.getAssets().map((asset) => asset.name);

                for (const font of this.options.fonts) {
                    const lastDotIndex = font.lastIndexOf('.');
                    const stem = font.slice(0, lastDotIndex);
                    const extension = font.slice(lastDotIndex);
                    // Matches the emitted asset whether or not its filename carries a content hash
                    // (`ExpensifyNeue-Regular.woff2` or `ExpensifyNeue-Regular.<hash>.woff2`), while the
                    // anchored extension keeps `.map`/`.br` twins out.
                    const emittedNamePattern = new RegExp(`^${stem}(\\.[0-9a-zA-Z]+)?${extension.replace('.', '\\.')}$`);
                    const matches = assetNames.filter((name) => emittedNamePattern.test(name));
                    if (matches.length !== 1) {
                        throw new Error(`${this.constructor.name}: expected exactly one emitted asset for ${font}, found [${matches.join(', ')}]`);
                    }
                    // eslint-disable-next-line no-param-reassign
                    htmlPluginData.html = htmlPluginData.html.replaceAll(`/fonts/${font}`, `${resolvedPublicPath}${matches.at(0)}`);
                }

                return htmlPluginData;
            });
        });
    }
}

export default RspackInlineFontUrlPlugin;
