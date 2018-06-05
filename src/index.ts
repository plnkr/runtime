import SystemJS from 'systemjs';
import { CDN_PREFIX, createCdnLoader } from './cdnLoader';
import { createLocalLoader } from './localLoader';
import { createTranspiler } from './transpiler';

const TYPESCRIPT_VERSION = '2.8';

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
    private cdnLoader: ISystemPlugin;
    private localLoader: ISystemPlugin;
    private localRoot: string;
    private runtimeHost: IRuntimeHost;
    private system: SystemJSLoader.System;
    private transpiler: ISystemPlugin;

    constructor({
        // defaultExtensions = ['.js', '.ts', '.jsx', '.tsx'],
        runtimeHost,
        system = new SystemJS.constructor(),
        transpiler,
    }: IRuntimeOptions) {
        // // this.defaultExtensions = defaultExtensions;
        this.cdnLoader = createCdnLoader();
        this.localLoader = createLocalLoader({ runtimeHost });
        this.localRoot = system.baseURL.replace(
            /^([a-zA-Z]+:\/\/)([^/]*)\/.*$/,
            '$1$2'
        );
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

        this.system.registry.set(
            '@runtime-loader-cdn',
            system.newModule(this.cdnLoader)
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

    public import(entrypointPath: string): Promise<IModuleExports> {
        return this.buildConfig().then(config => {
            this.system.config(config);

            return this.system.import(entrypointPath);
        });
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

                    Object.assign(dependencies, pkgJson.dependencies || {});
                } catch (e) {
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

function createRuntime(options: IRuntimeOptions): IRuntime {
    return new Runtime(options);
}
