import { JsxEmit, ModuleKind, transpileModule } from 'typescript';

import { IRuntimeHost, IRuntimeOptions, ISystemPlugin, IRuntime } from './';

export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    runtime: IRuntime;
    runtimeHost: IRuntimeHost;
    typescriptVersion: string;
}

interface ITypescriptTranspiler {
    JsxEmit: typeof JsxEmit;
    transpileModule: typeof transpileModule;
    ModuleKind: typeof ModuleKind;
}

export function createTranspiler({
    runtime,
}: ITranspilerOptions): ISystemPlugin {
    // const transpilerRuntime = createRuntime({
    //     defaultDependencies: {
    //         typescript: typescriptVersion,
    //     },
    //     runtimeHost,
    //     transpiler: false,
    // });

    return {
        translate(load) {
            const typescriptPromise: Promise<
                ITypescriptTranspiler
            > = runtime.import('typescript');
            const tsconfigPromise = runtime
                .import('tsconfig.json')
                .catch(() => null)
                .then(tsconfig => tsconfig || {});

            return Promise.all([typescriptPromise, tsconfigPromise]).then(
                ([typescript, tsconfig]) => {
                    const transpiled = typescript.transpileModule(load.source, {
                        compilerOptions: {
                            jsx: typescript.JsxEmit.React,
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
