import { IRuntime, ISystemModule, ISystemPlugin } from './';

interface CssTranspilerResult {
    css: string;
    map?: string;
    moduleFormat?: string;
    moduleSource?: string;
}
type CssTranspiler = (
    source: string,
    options: CssTranspilerOptions
) => CssTranspilerResult | Promise<CssTranspilerResult>;

export interface CssLoaderOptions {
    runtime: IRuntime;
}

interface CssTranspilerOptions {
    address: string;
    runtime: IRuntime;
}

// Todo create factory functions for less loader that takes in the runtime;

export function createCssLoader({ runtime }: CssLoaderOptions): ISystemPlugin {
    return {
        instantiate(load: ISystemModule) {
            if (typeof document === 'undefined') {
                return;
            }

            const style = document.createElement('style');

            style.type = 'text/css';
            style.innerHTML = load.metadata.style;

            document.head.appendChild(style);

            return {
                element: style,
                markup: load.metadata.style,
            };
        },
        translate(load: ISystemModule) {
            let transpiler: CssTranspiler;

            if (/\.css$/.test(load.address)) {
                transpiler = cssTranspiler;
            } else if (/\.less$/.test(load.address)) {
                transpiler = lessTranspiler;
            } else {
                throw new Error(
                    `Unexpected css transpilation request for '${load.address}'`
                );
            }

            return Promise.resolve(
                transpiler.call(this, load.source, {
                    address: load.address,
                    runtime,
                })
            ).then((result: CssTranspilerResult) => {
                load.metadata.style = result.css;
                load.metadata.styleSourceMap = result.map;

                if (result.moduleFormat) {
                    load.metadata.format = result.moduleFormat;
                }

                return result.moduleSource || '';
            });
        },
    };
}

function cssTranspiler(css: string): CssTranspilerResult {
    return { css };
}

function lessTranspiler(
    css: string,
    { address, runtime }: CssTranspilerOptions
): Promise<CssTranspilerResult> {
    return runtime
        .import('less/browser')
        .then((browser: any) => {
            const less = <LessStatic>browser(window, {});

            return less.render(css, {
                filename: address,
            });
        })
        .then(output => {
            return {
                css: output.css,
                map: output.map,

                // style plugins can optionally return a modular module
                // source as well as the stylesheet above
                moduleSource: null,
                moduleFormat: null,
            };
        });
}
