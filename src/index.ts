import convertRange from 'sver/convert-range';
import SystemJS from 'systemjs';

import { createEsmCdnLoader, supportsDynamicImport } from './esmLoader';
import { createLocalLoader } from './localLoader';
import { addSyntheticDefaultExports } from './syntheticImports';
import { createTranspiler } from './transpiler';

const ESM_CDN_URL = 'https://dev.jspm.io';
const SYSTEM_CDN_URL = 'https://system-dev.jspm.io';
const TYPESCRIPT_VERSION = '2.8';

declare global {
    interface Window {
        PLNKR_RUNTIME_USE_SYSTEM: boolean;
    }
}

export type IModuleExports = any;

export interface IRuntimeHost {
    getFileContents(pathname: string): string | Promise<string>;
    transpile?(load: ISystemModule): string | Promise<string>;
}

export interface IRuntimeOptions {
    // defaultExtensions?: string[];
    processModule?: string;
    runtimeHost: IRuntimeHost;
    system?: SystemJSLoader.System;
    transpiler?: ISystemPlugin | false;
}

export interface ISystemModule {
    name: string;
    address: string;
    source?: string;
    metadata?: any;
}

export interface ISystemPlugin {
    fetch?(
        this: SystemJSLoader.System,
        load: ISystemModule,
        systemFetch: (load: ISystemModule) => string | Promise<string>
    ): string | Promise<string>;
    instantiate?(
        load: ISystemModule,
        systemInstantiate: (load: ISystemModule) => object | Promise<object>
    ): object | Promise<object>;
    locate?(load: ISystemModule): string | Promise<string>;
    translate?(load: ISystemModule): string | Promise<string>;
}

export interface IRuntime {
    import(entrypointPath: string): Promise<IModuleExports>;
}

export class Runtime implements IRuntime {
    // private defaultExtensions: string[];
    private esmLoader: ISystemPlugin;
    private localLoader: ISystemPlugin;
    private localRoot: string;
    private queue: Promise<any>;
    private runtimeHost: IRuntimeHost;
    private system: SystemJSLoader.System;
    private transpiler: ISystemPlugin;
    private useEsm: boolean;

    constructor({
        // defaultExtensions = ['.js', '.ts', '.jsx', '.tsx'],
        runtimeHost,
        system = new SystemJS.constructor(),
        transpiler,
    }: IRuntimeOptions) {
        // // this.defaultExtensions = defaultExtensions;
        this.esmLoader = createEsmCdnLoader();
        this.localLoader = createLocalLoader({ runtimeHost });
        this.localRoot = system.baseURL.replace(
            /^([a-zA-Z]+:\/\/)([^/]*)\/.*$/,
            '$1$2'
        );
        this.queue = Promise.resolve();
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
        this.useEsm = !window.PLNKR_RUNTIME_USE_SYSTEM && supportsDynamicImport;
        this.system.registry.set(
            '@runtime-loader-esm',
            system.newModule(this.esmLoader)
        );
        this.system.registry.set(
            '@runtime-loader-local',
            system.newModule(this.localLoader)
        );
        if (this.transpiler) {
            this.system.registry.set(
                '@runtime-transpiler',
                system.newModule(this.transpiler)
            );
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

    public import(entrypointPath: string): Promise<IModuleExports> {
        this.queue = this.queue.then(() =>
            this.buildConfig()
                .then(config => {
                    this.system.config(config);

                    return this.system.import(entrypointPath);
                })
                .then(addSyntheticDefaultExports)
        );

        return this.queue;
    }

    public invalidate(...pathnames: string[]): Promise<void> {
        type DependentName = string;

        const dependentGraph: Map<
            DependentName,
            Set<DependentName>
        > = new Map();
        const getDependents = (
            normalizedPath: DependentName
        ): DependentName[] => {
            if (dependentGraph.size !== Object.keys(this.system.loads).length) {
                dependentGraph.clear();

                for (const key in this.system.loads) {
                    const loadEntry = this.system.loads[key];

                    for (const mapping in loadEntry.depMap) {
                        const dependency = loadEntry.depMap[mapping];

                        if (!dependentGraph.has(dependency)) {
                            dependentGraph.set(dependency, new Set());
                        }

                        dependentGraph.get(dependency).add(key);
                    }
                }
            }

            return dependentGraph.has(normalizedPath)
                ? Array.from(dependentGraph.get(normalizedPath))
                : [];
        };
        const normalizedPaths = new Map();
        const normalizePath = (key: string): Promise<string> => {
            if (normalizedPaths.has(key)) {
                return Promise.resolve(normalizedPaths.get(key));
            }

            return this.system.resolve(key).then(resolvedPath => {
                normalizedPaths.set(key, resolvedPath);

                return resolvedPath;
            });
        };
        const seen = new Set();

        this.queue = this.queue.then(() => {
            const invalidations = pathnames.slice();
            const handleNextInvalidation = (): Promise<any> => {
                if (!invalidations.length) return Promise.resolve();

                const pathname = invalidations.shift();

                return normalizePath(pathname).then(resolvedPathname => {
                    if (!seen.has(resolvedPathname)) {
                        seen.add(resolvedPathname);

                        this.system.registry.delete(resolvedPathname);

                        const dependents = getDependents(resolvedPathname);

                        for (const dependent of dependents) {
                            invalidations.push(dependent);
                        }
                    }

                    return handleNextInvalidation();
                });
            };

            return handleNextInvalidation();
        });

        return this.queue;
    }

    private buildConfig(): Promise<SystemJSLoader.Config> {
        const config = this.system.getConfig();

        config.map = {};

        const dependencies = Object.create(null);

        return Promise.resolve(
            this.runtimeHost.getFileContents('package.json')
        ).then(pkgJsonStr => {
            if (pkgJsonStr) {
                try {
                    const pkgJson = JSON.parse(pkgJsonStr);

                    Object.assign(dependencies, pkgJson.devDependencies || {});
                    Object.assign(dependencies, pkgJson.dependencies || {});
                } catch (e) {
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

function createJspmRange(semverRange: string): string {
    const range = convertRange(semverRange);
    let versionString = '';
    if (range.isExact) versionString = '@' + range.version.toString();
    else if (range.isStable)
        versionString = '@' + range.version.major + '.' + range.version.minor;
    else if (range.isMajor) versionString = '@' + range.version.major;

    return versionString;
}

function createRuntime(options: IRuntimeOptions): IRuntime {
    return new Runtime(options);
}
