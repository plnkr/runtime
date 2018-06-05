import { IRuntimeHost, ISystemPlugin } from './';
export interface ILocalLoaderOptions {
    runtimeHost: IRuntimeHost;
}
export declare function createLocalLoader({runtimeHost}: ILocalLoaderOptions): ISystemPlugin;
