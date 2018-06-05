import { IRuntimeHost, ISystemPlugin } from './';

export interface ILocalLoaderOptions {
    runtimeHost: IRuntimeHost;
}

export function createLocalLoader({
    runtimeHost,
}: ILocalLoaderOptions): ISystemPlugin {
    return {
        fetch(load, systemFetch) {
            if (load.address.indexOf(this.baseURL) !== 0) {
                return systemFetch(load);
            }

            const localPath = load.address.slice(this.baseURL.length);

            return Promise.resolve(
                runtimeHost.getFileContents(localPath)
            ).catch(() => systemFetch(load));
        },
    };
}
