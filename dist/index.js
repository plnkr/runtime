import convertRange from 'sver/convert-range';
import SystemJS from 'systemjs';
import { createEsmCdnLoader, addSyntheticDefaultExports } from './esmLoader';
import { supportsDynamicImport } from './featureDetection';
import { createLocalLoader } from './localLoader';
import { createTranspiler } from './transpiler';
const ESM_CDN_URL = 'https://dev.jspm.io';
const SYSTEM_CDN_URL = 'https://system-dev.jspm.io';
const TYPESCRIPT_VERSION = '2.8';
export class Runtime {
    constructor({ 
    // defaultExtensions = ['.js', '.ts', '.jsx', '.tsx'],
    runtimeHost, system = new SystemJS.constructor(), transpiler, }) {
        // // this.defaultExtensions = defaultExtensions;
        this.esmLoader = createEsmCdnLoader();
        this.localLoader = createLocalLoader({ runtimeHost });
        this.localRoot = system.baseURL.replace(/^([a-zA-Z]+:\/\/)([^/]*)\/.*$/, '$1$2');
        this.runtimeHost = runtimeHost;
        this.system = system;
        this.transpiler =
            transpiler === false
                ? null
                : transpiler ||
                    createTranspiler({
                        createRuntime,
                        runtimeHost,
                        typescriptVersion: TYPESCRIPT_VERSION,
                    });
        this.useEsm =
            !window.PLNKR_RUNTIME_USE_SYSTEM && supportsDynamicImport();
        this.system.registry.set('@runtime-loader-esm', system.newModule(this.esmLoader));
        this.system.registry.set('@runtime-loader-local', system.newModule(this.localLoader));
        if (this.transpiler) {
            this.system.registry.set('@runtime-transpiler', system.newModule(this.transpiler));
        }
        this.system.config({
            meta: {
                [`${this.localRoot}/*`]: {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-local',
                },
                [`${ESM_CDN_URL}/*`]: {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-esm',
                },
            },
            transpiler: this.transpiler ? '@runtime-transpiler' : false,
        });
        this.system.trace = true;
    }
    import(entrypointPath) {
        return this.buildConfig()
            .then(config => {
            this.system.config(config);
            return this.system.import(entrypointPath);
        })
            .then(addSyntheticDefaultExports);
    }
    buildConfig() {
        const config = this.system.getConfig();
        config.map = {};
        const dependencies = Object.create(null);
        return Promise.resolve(this.runtimeHost.getFileContents('package.json')).then(pkgJsonStr => {
            if (pkgJsonStr) {
                try {
                    const pkgJson = JSON.parse(pkgJsonStr);
                    Object.assign(dependencies, pkgJson.devDependencies || {});
                    Object.assign(dependencies, pkgJson.dependencies || {});
                }
                catch (e) {
                    // Do nothing
                }
            }
            const baseUrl = this.useEsm ? ESM_CDN_URL : SYSTEM_CDN_URL;
            for (const name in dependencies) {
                const range = dependencies[name];
                const pkgId = `${baseUrl}/${name}${createJspmRange(range)}`;
                config.map[name] = pkgId;
            }
            return config;
        });
    }
}
function createJspmRange(semverRange) {
    const range = convertRange(semverRange);
    let versionString = '';
    if (range.isExact)
        versionString = '@' + range.version.toString();
    else if (range.isStable)
        versionString = '@' + range.version.major + '.' + range.version.minor;
    else if (range.isMajor)
        versionString = '@' + range.version.major;
    return versionString;
}
function createRuntime(options) {
    return new Runtime(options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxZQUFZLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBRWhDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRWhELE1BQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDO0FBQzFDLE1BQU0sY0FBYyxHQUFHLDRCQUE0QixDQUFDO0FBQ3BELE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0FBZ0RqQyxNQUFNO0lBVUYsWUFBWTtJQUNSLHNEQUFzRDtJQUN0RCxXQUFXLEVBQ1gsTUFBTSxHQUFHLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUNuQyxVQUFVLEdBQ0k7UUFDZCxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQ25DLCtCQUErQixFQUMvQixNQUFNLENBQ1QsQ0FBQztRQUNGLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxVQUFVO1lBQ1gsVUFBVSxLQUFLLEtBQUs7Z0JBQ2hCLENBQUMsQ0FBQyxJQUFJO2dCQUNOLENBQUMsQ0FB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