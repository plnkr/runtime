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
            try {
                return transpileWithCustomHost(key, code, args[0], args[1]);
            }
            catch (error) {
                return Promise.reject(error);
            }
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
        throw error;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamF2YXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9qYXZhc2NyaXB0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFJQSxNQUFNLHNCQUNGLE9BQWdCLEVBQ2hCLEdBQVcsRUFDWCxJQUFZO0lBRVosSUFBTSxjQUFjLEdBQ2hCLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDdkMsQ0FBQyxDQUFDLGlCQUFpQjtRQUNuQixDQUFDLENBQUMsaUJBQWlCLENBQUM7SUFFNUIsT0FBTyxPQUFPO1NBQ1QsT0FBTyxDQUFDLGNBQWMsQ0FBQztTQUN2QixLQUFLLENBQUMsY0FBTSxPQUFBLElBQUksRUFBSixDQUFJLENBQUM7U0FDakIsSUFBSSxDQUFDLFVBQUEsc0JBQXNCO1FBQ3hCLElBQU0sZ0JBQWdCLEdBR2xCLE9BQU8sc0JBQXNCLEtBQUssUUFBUTtZQUN0QyxDQUFDLENBQUMsT0FBTztpQkFDRixNQUFNLENBQUMsc0JBQXNCLENBQUM7aUJBQzlCLEtBQUssQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFKLENBQUksQ0FBQztpQkFDakIsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxJQUFJLEVBQUUsRUFBVixDQUFVLENBQUM7WUFDL0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIsSUFBTSxnQkFBZ0IsR0FBdUIsQ0FDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQ3BDLENBQUM7UUFFRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ25ELElBQUksQ0FBQyxVQUFBLElBQUk7WUFDTixJQUFJO2dCQUNBLE9BQU8sdUJBQXVCLENBQzFCLEdBQUcsRUFDSCxJQUFJLEVBQ0osSUFBSSxDQUFD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