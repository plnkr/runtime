import RegisterLoader from 'es-module-loader/core/register-loader';
import { ModuleNamespace, ProcessAnonRegister } from 'es-module-loader/core/loader-polyfill';
export interface RuntimeHost {
    getFileContents(key: string): string | PromiseLike<string>;
    getCanonicalPath?(key: string): string | PromiseLike<string>;
    resolveBareDependency?(key: string): string | PromiseLike<string>;
}
export interface RuntimeOptions {
    defaultDependencyVersions?: {
        [key: string]: string;
    };
    host: RuntimeHost;
    useSystem?: boolean;
}
export interface AfterUnloadEvent {
    defaultPrevented: boolean;
    preventDefault(): void;
}
interface ModuleNamespaceClass {
    new (baseObject: any): ModuleNamespace;
}
export declare class RuntimeModuleNamespace extends ModuleNamespace {
    constructor(baseObject: any);
}
export declare class Runtime extends RegisterLoader {
    private readonly dependencies;
    private readonly dependents;
    private readonly baseUri;
    private queue;
    readonly defaultDependencyVersions: {
        [key: string]: string;
    };
    readonly host: RuntimeHost;
    readonly useSystem: boolean;
    [RegisterLoader.moduleNamespace]: ModuleNamespaceClass;
    constructor({ defaultDependencyVersions, host, useSystem, }: RuntimeOptions);
    [RegisterLoader.traceResolvedStaticDependency](parentKey: string, _: string, resolvedKey: string): void;
    [RegisterLoader.resolve](key: string, parentKey?: string): Promise<string>;
    [RegisterLoader.instantiate](key: string, processAnonRegister: ProcessAnonRegister): Promise<ModuleNamespace | void>;
    invalidate(...pathnames: string[]): Promise<void>;
}
export {};
