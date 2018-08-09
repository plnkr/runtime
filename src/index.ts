import { baseURI, toStringTag } from 'es-module-loader/core/common';
import RegisterLoader, {
    LinkRecord,
    LoadRecord,
} from 'es-module-loader/core/register-loader';
import {
    ModuleNamespace,
    ProcessAnonRegister,
} from 'es-module-loader/core/loader-polyfill';
import { RawSourceMap } from 'source-map';
import convertRange from 'sver/convert-range';

import { transpileCssToSystemRegister } from './css';
import { transpileJs } from './javascript';
import { transpileVue } from './vue';

export type SourceFile = SourceFileRecord | string;

export interface SourceFileRecord {
    source: string;
    sourceMap?: RawSourceMap;
}

export interface RuntimeHost {
    getFileContents(key: string): SourceFile | PromiseLike<SourceFile>;
    getCanonicalPath?(key: string): string | PromiseLike<string>;
    resolveBareDependency?(key: string): string | PromiseLike<string>;
}

export interface RuntimeOptions {
    baseUri?: string;
    defaultDependencyVersions?: { [key: string]: string };
    host: RuntimeHost;
    useSystem?: boolean;
}

export interface AfterUnloadEvent {
    defaultPrevented: boolean;
    preventDefault(): void;
    propagationStopped: boolean;
    stopPropagation(): void;
}

export interface ReplaceEvent {
    previousInstance: RuntimeModuleNamespace;
}

export const CDN_ESM_URL = 'https://dev.jspm.io';
export const CDN_SYSTEM_URL = 'https://system-dev.jspm.io';
const DEFAULT_DEPENDENCY_VERSIONS = {
    '@vue/component-compiler-utils': '2.1',
    less: '2.7',
    'source-map': '0.7.3',
    typescript: '2.9',
    'vue-template-compiler': '2.5',
};
const EMPTY_MODULE = new ModuleNamespace({});
const NPM_MODULE_RX = /^((?:@[^/]+\/)?[^/]+)(\/.*)?$/;

// From SystemJS: https://github.com/systemjs/systemjs/blob/501d1a0b9e32e00d54c9cd747e3236a9df88a1a3/src/instantiate.js#L418
const LEADING_COMMENT_AND_META_RX = /^(\s*\/\*[^*]*(\*(?!\/)[^*]*)*\*\/|\s*\/\/[^\n]*|\s*"[^"]+"\s*;?|\s*'[^']+'\s*;?)*\s*/;
function detectRegisterFormat(source: string): boolean {
    const leadingCommentAndMeta = source.match(LEADING_COMMENT_AND_META_RX);
    if (!leadingCommentAndMeta) return false;
    var codeStart = leadingCommentAndMeta[0].length;
    return (
        source.startsWith('System.register', codeStart) ||
        source.startsWith('SystemJS.register', codeStart)
    );
}

interface ModuleNamespaceClass {
    new (baseObject: any): ModuleNamespace;
}

export class RuntimeModuleNamespace extends ModuleNamespace {
    constructor(baseObject: any) {
        if (
            baseObject instanceof Object &&
            !baseObject.__useDefault &&
            'default' in baseObject &&
            Object.keys(baseObject).length <= 1
        ) {
            if (typeof baseObject.default === 'function') {
                if (typeof Symbol !== 'undefined') {
                    Object.defineProperty(baseObject.default, toStringTag, {
                        value: 'Module',
                    });
                }

                Object.defineProperty(baseObject.default, 'default', {
                    enumerable: true,
                    get: function() {
                        return baseObject.default;
                    },
                });

                return baseObject.default;
            }

            Object.keys(baseObject.default).forEach(key => {
                Object.defineProperty(baseObject, key, {
                    enumerable: true,
                    get: function() {
                        return baseObject.default[key];
                    },
                });
            });
        }

        super(baseObject);
    }
}

if (toStringTag) {
    Object.defineProperty(RuntimeModuleNamespace.prototype, toStringTag, {
        value: 'Module',
    });
}

export class Runtime extends RegisterLoader {
    private readonly dependencies: Map<string, Set<string>>;
    private readonly dependents: Map<string, Set<string>>;
    private readonly injectedFiles: Map<string, SourceFileRecord>;
    private queue: Promise<any>;

    public readonly baseUri: string;
    public readonly defaultDependencyVersions: { [key: string]: string };
    public readonly host: RuntimeHost;
    public readonly useSystem: boolean;
    public [RegisterLoader.moduleNamespace]: ModuleNamespaceClass;

