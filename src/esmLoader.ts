import { ISystemModule, ISystemPlugin } from './';

// import { supportsDynamicImport } from './featureDetection';

export function createEsmCdnLoader(): ISystemPlugin {
    return {
        fetch() {
            return '';
        },

        instantiate(load: ISystemModule) {
            return import(load.address).then(esModule =>
                addSyntheticDefaultExports(esModule)
            );
        },
    };
}

export function addSyntheticDefaultExports(esModule: {
    [key: string]: any;
}): { [key: string]: any } {
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

    return module;
}
