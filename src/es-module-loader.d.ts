declare module 'es-module-loader/core/common' {
    export const toStringTag: unique symbol;
}

declare module 'es-module-loader/core/loader-polyfill' {
    export class Loader {
        public static readonly instantiate: unique symbol;
        public static readonly moduleNamespace: unique symbol;
        public static readonly resolve: unique symbol;
        public static readonly traceDiscoverDynamicDependency: unique symbol;
        public static readonly traceLoad: unique symbol;
        public static readonly traceResolvedStaticDependency: unique symbol;

        public trace: boolean;

        import(key: string, parent?: string): Promise<any>;
        resolve(key: string, parent?: string): Promise<string>;
    }

    export class ModuleNamespace {
        constructor(moduleNamespace: any);
        [key: string]: any;
        // __onAfterUnload(event: any): void;
    }

    export interface ProcessAnonRegister {
        (): boolean;
    }
}

declare module 'es-module-loader/core/register-loader' {
    import {
        ProcessAnonRegister,
        Loader,
        ModuleNamespace,
    } from 'es-module-loader/core/loader-polyfill';

    export type DepMap = { [key: string]: string };

    export interface LinkRecord {
        dependencies: string[];
        depMap: DepMap;
    }

    export interface LoadRecord {
        key: string;
    }

    export default class RegisterLoader extends Loader {
        public registry: Registry;

        constructor(baseUri: string);

        import(key: string, parentKey?: string): Promise<ModuleNamespace>;
        resolve(key: string, parentKey?: string): Promise<string>;

        [Loader.moduleNamespace]: ModuleNamespace;

        [Loader.instantiate](
            key: string,
            processAnonRegister: ProcessAnonRegister
        ):
            | ModuleNamespace
            | PromiseLike<ModuleNamespace>
            | void
            | PromiseLike<undefined>;

        [Loader.resolve](
            key: string,
            parentKey?: string
        ): string | PromiseLike<string>;

        [Loader.traceDiscoverDynamicDependency](
            key: string,
            dynamicDep: string
        ): void;
        [Loader.traceLoad](load: LoadRecord, link: LinkRecord): void;
        [Loader.traceResolvedStaticDependency](
            parentKey: string,
            key: string,
            resolvedKey: string
        ): void;
    }

    export interface Registry {
        delete(key: string): boolean;
        get(key: string): ModuleNamespace;
    }
}
