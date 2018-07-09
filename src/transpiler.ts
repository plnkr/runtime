import * as typescriptType from 'typescript';

import {
    ISystemModule,
    IRuntimeHost,
    IRuntimeOptions,
    ISystemPlugin,
    IRuntime,
} from '.';

export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    runtime: IRuntime;
    runtimeHost: IRuntimeHost;
    typescriptVersion: string;
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
        translate(load: ISystemModule) {
            const typescriptPromise: Promise<
                typeof typescriptType
            > = runtime.import('typescript');
            const tsconfigPromise = runtime
                .import('./tsconfig.json')
                .catch(() => null)
                .then(tsconfig => tsconfig || {});

            return Promise.all([typescriptPromise, tsconfigPromise]).then(
                ([typescript, tsconfig]) => {
                    const compilerOptions: typescriptType.CompilerOptions = {
                        jsx: typescript.JsxEmit.React,
                        ...(tsconfig.compilerOptions || {}),
                        allowSyntheticDefaultImports: true,
                        esModuleInterop: true,
                        module: typescript.ModuleKind.System,
                    };

                    // const transpiled = transpileModule(
                    //     typescript,
                    //     load,
                    //     compilerOptions
                    // );

                    const transpiled = typescript.transpileModule(load.source, {
                        compilerOptions,
                        moduleName: load.metadata.initialPath || load.name,
                    });

                    return transpiled.outputText;
                }
            );
        },
    };
}

// function transpileModule(
//     ts: typeof typescriptType,
//     load: ISystemModule,
//     options: typescriptType.CompilerOptions
// ): typescriptType.TranspileOutput {
//     options.isolatedModules = true;

//     // transpileModule does not write anything to disk so there is no need to verify that there are no conflicts between input and output paths.
//     options.suppressOutputPathCheck = true;

//     // Filename can be non-ts file.
//     options.allowNonTsExtensions = true;

//     // We are not returning a sourceFile for lib file when asked by the program,
//     // so pass --noLib to avoid reporting a file not found error.
//     options.noLib = true;

//     // Clear out other settings that would not be used in transpiling this module
//     options.lib = undefined;
//     options.types = undefined;
//     options.noEmit = undefined;
//     options.noEmitOnError = undefined;
//     options.paths = undefined;
//     options.rootDirs = undefined;
//     options.declaration = undefined;
//     options.declarationDir = undefined;
//     options.out = undefined;
//     options.outFile = undefined;

//     // We are not doing a full typecheck, we are not resolving the whole context,
//     // so pass --noResolve to avoid reporting missing file errors.
//     options.noResolve = true;

//     const sourceFile = ts.createSourceFile(
//         load.name,
//         load.source,
//         options.target
//     );
//     const newLine = '\n';

//     let outputText: string | undefined;
//     let sourceMapText: string | undefined;

//     const compilerHost: typescriptType.CompilerHost = {
//         getSourceFile: fileName =>
//             fileName === load.name ? sourceFile : undefined,
//         writeFile: (name, text) => {
//             if (name === load.name) {
//                 outputText = text;
//             } else {
//                 sourceMapText = text;
//             }
//         },
//         getDefaultLibFileName: () => 'lib.d.ts',
//         useCaseSensitiveFileNames: () => false,
//         getCanonicalFileName: fileName => fileName,
//         getCurrentDirectory: () => '',
//         getNewLine: () => newLine,
//         fileExists: (fileName): boolean => fileName === load.name,
//         readFile: () => '',
//         directoryExists: () => true,
//         getDirectories: () => [],
//     };
//     const program = ts.createProgram([load.name], options, compilerHost);

//     program.emit();

//     return {
//         outputText,
//         sourceMapText,
//     };
// }
