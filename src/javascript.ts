import * as ts from 'typescript';

import { Runtime } from '.';

const transpilerInstances = new WeakMap<
    [
        {
            compilerOptions?: ts.CompilerOptions;
        },
        typeof ts
    ],
    RuntimeCompilerHost
>();

export function transpileJs(
    runtime: Runtime,
    key: string,
    code: string
): Promise<string> {
    const configFileName =
        key.endsWith('.js') || key.endsWith('.jsx')
            ? './jsconfig.json'
            : './tsconfig.json';
    const configFileResult: Promise<{
        compilerOptions?: ts.CompilerOptions;
    }> = runtime
        .import(configFileName, key)
        .catch(() => null)
        .then(data => data || {});
    const typescriptResult: Promise<typeof ts> = runtime.import(
        'typescript',
        key
    );

    return Promise.all([configFileResult, typescriptResult]).then(args => {
        const [config, typescript] = args;

        if (!transpilerInstances.has(args)) {
            transpilerInstances.set(args, new RuntimeCompilerHost(typescript));
        }

        const host = transpilerInstances.get(args);
        const file = host.addFile(key, code, typescript.ScriptTarget.ES5);

        if (!file.output) {
            const compilerOptions: ts.CompilerOptions = {
                allowJs: true,
                jsx: typescript.JsxEmit.React,
                ...(config.compilerOptions || {}),
                allowNonTsExtensions: true,
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                isolatedModules: true,
                lib: null,
                module: typescript.ModuleKind.System,
                noLib: true,
                suppressOutputPathCheck: true,
            };
            const program = typescript.createProgram(
                [key],
                compilerOptions,
                host
            );

            let jstext: string = undefined;
            let maptext: string = undefined;

            // Emit
            const emitResult = program.emit(undefined, (outputName, output) => {
                if (outputName.endsWith('.map')) {
                    maptext = output;
                } else {
                    jstext = output.slice(0, output.lastIndexOf('//#')); // remove sourceMappingURL
                }
            });

            const diagnostics = emitResult.diagnostics
                .concat(program.getOptionsDiagnostics())
                .concat(program.getSyntacticDiagnostics());

            file.output = {
                failure: diagnostics.some(
                    diag =>
                        diag.category === typescript.DiagnosticCategory.Error
                ),
                diags: diagnostics,
                js: jstext,
                sourceMap: maptext,
            };
        }

        if (file.output.failure) {
            const error = new Error(
                `Compilation failed: ${file.output.diags.map(diag =>
                    typescript.flattenDiagnosticMessageText(
                        diag.messageText,
                        '\n'
                    )
                )}`
            );

            throw error;
        }

        return file.output.js;
    });
}

type TranspileResult = {
    failure: boolean;
    diags: Array<ts.Diagnostic>;
    js: string;
    sourceMap: string;
};

interface SourceFile extends ts.SourceFile {
    output?: TranspileResult;
}

class RuntimeCompilerHost implements ts.CompilerHost {
    private files: { [s: string]: SourceFile };

    constructor(private typescript: typeof ts) {
        this.files = {};
    }

    public getDefaultLibFileName(options: ts.CompilerOptions): string {
        return this.getDefaultLibFilePaths(options)[0];
    }

    public getDefaultLibFilePaths(options: ts.CompilerOptions): string[] {
        return options.lib
            ? options.lib.map(libName => `typescript/lib/lib.${libName}.d.ts`)
            : ['typescript/lib/lib.d.ts'];
    }

    public useCaseSensitiveFileNames(): boolean {
        return false;
    }

    public getCanonicalFileName(fileName: string): string {
        return (this.typescript as any).normalizePath(fileName);
    }

    public getCurrentDirectory(): string {
        return '';
    }

    public getNewLine(): string {
        return '\n';
    }

    public readFile(): string {
        throw new Error('Not implemented');
    }

    public writeFile() {
        throw new Error('Not implemented');
    }

    public getSourceFile(fileName: string): SourceFile {
        fileName = this.getCanonicalFileName(fileName);
        return this.files[fileName];
    }

    public getAllFiles(): SourceFile[] {
        return Object.keys(this.files).map(key => this.files[key]);
    }

    public fileExists(fileName: string): boolean {
        return !!this.getSourceFile(fileName);
    }

    public getDirectories(): string[] {
        throw new Error('Not implemented');
    }

    public addFile(
        fileName: string,
        text: string,
        target: ts.ScriptTarget
    ): SourceFile {
        fileName = this.getCanonicalFileName(fileName);
        const file = this.files[fileName];

        if (!file || file.text != text) {
            this.files[fileName] = this.typescript.createSourceFile(
                fileName,
                text,
                target || this.typescript.ScriptTarget.ES5
            );
        }

        return this.files[fileName];
    }
}
