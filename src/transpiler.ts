import { JsxEmit, ModuleKind, transpileModule } from 'typescript';

import { IRuntimeHost, IRuntimeOptions, ISystemPlugin, IRuntime } from './';

export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    runtimeHost: IRuntimeHost;
    typescriptVersion: string;
}

interface ITypescriptTranspiler {
    JsxEmit: typeof JsxEmit;
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

            const tsconfigPromise = transpilerRuntime
                .import('tsconfig.json')
                .catch(() => null)
                .then(tsconfig => tsconfig || {});

            return Promise.all([typescriptPromise, tsconfigPromise]).then(
                ([typescript, tsconfig]) => {
                    const transpiled = typescript.transpileModule(load.source, {
                        compilerOptions: {
                            ...(tsconfig.compilerOptions || {}),
                            allowSyntheticDefaultImports: true,
                            esModuleInterop: true,
                            module: typescript.ModuleKind.System,
                        },
                    });

                    return transpiled.outputText;
                }
            );
        },
    };
}