    constructor({
        baseUri = baseURI,
        defaultDependencyVersions = {},
        host,
        useSystem = !!((window || global) as any)['PLNKR_RUNTIME_USE_SYSTEM'],
    }: RuntimeOptions) {
        super();

        if (typeof baseUri !== 'string') {
            throw new TypeError(
                'The options.baseUri property, if specified, must be a string'
            );
        }

        this.baseUri = baseUri.endsWith('/') ? baseUri : `${baseUri}/`;
        this.injectedFiles = new Map();
        this.useSystem = useSystem;

        if (!host) {
            throw new TypeError('The options.host property is required');
        }

        if (
            host.getCanonicalPath &&
            typeof host.getCanonicalPath !== 'function'
        ) {
            throw new TypeError(
                'The options.host.getCanonicalPath property, if specified, must be a function'
            );
        }

        this[RegisterLoader.moduleNamespace] = RuntimeModuleNamespace;

        this.host = host;
        this.queue = Promise.resolve();

        this.defaultDependencyVersions = {
            ...DEFAULT_DEPENDENCY_VERSIONS,
            ...defaultDependencyVersions,
        };

        this.dependencies = new Map();
        this.dependents = new Map();
    }

    [RegisterLoader.traceLoad](load: LoadRecord, link: LinkRecord) {
        const instance = this.registry.get(load.key) || link.moduleObj;
        const previousInstance = this.registry.get(`${load.key}@prev`);

        if (
            instance &&
            previousInstance &&
            typeof previousInstance.__onReplace === 'function'
        ) {
            const event: ReplaceEvent = {
                previousInstance,
            };

            previousInstance.__onReplace(event);
        }
    }

    [RegisterLoader.traceResolvedStaticDependency](
        parentKey: string,
        _: string,
        key: string
    ) {
        this.registerDependency(parentKey, key);
    }

    [RegisterLoader.resolve](key: string, parentKey?: string) {
        if (this.injectedFiles.has(key)) {
            return key;
        }

        const urlResult = super[RegisterLoader.resolve](
            key,
            parentKey || this.baseUri
        );

        return Promise.resolve(urlResult).then(url => {
            if (url) {
                if (this.injectedFiles.has(url)) {
                    return url;
                }

                if (!url.startsWith(this.baseUri)) {
                    return url;
                }

                const hostRequest = url.slice(this.baseUri.length);
                const hostResolveResult = hostResolve(this.host, hostRequest);

                return Promise.resolve(hostResolveResult).then(
                    (hostResolution: string) => {
                        if (typeof hostResolution !== 'string') {
                            return <Promise<string>>(
                                Promise.reject(
                                    new Error(
                                        `Failed to resolve host module '${hostRequest}'`
                                    )
                                )
                            );
                        }

                        return `${this.baseUri}${hostResolution}`;
                    }
                );
            }

            if (typeof this.host.resolveBareDependency === 'function') {
                const resolveResult = this.host.resolveBareDependency(key);

                return Promise.resolve(resolveResult).then(result => {
                    return result;
                });
            }

            const matches = key.match(NPM_MODULE_RX);
            const moduleName = (matches && matches[1]) || key;
            const modulePath = (matches && matches[2]) || '';

            return this.resolve('./package.json')
                .catch(() => null)
                .then(resolvedPackageJsonKey => {
                    const packageJsonResult =
                        typeof resolvedPackageJsonKey === 'string'
                            ? this.import(resolvedPackageJsonKey).catch(
                                  error =>
                                      typeof this.host.getCanonicalPath ===
                                      'function'
                                          ? Promise.reject(
                                                new Error(
                                                    `Error loading '${key}' because 'package.json' is invalid: ${
                                                        error.message
                                                    }`
                                                )
                                            )
                                          : {}
                              )
                            : Promise.resolve({});

                    return packageJsonResult
                        .then((packageJson: any) => {
                            const devDependencies =
                                (packageJson &&
                                    packageJson['devDependencies']) ||
                                {};
                            const dependencies =
                                (packageJson && packageJson['dependencies']) ||
                                {};
                            const range =
                                dependencies[moduleName] ||
                                devDependencies[moduleName] ||
                                this.defaultDependencyVersions[moduleName];
                            const spec = range ? createJspmRange(range) : '';

                            return dynamicImport && !this.useSystem
                                ? `${CDN_ESM_URL}/${moduleName}${spec}${modulePath}`
                                : `${CDN_SYSTEM_URL}/${moduleName}${spec}${modulePath}`;
                        })
                        .then(resolvedKey => {
                            if (resolvedPackageJsonKey) {
                                this.registerDependency(
                                    resolvedKey,
                                    resolvedPackageJsonKey
                                );
                            }

                            return resolvedKey;
                        });
                });
        });
    }

