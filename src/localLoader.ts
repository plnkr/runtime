import { extname } from 'path';

import { IRuntimeHost, ISystemPlugin } from './';

type loaderFunction = (pathname: string) => string | Promise<string>;
export type LoadErrors = { [pathname: string]: Error };

export interface ILoadError extends Error {
    loadErrors: LoadErrors;
}

export interface ILocalLoaderOptions {
    cssLoader: ISystemPlugin;
    defaultExtensions: string[];
    runtimeHost: IRuntimeHost;
}

function tryCandidates(
    candidates: string[],
    loader: loaderFunction
): Promise<{ content: string; pathname: string }> {
    const tryNext = (
        idx: number,
        errors: { [pathname: string]: Error }
    ): Promise<{ content: string; pathname: string }> => {
        if (idx >= candidates.length) {
            const error = new Error('Loading failed');

            (<ILoadError>error).loadErrors = errors;

            return Promise.reject(error);
        }

        return Promise.resolve(loader(candidates[idx])).then(
            content => {
                return { content, pathname: candidates[idx] };
            },
            error => {
                errors[candidates[idx]] = error;

                return tryNext(idx + 1, errors);
            }
        );
    };

    return tryNext(0, {});
}

export function createLocalLoader({
    cssLoader,
    defaultExtensions,
    runtimeHost,
}: ILocalLoaderOptions): ISystemPlugin {
    return {
        locate(load) {
            if (load.address.indexOf(this.baseURL) !== 0) {
                if (!runtimeHost.fallbackToSystemFetch) {
                    return Promise.reject(
                        new Error(
                            `Invariant broken: attempting to load ${
                                load.address
                            } using the local loader`
                        )
                    );
                }
            }

            const initialAddress = load.address;
            const localPath = load.address.slice(this.baseURL.length);
            const ext = extname(localPath);
            const candidates = ext
                ? [localPath]
                : defaultExtensions.map(ext => `${localPath}${ext}`);

            const loadFromHost = (pathname: string): Promise<string> =>
                Promise.resolve(runtimeHost.getFileContents(pathname)).then(
                    contents => {
                        if (typeof contents !== 'string') {
                            return <Promise<string>>(
                                Promise.reject(new Error('Not found'))
                            );
                        }
                        return contents;
                    }
                );

            return tryCandidates(candidates, loadFromHost).then(
                ({ content, pathname }) => {
                    load.source = content;

                    return initialAddress.replace(localPath, pathname);
                }
            );
        },
        fetch(load, systemFetch) {
            if (typeof load.source === 'string') {
                return load.source;
            }

            if (!runtimeHost.fallbackToSystemFetch) {
                return Promise.reject(
                    new Error(
                        `Unable to load ${load.address} using the local loader`
                    )
                );
            }

            const initialAddress = load.address;
            const localPath = load.address.slice(this.baseURL.length);
            const ext = extname(localPath);
            const candidates = ext
                ? [localPath]
                : defaultExtensions.map(ext => `${localPath}${ext}`);

            const loadWithSystem = (pathname: string) => {
                load.address = initialAddress.replace(localPath, pathname);

                return systemFetch(load);
            };

            return tryCandidates(candidates, loadWithSystem).then(
                ({ content, pathname }) => {
                    load.address = initialAddress.replace(localPath, pathname);

                    return content;
                }
            );
        },
        instantiate(load, systemInstantiate) {
            if (load.address.match(/\.json$/i)) {
                return JSON.parse(load.source);
            }

            if (load.address.match(/\.(css|less)$/)) {
                return cssLoader.instantiate.call(
                    this,
                    load,
                    systemInstantiate
                );
            }

            return systemInstantiate(load);
        },
        translate(load) {
            if (load.address.match(/\.(css|less)$/)) {
                return cssLoader.translate.call(this, load);
            }

            return load.source;
        },
    };
}
