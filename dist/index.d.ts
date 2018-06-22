/// <reference types="systemjs" />
declare global  {
    interface Window {
        PLNKR_RUNTIME_USE_SYSTEM: boolean;
    }
}
export declare type IModuleExports = any;
export interface IRuntimeHost {
    fallbackToSystemFetch?: boolean;
    getFileContents(pathname: string): string | Promise<string> | undefined | Promise<undefined>;
    transpile?(load: ISystemModule): string | Promise<string>;
}
export interface IRuntimeOptions {
    defaultDependencies?: {
        [name: string]: string;
    };
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
    fetch?(this: SystemJSLoader.System, load: ISystemModule, systemFetch: (load: ISystemModule) => string | Promise<string>): string | Promise<string>;
    instantiate?(this: SystemJSLoader.System, load: ISystemModule, systemInstantiate: (load: ISystemModule) => object | Promise<object>): void | object | Promise<void | object>;
    locate?(this: SystemJSLoader.System, load: ISystemModule): string | Promise<string>;
    translate?(this: SystemJSLoader.System, load: ISystemModule): string | Promise<string>;
}
export interface IRuntime {
    import(entrypointPath: string): Promise<IModuleExports>;
}
export declare class Runtime implements IRuntime {
    private defaultDependencies;
    private esmLoader;
    private localLoader;
    private localRoot;
    private queue;
    private system;
    private transpiler;
    private useEsm;
    constructor({defaultDependencies, defaultExtensions, runtimeHost, transpiler}: IRuntimeOptions);
    import(entrypointPath: string): Promise<IModuleExports>;
    invalidate(...pathnames: string[]): Promise<void>;
    buildConfig(): Promise<SystemJSLoader.Config>;
    resolve(spec: string): Promise<string>;
}