    [RegisterLoader.instantiate](
        key: string,
        processAnonRegister: ProcessAnonRegister
    ): Promise<ModuleNamespace | void> {
        if (this.injectedFiles.has(key)) {
            const injectedFile = this.injectedFiles.get(key);
            const instantiateResult = instantiate(
                this,
                key,
                injectedFile.source,
                processAnonRegister
            );

            return Promise.resolve(instantiateResult);
        }
        if (key.startsWith(this.baseUri)) {
            const loadHostResult = loadHostModule(
                this,
                key,
                processAnonRegister
            );

            return Promise.resolve(loadHostResult);
        }

        const loadRemoteResult = loadRemoteModule(
            this,
            key,
            processAnonRegister
        );

        return Promise.resolve(loadRemoteResult);
    }

    public inject(key: string, file: SourceFileRecord) {
        this.injectedFiles.set(key, file);
    }

    public invalidate(key: string, parentKey?: string): Promise<void> {
        const getDependents = (normalizedPath: string): string[] => {
            if (this.dependents.has(normalizedPath)) {
                return Array.from(this.dependents.get(normalizedPath));
            }

            return [];
        };

        const seen = new Set();
        const invalidationPromise = this.queue.then(() => {
            const invalidations = [[key, parentKey]];
            const handleNextInvalidation = (): Promise<any> => {
                if (!invalidations.length) return Promise.resolve();

                const [key, parentKey] = invalidations.shift();

                return this.resolve(key, parentKey).then(resolvedPathname => {
                    if (!seen.has(resolvedPathname)) {
                        seen.add(resolvedPathname);

                        const dependents = getDependents(resolvedPathname);
                        const instance = this.registry.get(resolvedPathname);
                        const event: AfterUnloadEvent = {
                            propagationStopped: false,
                            defaultPrevented: false,
                            preventDefault() {
                                this.defaultPrevented = true;
                            },
                            stopPropagation() {
                                this.propagationStopped = true;
                            },
                        };

                        this.registry.delete(resolvedPathname);
                        this.dependencies.delete(resolvedPathname);
                        this.dependents.delete(resolvedPathname);

                        if (instance) {
                            if (
                                typeof instance.__onAfterUnload === 'function'
                            ) {
                                instance.__onAfterUnload(event);
                            }

                            if (!event.propagationStopped) {
                                for (const dependent of dependents) {
                                    invalidations.push([dependent]);
                                }
                            }

                            if (event.defaultPrevented) {
                                this.registry.set(
                                    `${resolvedPathname}@prev`,
                                    instance
                                );
                            }
                        }
                    }

                    return handleNextInvalidation();
                });
            };

            return handleNextInvalidation();
        });

        this.queue = invalidationPromise.catch(() => undefined);

        return invalidationPromise;
    }

    public registerDependency(parentKey: string, key: string) {
        if (!this.dependencies.has(parentKey)) {
            this.dependencies.set(parentKey, new Set());
        }

        this.dependencies.get(parentKey).add(key);

        if (!this.dependents.has(key)) {
            this.dependents.set(key, new Set());
        }

        this.dependents.get(key).add(parentKey);
    }
}

type DynamicImport = (spec: string) => Promise<any>;

const dynamicImport = <DynamicImport>(() => {
    try {
        return new Function('spec', 'return import(spec)');
    } catch (__) {
        return null;
    }
})();

function hostResolve(
    host: RuntimeHost,
    key: string
): string | PromiseLike<string> {
    if (typeof host.getCanonicalPath === 'function') {
        return host.getCanonicalPath(key);
    }

    return key;
}

const EXT_RX = /(\.[^./]+)$/;
function getExt(filename: string) {
    const matches = filename.match(EXT_RX);

    return matches ? matches[1] : '';
}

function instantiate(
    runtime: Runtime,
    key: string,
    code: string,
    processAnonRegister: ProcessAnonRegister
): Promise<ModuleNamespace | void> | ModuleNamespace | void {
    const ext = getExt(key);

    switch (ext) {
        case '.json':
            return instantiateJson(runtime, key, code);
        case '.css':
        case '.less':
            return instantiateCss(runtime, key, code, processAnonRegister);
        case '.vue':
            return instantiateVue(runtime, key, code, processAnonRegister);
        default:
            return instantiateJavascript(
                runtime,
                key,
                code,
                processAnonRegister
            );
    }
}

function instantiateCss(
    runtime: Runtime,
    key: string,
    code: string,
    processAnonRegister: ProcessAnonRegister
): Promise<ModuleNamespace | void> {
    const transpileResult = transpileCssToSystemRegister(runtime, key, code);

    return Promise.resolve(transpileResult).then(transpiledCode => {
        return instantiateJavascript(
            runtime,
            key,
            transpiledCode,
            processAnonRegister
        );
    });
}

