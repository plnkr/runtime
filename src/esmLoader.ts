import { ISystemModule, ISystemPlugin } from '.';
import { addSyntheticDefaultExports } from './syntheticImports';

// import { supportsDynamicImport } from './featureDetection';

export interface IEsmLoaderOptions {
    cssLoader: ISystemPlugin;
}

export function createEsmCdnLoader({
    cssLoader,
}: IEsmLoaderOptions): ISystemPlugin {
    return {
        fetch(load) {
            if (load.address.match(/\.(?:css|less)$/)) {
                load.metadata.instantiate = cssLoader.instantiate.bind(
                    cssLoader
                );
                load.metadata.translate = cssLoader.translate.bind(cssLoader);

                return fetch(load.address).then(res => res.text());
            }

            return '';
        },

        instantiate(load: ISystemModule) {
            if (load.metadata.instantiate)
                return load.metadata.instantiate(load);

            return dynamicImport(load.address).then(esModule =>
                addSyntheticDefaultExports(esModule)
            );
        },

        translate(load) {
            if (load.metadata.translate) return load.metadata.translate(load);

            return load.source;
        },
    };
}

export type DynamicImport = (spec: string) => Promise<any>;

export const dynamicImport = <DynamicImport>(() => {
    try {
        return new Function('spec', 'return import(spec)');
    } catch (__) {
        return null;
    }
})();
