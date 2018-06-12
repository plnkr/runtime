import { ModuleKind, transpileModule } from 'typescript';

import { IRuntimeHost, IRuntimeOptions, ISystemPlugin, IRuntime } from './';

export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    runtimeHost: IRuntimeHost;
    typescriptVersion: string;
}

interface ITypescriptTranspiler {
    transpileModule: typeof transpileModule;
    ModuleKind: typeof ModuleKind;
}

export function createTranspiler({
    createRuntime,
    runtimeHost,
    typescriptVersion,
}: ITranspilerOptions): ISystemPlugin {
    const transpilerRuntime = createRuntime({
        runtimeHost: {
            getFileContents(pathname) {
                const result = Promise.resolve(
                    runtimeHost.getFileContents(pathname)
                );

                if (pathname === 'package.json') {
                    return result
                        .then(packageJson => {
                            const json = JSON.parse(packageJson);

                            if (!json['devDependencies']) {
                                json['devDependencies'] = {};
                            }

                            if (!json['devDependencies']['typescript']) {
                                json['devDependencies'][
                                    'typescript'
                                ] = typescriptVersion;
                            }

                            return JSON.stringify(json);
                        })
                        .catch(() =>
                            JSON.stringify({
                                dependencies: {
                                    typescript: typescriptVersion,
                                },
                            })
                        );
                }

                return result;
            },
        },
        transpiler: false,
    });
    let typescriptPromise: Promise<ITypescriptTranspiler>;

    return {
        translate(load) {
            if (!typescriptPromise) {
                typescriptPromise = transpilerRuntime.import('typescript');
            }

            return typescriptPromise.then(typescript => {
                const transpiled = typescript.transpileModule(load.source, {
                    compilerOptions: {
                        allowSyntheticDefaultImports: true,
                        esModuleInterop: true,
                        module: typescript.ModuleKind.System,
                    },
                });

                return transpiled.outputText;
            });
        },
    };
}
