import { ModuleKind, transpileModule } from 'typescript';

import { IRuntimeOptions, ISystemPlugin, IRuntime } from './';

export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    typescriptVersion: string;
}

interface ITypescriptTranspiler {
    transpileModule: typeof transpileModule;
    ModuleKind: typeof ModuleKind;
}

export function createTranspiler({
    createRuntime,
    typescriptVersion,
}: ITranspilerOptions): ISystemPlugin {
    const transpilerRuntime = createRuntime({
        runtimeHost: {
            async getFileContents(pathname) {
                if (pathname === 'package.json') {
                    return JSON.stringify({
                        dependencies: {
                            typescript: typescriptVersion,
                        },
                    });
                }
            },
        },
        transpiler: false,
    });
    let typescriptPromise: Promise<{ default: ITypescriptTranspiler }>;

    return {
        async translate(load) {
            if (!typescriptPromise) {
                typescriptPromise = transpilerRuntime.import('typescript');
            }

            const typescript = (await typescriptPromise).default;
            const transpiled = typescript.transpileModule(load.source, {
                compilerOptions: {
                    allowSyntheticDefaultImports: true,
                    esModuleInterop: true,
                    module: typescript.ModuleKind.System,
                },
            });

            return transpiled.outputText;
        },
    };
}
