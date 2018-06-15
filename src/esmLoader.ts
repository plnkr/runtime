import { ISystemModule, ISystemPlugin } from './';
import { addSyntheticDefaultExports } from './syntheticImports';

// import { supportsDynamicImport } from './featureDetection';

export function createEsmCdnLoader(): ISystemPlugin {
    return {
        fetch() {
            return '';
        },

        instantiate(load: ISystemModule) {
            return dynamicImport(load.address).then(esModule =>
                addSyntheticDefaultExports(esModule)
            );
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
