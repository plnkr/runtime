import convertRange from 'sver/convert-range';
import SystemJS from 'systemjs';

import { createCssLoader } from './cssLoader';
import { createEsmCdnLoader, dynamicImport } from './esmLoader';
import { createLocalLoader } from './localLoader';
import { addSyntheticDefaultExports } from './syntheticImports';
import { createTranspiler } from './transpiler';

const ESM_CDN_URL = 'https://dev.jspm.io';
const SYSTEM_CDN_URL = 'https://system-dev.jspm.io';
const LESS_VERSION = '2.7';
const TYPESCRIPT_VERSION = '2.8';

declare global {
    interface Window {
        PLNKR_RUNTIME_USE_SYSTEM: boolean;
    }
}

export type IModuleExports = any;

export interface IRuntimeHost {
    fallbackToSystemFetch?: boolean;
    getFileContents(
        pathname: string
    ): string | Promise<string> | undefined | Promise<undefined>;
    transpile?(load: ISystemModule): string | Promise<string>;
}

export interface IRuntimeOptions {
    defaultDependencies?: { [name: string]: string };
    defaultExtensions?: string[];
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
        this: SystemJSLoader.System,
        load: ISystemModule,
        systemInstantiate: (load: ISystemModule) => object | Promise<object>
    ): void | object | Promise<void | object>;
    locate?(
        this: SystemJSLoader.System,
        load: ISystemModule
    ): string | Promise<string>;
    translate?(
        this: SystemJSLoader.System,
        load: ISystemModule
    ): string | Promise<string>;
}

export interface IRuntime {
    import(entrypointPath: string): Promise<IModuleExports>;
}

export class Runtime implements IRuntime {
    private defaultDependencies: { [name: string]: string };
    // private defaultExtensions: string[];
    private esmLoader: ISystemPlugin;
    private localLoader: ISystemPlugin;
    private localRoot: string;
    private queue: Promise<any>;
    // private runtimeHost: IRuntimeHost;
    private system: SystemJSLoader.System;
    private transpiler: ISystemPlugin;
    private useEsm: boolean;

    constructor({
        defaultDependencies = {},
        defaultExtensions = ['.js', '.ts', '.jsx', '.tsx'],
        runtimeHost,
        transpiler,
    }: IRuntimeOptions) {
        const cssLoader = createCssLoader({
            runtime: this,
        });

        this.defaultDependencies = defaultDependencies;
        // this.defaultExtensions = defaultExtensions;
        this.esmLoader = createEsmCdnLoader();
        this.localLoader = createLocalLoader({
            cssLoader,
            defaultExtensions,
            runtimeHost,
        });
        this.queue = Promise.resolve();
        // this.runtimeHost = runtimeHost;
        this.system = new SystemJS.constructor();
        this.localRoot = this.system.baseURL.replace(
            /^([a-zA-Z]+:\/\/)([^/]*)\/.*$/,
            '$1$2'
        );
        this.transpiler =
            transpiler === false
                ? null
                : transpiler ||
                  createTranspiler({
                      createRuntime,
                      runtime: this,
                      runtimeHost,
                      typescriptVersion: TYPESCRIPT_VERSION,
                  });
        this.useEsm =
            !window.PLNKR_RUNTIME_USE_SYSTEM &&
            typeof dynamicImport === 'function';

        this.system.registry.set(
            '@runtime-loader-css',
            this.system.newModule(cssLoader)
        );
        this.system.registry.set(
            '@runtime-loader-esm',
            this.system.newModule(this.esmLoader)
        );
        this.system.registry.set(
            '@runtime-loader-local',
            this.system.newModule(this.localLoader)
        );
        if (this.transpiler) {
            this.system.registry.set(
                '@runtime-transpiler',
                this.system.newModule(this.transpiler)
            );
        }

        if (this.localRoot.charAt(this.localRoot.length - 1) === '/') {
            this.localRoot = this.localRoot.slice(0, this.localRoot.length - 1);
        }

        if (!this.defaultDependencies['typescript']) {
            this.defaultDependencies['typescript'] = TYPESCRIPT_VERSION;
        }

        if (!this.defaultDependencies['less']) {
            this.defaultDependencies['less'] = LESS_VERSION;
        }

        type declareType = (...modules: any[]) => any;

        const systemRegister = this.system.register;

        this.system.register = function(
            key: string | string[],
            deps: string[] | declareType,
            declare?: declareType
        ) {
            if (typeof key !== 'string') {
                if (typeof deps === 'function') declare = deps;
                deps = key;
                key = undefined;
            }
            var registerDeclare = declare;
            declare = function(_export, _context) {
                return registerDeclare.call(
                    this,
                    function(
                        name: string | { [key: string]: any },
                        value: { [key: string]: any }
                    ) {
                        if (typeof name === 'object') {
                            if (typeof name['default'] === 'object') {
                                return _export(
                                    addSyntheticDefaultExports(name['default'])
                                );
                            }
                        } else if (
                            name === 'default' &&
                            typeof value === 'object'
                        ) {
                            return _export(addSyntheticDefaultExports(value));
                        }
                        return _export(name, value);
                    },
                    _context
                );
            };
            if (key) return systemRegister.call(this, key, deps, declare);
            else return systemRegister.call(this, deps, declare);
        };

        this.system.config({
            meta: {
                [`${this.localRoot}/*`]: {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-local',
                },
                '*.css': {
                    loader: '@runtime-loader-css',
                },
                '*.less': {
                    loader: '@runtime-loader-css',
                },
                [`${ESM_CDN_URL}/*`]: {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-esm',
                },
                [`${SYSTEM_CDN_URL}/*`]: {
                    // @ts-ignore
                    esModule: true,
                },
            },
            transpiler: this.transpiler ? '@runtime-transpiler' : false,
        });
        this.system.trace = true;
    }

    public import(entrypointPath: string): Promise<IModuleExports> {
        const importPromise = this.queue.then(() =>
            this.buildConfig()
                .then(config => {
                    this.system.config(config);

                    return this.system
                        .import(entrypointPath)
                        .catch(err => Promise.reject(err.originalErr));
                })
                .then(addSyntheticDefaultExports)
        );

        // this.queue = importPromise.catch(() => undefined);

        return importPromise;
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

        const invalidationPromise = this.queue.then(() => {
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

        this.queue = this.queue.catch(() => undefined);

        return invalidationPromise;
    }

    public buildConfig(): Promise<SystemJSLoader.Config> {
        const config = this.system.getConfig();
        const dependencies = this.defaultDependencies;

        config.map = {};

        return this.system
            .import('package.json')
            .catch(() => ({}))
            .then(pkgJson => {
                Object.assign(dependencies, pkgJson.devDependencies || {});
                Object.assign(dependencies, pkgJson.dependencies || {});

                const baseUrl = this.useEsm ? ESM_CDN_URL : SYSTEM_CDN_URL;

                for (const name in dependencies) {
                    const range = dependencies[name];
                    const pkgId = `${baseUrl}/${name}${createJspmRange(range)}`;

                    config.map[name] = pkgId;
                }

                return config;
            });
    }

    public resolve(spec: string): Promise<string> {
        return this.system.resolve(spec);
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
