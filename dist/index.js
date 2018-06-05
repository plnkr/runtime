import SystemJS from 'systemjs';
import { CDN_PREFIX, createCdnLoader } from './cdnLoader';
import { createLocalLoader } from './localLoader';
import { createTranspiler } from './transpiler';
const TYPESCRIPT_VERSION = '2.8';
export class Runtime {
    constructor({ 
    // defaultExtensions = ['.js', '.ts', '.jsx', '.tsx'],
    runtimeHost, system = new SystemJS.constructor(), transpiler, }) {
        // // this.defaultExtensions = defaultExtensions;
        this.cdnLoader = createCdnLoader();
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
                        typescriptVersion: TYPESCRIPT_VERSION,
                    });
        this.system.registry.set('@runtime-loader-cdn', system.newModule(this.cdnLoader));
        this.system.registry.set('@runtime-loader-local', system.newModule(this.localLoader));
        if (this.transpiler) {
            this.system.registry.set('@runtime-transpiler', system.newModule(this.transpiler));
        }
        this.system.config({
            meta: {
                [`${CDN_PREFIX}*`]: {
                    loader: '@runtime-loader-cdn',
                    // @ts-ignore
                    esModule: true,
                },
                [`${this.localRoot}/*`]: {
                    esModule: true,
                    loader: '@runtime-loader-local',
                },
            },
            transpiler: this.transpiler ? '@runtime-transpiler' : null,
        });
        this.system.trace = true;
    }
    import(entrypointPath) {
        return this.buildConfig().then(config => {
            this.system.config(config);
            return this.system.import(entrypointPath);
        });
    }
    buildConfig() {
        const config = this.system.getConfig();
        config.map = {};
        const dependencies = Object.create(null);
        return Promise.resolve(this.runtimeHost.getFileContents('package.json')).then(pkgJsonStr => {
            if (pkgJsonStr) {
                try {
                    const pkgJson = JSON.parse(pkgJsonStr);
                    Object.assign(dependencies, pkgJson.dependencies || {});
                }
                catch (e) {
                    // Do nothing
                }
            }
            // tslint:disable-next-line forin
            for (const name in dependencies) {
                const range = dependencies[name];
                const pkgId = `${CDN_PREFIX}${name}@${range}`;
                config.map[name] = pkgId;
            }
            return config;
        });
    }
}
function createRuntime(options) {
    return new Runtime(options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFaEQsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7QUEwQ2pDLE1BQU07SUFTRixZQUFZO0lBQ1Isc0RBQXNEO0lBQ3RELFdBQVcsRUFDWCxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQ25DLFVBQVUsR0FDSTtRQUNkLGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsU0FBUyxHQUFHLGVBQWUsRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQ25DLCtCQUErQixFQUMvQixNQUFNLENBQ1QsQ0FBQztRQUNGLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxVQUFVO1lBQ1gsVUFBVSxLQUFLLEtBQUs7Z0JBQ2hCLENBQUMsQ0FBQyxJQUFJO2dCQUNOLENBQUMsQ0FBQyxVQUFVO29CQUNWLGdCQUFnQixDQUFDO3dCQUNiLGFBQWE7d0JBQ2IsaUJBQWlCLEVBQUUsa0JBQWtCO3FCQUN4QyxDQUFDLENBQUM7UUFFYixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ3BCLHFCQUFxQixFQUNyQixNQUFNLENBQUMsU0FB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