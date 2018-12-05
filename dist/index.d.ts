import RegisterLoader, { LinkRecord, LoadRecord } from 'es-module-loader/core/register-loader';
import { ModuleNamespace, ProcessAnonRegister } from 'es-module-loader/core/loader-polyfill';
import { RawSourceMap } from 'source-map';
export declare type SourceFile = SourceFileRecord | string;
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
    defaultDependencyVersions?: {
        [key: string]: string;
    };
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
export declare const CDN_ESM_URL = "https://dev.jspm.io";
export declare const CDN_SYSTEM_URL = "https://system-dev.jspm.io";
interface ModuleNamespaceClass {
    new (baseObject: any): ModuleNamespace;
}
export declare class RuntimeModuleNamespace extends ModuleNamespace {
    constructor(baseObject: any);
}
export declare class Runtime extends RegisterLoader {
    private readonly dependencies;
    private readonly dependents;
    private readonly injectedFiles;
    private queue;
    readonly baseUri: string;
    readonly defaultDependencyVersions: {
        [key: string]: string;
    };
    readonly host: RuntimeHost;
    readonly useSystem: boolean;
    [RegisterLoader.moduleNamespace]: ModuleNamespaceClass;
    constructor({ baseUri, defaultDependencyVersions, host, useSystem, }: RuntimeOptions);
    [RegisterLoader.traceLoad](load: LoadRecord, link: LinkRecord): void;
    [RegisterLoader.traceResolvedStaticDependency](parentKey: string, _: string, key: string): void;
    [RegisterLoader.resolve](key: string, parentKey?: string): string | Promise<string>;
    [RegisterLoader.instantiate](key: string, processAnonRegister: ProcessAnonRegister): Promise<ModuleNamespace | void>;
    inject(key: string, file: SourceFileRecord): void;
    invalidate(key: string, parentKey?: string): Promise<void>;
    registerDependency(parentKey: string, key: string): void;
}
export {};
