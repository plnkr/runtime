import * as tslib_1 from "tslib";
export function transpileJs(runtime, key, code) {
    var configFileName = key.endsWith('.js') || key.endsWith('.jsx')
        ? './jsconfig.json'
        : './tsconfig.json';
    return runtime
        .resolve(configFileName)
        .catch(function () { return null; })
        .then(function (resolvedConfigFileName) {
        var configFileResult = typeof resolvedConfigFileName === 'string'
            ? runtime
                .import(resolvedConfigFileName)
                .catch(function () { return null; })
                .then(function (data) { return data || {}; })
            : Promise.resolve({});
        var typescriptResult = (runtime.import('typescript', key));
        return Promise.all([configFileResult, typescriptResult])
            .then(function (args) {
            return transpileWithCustomHost(key, code, args[0], args[1]);
        })
            .then(function (sourceFileRecord) {
            if (resolvedConfigFileName) {
                runtime.registerDependency(key, resolvedConfigFileName);
            }
            return sourceFileRecord;
        });
    });
}
function transpileWithCustomHost(key, code, config, typescript) {
    var host = new RuntimeCompilerHost(typescript);
    var file = host.addFile(key, code, typescript.ScriptTarget.ES5);
    if (!file.output) {
        var compilerOptions = tslib_1.__assign({ allowJs: true, jsx: typescript.JsxEmit.React }, (config.compilerOptions || {}), { allowNonTsExtensions: true, allowSyntheticDefaultImports: true, esModuleInterop: true, inlineSources: true, isolatedModules: true, lib: null, module: typescript.ModuleKind.System, noLib: true, sourceMap: true, suppressOutputPathCheck: true });
        var program = typescript.createProgram([key], compilerOptions, host);
        var jstext_1 = undefined;
        var maptext_1 = undefined;
        // Emit
        var emitResult = program.emit(undefined, function (outputName, output) {
            if (outputName.endsWith('.map')) {
                maptext_1 = output;
            }
            else {
                jstext_1 = output.slice(0, output.lastIndexOf('//#')); // remove sourceMappingURL
            }
        });
        var diagnostics = emitResult.diagnostics
            .concat(program.getOptionsDiagnostics())
            .concat(program.getSyntacticDiagnostics());
        file.output = {
            failure: diagnostics.some(function (diag) { return diag.category === typescript.DiagnosticCategory.Error; }),
            diags: diagnostics,
            js: jstext_1,
            sourceMap: maptext_1,
        };
    }
    if (file.output.failure) {
        var error = new Error("Compilation failed: " + file.output.diags.map(function (diag) {
            return typescript.flattenDiagnosticMessageText(diag.messageText, '\n');
        }));
        return Promise.reject(error);
    }
    var record = {
        source: file.output.js,
        sourceMap: tryParse(file.output.sourceMap),
    };
    return record;
}
function tryParse(sourceMap) {
    try {
        return JSON.parse(sourceMap);
    }
    catch (_) {
        return null;
    }
}
var RuntimeCompilerHost = /** @class */ (function () {
    function RuntimeCompilerHost(typescript) {
        this.typescript = typescript;
        this.files = {};
    }
    RuntimeCompilerHost.prototype.getDefaultLibFileName = function (options) {
        return this.getDefaultLibFilePaths(options)[0];
    };
    RuntimeCompilerHost.prototype.getDefaultLibFilePaths = function (options) {
        return options.lib
            ? options.lib.map(function (libName) { return "typescript/lib/lib." + libName + ".d.ts"; })
            : ['typescript/lib/lib.d.ts'];
    };
    RuntimeCompilerHost.prototype.useCaseSensitiveFileNames = function () {
        return false;
    };
    RuntimeCompilerHost.prototype.getCanonicalFileName = function (fileName) {
        return this.typescript.normalizePath(fileName);
    };
    RuntimeCompilerHost.prototype.getCurrentDirectory = function () {
        return '';
    };
    RuntimeCompilerHost.prototype.getNewLine = function () {
        return '\n';
    };
    RuntimeCompilerHost.prototype.readFile = function () {
        throw new Error('Not implemented');
    };
    RuntimeCompilerHost.prototype.writeFile = function () {
        throw new Error('Not implemented');
    };
    RuntimeCompilerHost.prototype.getSourceFile = function (fileName) {
        fileName = this.getCanonicalFileName(fileName);
        return this.files[fileName];
    };
    RuntimeCompilerHost.prototype.getAllFiles = function () {
        var _this = this;
        return Object.keys(this.files).map(function (key) { return _this.files[key]; });
    };
    RuntimeCompilerHost.prototype.fileExists = function (fileName) {
        return !!this.getSourceFile(fileName);
    };
    RuntimeCompilerHost.prototype.getDirectories = function () {
        throw new Error('Not implemented');
    };
    RuntimeCompilerHost.prototype.addFile = function (fileName, text, target) {
        fileName = this.getCanonicalFileName(fileName);
        var file = this.files[fileName];
        if (!file || file.text != text) {
            this.files[fileName] = this.typescript.createSourceFile(fileName, text, target || this.typescript.ScriptTarget.ES5);
        }
        return this.files[fileName];
    };
    return RuntimeCompilerHost;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamF2YXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9qYXZhc2NyaXB0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFLQSxNQUFNLHNCQUNGLE9BQWdCLEVBQ2hCLEdBQVcsRUFDWCxJQUFZO0lBRVosSUFBTSxjQUFjLEdBQ2hCLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDdkMsQ0FBQyxDQUFDLGlCQUFpQjtRQUNuQixDQUFDLENBQUMsaUJBQWlCLENBQUM7SUFFNUIsT0FBTyxPQUFPO1NBQ1QsT0FBTyxDQUFDLGNBQWMsQ0FBQztTQUN2QixLQUFLLENBQUMsY0FBTSxPQUFBLElBQUksRUFBSixDQUFJLENBQUM7U0FDakIsSUFBSSxDQUFDLFVBQUEsc0JBQXNCO1FBQ3hCLElBQU0sZ0JBQWdCLEdBR2xCLE9BQU8sc0JBQXNCLEtBQUssUUFBUTtZQUN0QyxDQUFDLENBQUMsT0FBTztpQkFDRixNQUFNLENBQUMsc0JBQXNCLENBQUM7aUJBQzlCLEtBQUssQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFKLENBQUksQ0FBQztpQkFDakIsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxJQUFJLEVBQUUsRUFBVixDQUFVLENBQUM7WUFDL0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIsSUFBTSxnQkFBZ0IsR0FBdUIsQ0FDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQ3BDLENBQUM7UUFFRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ25ELElBQUksQ0FBQyxVQUFBLElBQUk7WUFDTixPQUFBLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxF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