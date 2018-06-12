import { ISystemModule, ISystemPlugin } from './';
import { addSyntheticDefaultExports } from './syntheticImports';

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

export const supportsDynamicImport = true;
