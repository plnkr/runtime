import { RawSourceMap } from 'source-map';
import * as ts from 'typescript';

import { Runtime, SourceFile, SourceFileRecord } from '.';

export function transpileJs(
  runtime: Runtime,
  key: string,
  code: string
): Promise<SourceFile> {
  const configFileName =
    key.endsWith('.js') || key.endsWith('.jsx')
      ? './jsconfig.json'
      : './tsconfig.json';

  return runtime
    .resolve(configFileName)
    .catch(() => null)
    .then(resolvedConfigFileName => {
      const configFileResult: Promise<{
        compilerOptions?: ts.CompilerOptions;
      }> =
        typeof resolvedConfigFileName === 'string'
          ? runtime
              .import(resolvedConfigFileName)
              .catch(() => null)
              .then(data => data || {})
          : Promise.resolve({});
      const typescriptResult = <Promise<typeof ts>>(
        runtime.import('typescript', key)
      );

      return Promise.all([configFileResult, typescriptResult])
        .then(args => transpileWithCustomHost(key, code, args[0], args[1]))
        .then(sourceFileRecord => {
          if (resolvedConfigFileName) {
            runtime.registerDependency(key, resolvedConfigFileName);
          }

          return sourceFileRecord;
        });
    });
}

function transpileWithCustomHost(
  key: string,
  code: string,
  config: {
    compilerOptions?: ts.CompilerOptions;
  },
  typescript: typeof ts
): Promise<SourceFileRecord> | SourceFileRecord {
  const host = new RuntimeCompilerHost(typescript);
  const file = host.addFile(key, code, typescript.ScriptTarget.ES5);

  if (!file.output) {
    const compilerOptions: ts.CompilerOptions = {
      allowJs: true,
      jsx: typescript.JsxEmit.React,
      ...(config.compilerOptions || {}),
      allowNonTsExtensions: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      inlineSources: true,
      isolatedModules: true,
      lib: null,
      module: typescript.ModuleKind.System,
      noLib: true,
      sourceMap: true,
      suppressOutputPathCheck: true
    };
    const program = typescript.createProgram([key], compilerOptions, host);

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
        diag => diag.category === typescript.DiagnosticCategory.Error
      ),
      diags: diagnostics,
      js: jstext,
      sourceMap: maptext
    };
  }

  if (file.output.failure) {
    const error = new Error(
      `Compilation failed: ${file.output.diags.map(diag =>
        typescript.flattenDiagnosticMessageText(diag.messageText, '\n')
      )}`
    );

    return Promise.reject(error);
  }

  const record: SourceFileRecord = {
    source: file.output.js,
    sourceMap: <RawSourceMap>tryParse(file.output.sourceMap)
  };

  return record;
}

function tryParse(sourceMap: string): object | null {
  try {
    return JSON.parse(sourceMap);
  } catch (_) {
    return null;
  }
}

type TranspileResult = {
  failure: boolean;
  diags: Array<ts.Diagnostic>;
  js: string;
  sourceMap: string;
};

interface TypescriptSourceFile extends ts.SourceFile {
  output?: TranspileResult;
}

class RuntimeCompilerHost implements ts.CompilerHost {
  private files: { [s: string]: TypescriptSourceFile };

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

  public getSourceFile(fileName: string): TypescriptSourceFile {
    fileName = this.getCanonicalFileName(fileName);
    return this.files[fileName];
  }

  public getAllFiles(): TypescriptSourceFile[] {
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
  ): TypescriptSourceFile {
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
