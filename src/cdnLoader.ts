import { ISystemModule, ISystemPlugin } from './';
import { supportsDynamicImport } from './featureDetection';

const ESM_CDN_URL = 'https://dev.jspm.io';
// const SYSTEM_CDN_URL = 'https://system-dev.jspm.io';

export const CDN_PREFIX = 'npm:';

// import { supportsDynamicImport } from './featureDetection';

function createEsmCdnLoader(): ISystemPlugin {
    return {
        fetch() {
            return '';
        },

        instantiate(load: ISystemModule) {
            const url =
                load.address.indexOf(CDN_PREFIX) !== 0
                    ? load.address
                    : `${ESM_CDN_URL}/${load.address.slice(CDN_PREFIX.length)}`;

            // @ts-ignore
            return import(url).then(esModule => {
                let module = esModule;

                // only default export -> copy named exports down
                if ('default' in module && Object.keys(module).length === 1) {
                    module = Object.create(null);

                    // etc should aim to replicate Module object properties
                    Object.defineProperty(module, Symbol.toStringTag, {
                        value: 'module',
                    });

                    module.default = esModule.default;

                    for (const namedExport of Object.keys(esModule.default)) {
                        if (namedExport === 'default') {
                            continue;
                        }

                        const value = esModule.default[namedExport];

                        module[namedExport] =
                            typeof value === 'function'
                                ? value.bind(esModule.default)
                                : value;
                    }
                }

                // this line shouldn't be necessary... let me post a SystemJS fix
                Object.defineProperty(module, '__esModule', {
                    value: true,
                });

                return module;
            });
        },
    };
}

function createSystemCdnLoader(): ISystemPlugin {
    throw new Error('SystemJS-based cdn loader is not yet supported');
}

export function createCdnLoader(): ISystemPlugin {
    return supportsDynamicImport()
        ? createEsmCdnLoader()
        : createSystemCdnLoader();
}