function instantiateJson(
    runtime: Runtime,
    _: string,
    code: string
): ModuleNamespace {
    return new runtime[RegisterLoader.moduleNamespace](JSON.parse(code));
}

function instantiateJavascript(
    runtime: Runtime,
    key: string,
    codeOrRecord: SourceFile,
    processAnonRegister: ProcessAnonRegister
): Promise<ModuleNamespace | void> | ModuleNamespace | void {
    const code =
        typeof codeOrRecord === 'string' ? codeOrRecord : codeOrRecord.source;
    const systemRegisterCodeResult = detectRegisterFormat(code)
        ? codeOrRecord
        : transpileJs(runtime, key, code);

    return Promise.resolve(systemRegisterCodeResult).then(
        transpiledCodeOrRecord => {
            const code =
                typeof transpiledCodeOrRecord === 'string'
                    ? annotateCodeSource(transpiledCodeOrRecord, key)
                    : annotateCodeSource(
                          transpiledCodeOrRecord.source,
                          key,
                          transpiledCodeOrRecord.sourceMap
                      );
            const moduleFactory = new Function(
                'System',
                'SystemJS',
                'module',
                code
            );

            moduleFactory(runtime, runtime, {
                id: key,
            });

            if (!processAnonRegister()) {
                return EMPTY_MODULE;
            }
        }
    );
}

function instantiateVue(
    runtime: Runtime,
    key: string,
    code: string,
    processAnonRegister: ProcessAnonRegister
) {
    const transpileResult = transpileVue(runtime, key, code);

    return Promise.resolve(transpileResult).then(sourceFileRecord => {
        return instantiateJavascript(
            runtime,
            key,
            sourceFileRecord,
            processAnonRegister
        );
    });
}

const SOURCE_MAP_PREFIX =
    '\n//# sourceMapping' + 'URL=data:application/json;base64,';
function inlineSourceMap(sourceMap: object | string) {
    let sourceMapString: string;

    try {
        sourceMapString =
            typeof sourceMap === 'string'
                ? sourceMap
                : JSON.stringify(sourceMap);
    } catch (_) {
        sourceMapString = '';
    }

    if (typeof btoa !== 'undefined')
        return (
            SOURCE_MAP_PREFIX +
            btoa(unescape(encodeURIComponent(sourceMapString)))
        );
    else return '';
}

function annotateCodeSource(
    code: string,
    filename: string,
    sourceMap?: object
): string {
    const suffix =
        (sourceMap && inlineSourceMap(sourceMap)) ||
        `\n//# sourceURL=${filename}`;

    return `${code}${suffix}`;
}

function loadRemoteModule(
    runtime: Runtime,
    key: string,
    processAnonRegister: ProcessAnonRegister
): Promise<ModuleNamespace | void> {
    if (typeof dynamicImport === 'function' && !runtime.useSystem) {
        const dynamicImportResult = dynamicImport(key);

        return Promise.resolve(dynamicImportResult).then(esModule => {
            const moduleNamespaceConstructor =
                runtime[RegisterLoader.moduleNamespace];
            // const baseObject =
            //     Object.keys(moduleExports).length <= 1 &&
            //     'default' in moduleExports
            //         ? moduleExports.default
            //         : moduleExports;

            if (esModule.default) {
                const baseObject = esModule.default;
                const descriptors = Object.getOwnPropertyDescriptors(
                    esModule.default
                );

                Object.defineProperty(baseObject, '__esModule', {
                    value: true,
                });

                Object.defineProperty(baseObject, '__useDefault', {
                    value: esModule.default,
                });

                Object.defineProperty(baseObject, 'default', {
                    enumerable: true,
                    get() {
                        return esModule.default;
                    },
                });

                Object.defineProperties(baseObject, descriptors);

                if (toStringTag) {
                    Object.defineProperty(baseObject, toStringTag, {
                        value: 'Module',
                    });
                }

                return baseObject;
            }

            return new moduleNamespaceConstructor(esModule);
        });
    }

    return fetch(key)
        .then(res => res.text())
        .then(code => instantiate(runtime, key, code, processAnonRegister));
}

function loadHostModule(
    runtime: Runtime,
    key: string,
    processAnonRegister: ProcessAnonRegister
): Promise<ModuleNamespace | void> {
    const hostKey = key.slice(runtime.baseUri.length);
    const codeResult = runtime.host.getFileContents(hostKey);

    return Promise.resolve(codeResult).then(code => {
        if (typeof code !== 'string') {
            return Promise.reject(
                new Error(
                    `The runtime host returned non-string file contents for '${key}'`
                )
            );
        }
        return instantiate(runtime, key, code, processAnonRegister);
    });
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
