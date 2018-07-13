import * as tslib_1 from "tslib";
var transpilerInstances = new WeakMap();
export function transpileJs(runtime, key, code) {
    var configFileName = key.endsWith('.js') || key.endsWith('.jsx')
        ? './jsconfig.json'
        : './tsconfig.json';
    var configFileResult = runtime
        .import(configFileName, key)
        .catch(function () { return null; })
        .then(function (data) { return data || {}; });
    var typescriptResult = runtime.import('typescript', key);
    return Promise.all([configFileResult, typescriptResult]).then(function (args) {
        var _a = tslib_1.__read(args, 2), config = _a[0], typescript = _a[1];
        if (!transpilerInstances.has(args)) {
            transpilerInstances.set(args, new RuntimeCompilerHost(typescript));
        }
        var host = transpilerInstances.get(args);
        var file = host.addFile(key, code, typescript.ScriptTarget.ES5);
        if (!file.output) {
            var compilerOptions = tslib_1.__assign({ allowJs: true, jsx: typescript.JsxEmit.React }, (config.compilerOptions || {}), { allowNonTsExtensions: true, allowSyntheticDefaultImports: true, esModuleInterop: true, isolatedModules: true, lib: null, module: typescript.ModuleKind.System, noLib: true, suppressOutputPathCheck: true });
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
                failure: diagnostics.some(function (diag) {
                    return diag.category === typescript.DiagnosticCategory.Error;
                }),
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
        return file.output.js;
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamF2YXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9qYXZhc2NyaXB0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFJQSxJQUFNLG1CQUFtQixHQUFHLElBQUksT0FBTyxFQVFwQyxDQUFDO0FBRUosTUFBTSxzQkFDRixPQUFnQixFQUNoQixHQUFXLEVBQ1gsSUFBWTtJQUVaLElBQU0sY0FBYyxHQUNoQixHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxpQkFBaUI7UUFDbkIsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO0lBQzVCLElBQU0sZ0JBQWdCLEdBRWpCLE9BQU87U0FDUCxNQUFNLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQztTQUMzQixLQUFLLENBQUMsY0FBTSxPQUFBLElBQUksRUFBSixDQUFJLENBQUM7U0FDakIsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxJQUFJLEVBQUUsRUFBVixDQUFVLENBQUMsQ0FBQztJQUM5QixJQUFNLGdCQUFnQixHQUF1QixPQUFPLENBQUMsTUFBTSxDQUN2RCxZQUFZLEVBQ1osR0FBRyxDQUNOLENBQUM7SUFFRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSTtRQUN4RCxJQUFBLDRCQUEyQixFQUExQixjQUFNLEVBQUUsa0JBQVUsQ0FBUztRQUVsQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1NBQ3RFO1FBRUQsSUFBTSxJQUFJLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUks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