import { IRuntimeHost, ISystemPlugin } from './';
export declare type LoadErrors = {
    [pathname: string]: Error;
};
export interface ILoadError extends Error {
    loadErrors: LoadErrors;
}
export interface ILocalLoaderOptions {
    defaultExtensions: string[];
    runtimeHost: IRuntimeHost;
}
export declare function createLocalLoader({defaultExtensions, runtimeHost}: ILocalLoaderOptions): ISystemPlugin;
