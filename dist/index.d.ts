/// <reference types="systemjs" />
declare global  {
    interface Window {
        PLNKR_RUNTIME_USE_SYSTEM: boolean;
    }
}
export declare type IModuleExports = any;
export interface IRuntimeHost {
    getFileContents(pathname: string): string | Promise<string>;
    transpile?(load: ISystemModule): string | Promise<string>;
}
export interface IRuntimeOptions {
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
    instantiate?(load: ISystemModule, systemInstantiate: (load: ISystemModule) => object | Promise<object>): object | Promise<object>;
    locate?(load: ISystemModule): string | Promise<string>;
    translate?(load: ISystemModule): string | Promise<string>;
}
export interface IRuntime {
    import(entrypointPath: string): Promise<IModuleExports>;
}
export declare class Runtime implements IRuntime {
    private esmLoader;
    private localLoader;
    private localRoot;
    private queue;
    private runtimeHost;
    private system;
    private transpiler;
    private useEsm;
    constructor({runtimeHost, system, transpiler}: IRuntimeOptions);
    import(entrypointPath: string): Promise<IModuleExports>;
    invalidate(...pathnames: string[]): Promise<void>;
    private buildConfig();
}
