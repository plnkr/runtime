import * as tslib_1 from "tslib";
import { baseURI, toStringTag } from 'es-module-loader/core/common';
import RegisterLoader from 'es-module-loader/core/register-loader';
import { ModuleNamespace, } from 'es-module-loader/core/loader-polyfill';
import convertRange from 'sver/convert-range';
import { transpileCssToSystemRegister } from './css';
import { transpileJs } from './javascript';
import { transpileVue } from './vue';
export var CDN_ESM_URL = 'https://dev.jspm.io';
export var CDN_SYSTEM_URL = 'https://system-dev.jspm.io';
var DEFAULT_DEPENDENCY_VERSIONS = {
    '@vue/component-compiler-utils': '2.1',
    less: '2.7',
    'source-map': '0.7.3',
    typescript: '2.9',
    'vue-template-compiler': '2.5',
};
var EMPTY_MODULE = new ModuleNamespace({});
var NPM_MODULE_RX = /^((?:@[^/]+\/)?[^/]+)(\/.*)?$/;
// From SystemJS: https://github.com/systemjs/systemjs/blob/501d1a0b9e32e00d54c9cd747e3236a9df88a1a3/src/instantiate.js#L418
var LEADING_COMMENT_AND_META_RX = /^(\s*\/\*[^*]*(\*(?!\/)[^*]*)*\*\/|\s*\/\/[^\n]*|\s*"[^"]+"\s*;?|\s*'[^']+'\s*;?)*\s*/;
function detectRegisterFormat(source) {
    var leadingCommentAndMeta = source.match(LEADING_COMMENT_AND_META_RX);
    if (!leadingCommentAndMeta)
        return false;
    var codeStart = leadingCommentAndMeta[0].length;
    return (source.startsWith('System.register', codeStart) ||
        source.startsWith('SystemJS.register', codeStart));
}
var RuntimeModuleNamespace = /** @class */ (function (_super) {
    tslib_1.__extends(RuntimeModuleNamespace, _super);
    function RuntimeModuleNamespace(baseObject) {
        var _this = this;
        if (baseObject instanceof Object &&
            !baseObject.__useDefault &&
            'default' in baseObject &&
            Object.keys(baseObject).length <= 1) {
            if (typeof baseObject.default === 'function') {
                if (typeof Symbol !== 'undefined') {
                    Object.defineProperty(baseObject.default, toStringTag, {
                        value: 'Module',
                    });
                }
                Object.defineProperty(baseObject.default, 'default', {
                    enumerable: true,
                    get: function () {
                        return baseObject.default;
                    },
                });
                return baseObject.default;
            }
            Object.keys(baseObject.default).forEach(function (key) {
                Object.defineProperty(baseObject, key, {
                    enumerable: true,
                    get: function () {
                        return baseObject.default[key];
                    },
                });
            });
        }
        _this = _super.call(this, baseObject) || this;
        return _this;
    }
    return RuntimeModuleNamespace;
}(ModuleNamespace));
export { RuntimeModuleNamespace };
if (toStringTag) {
    Object.defineProperty(RuntimeModuleNamespace.prototype, toStringTag, {
        value: 'Module',
    });
}
var Runtime = /** @class */ (function (_super) {
    tslib_1.__extends(Runtime, _super);
    function Runtime(_a) {
        var _b = _a.baseUri, baseUri = _b === void 0 ? baseURI : _b, _c = _a.defaultDependencyVersions, defaultDependencyVersions = _c === void 0 ? {} : _c, host = _a.host, _d = _a.useSystem, useSystem = _d === void 0 ? !!(window || global)['PLNKR_RUNTIME_USE_SYSTEM'] : _d;
        var _this = _super.call(this) || this;
        if (typeof baseUri !== 'string') {
            throw new TypeError('The options.baseUri property, if specified, must be a string');
        }
        _this.baseUri = baseUri.endsWith('/') ? baseUri : baseUri + "/";
        _this.injectedFiles = new Map();
        _this.useSystem = useSystem;
        if (!host) {
            throw new TypeError('The options.host property is required');
        }
        if (host.getCanonicalPath &&
            typeof host.getCanonicalPath !== 'function') {
            throw new TypeError('The options.host.getCanonicalPath property, if specified, must be a function');
        }
        _this[RegisterLoader.moduleNamespace] = RuntimeModuleNamespace;
        _this.host = host;
        _this.queue = Promise.resolve();
        _this.defaultDependencyVersions = tslib_1.__assign({}, DEFAULT_DEPENDENCY_VERSIONS, defaultDependencyVersions);
        _this.dependencies = new Map();
        _this.dependents = new Map();
        _this.inject('@empty', {
            source: 'System.register([], function(e) { return { execute: function() { e("exports", {}) } } })',
        });
        return _this;
    }
    Runtime.prototype[(RegisterLoader.moduleNamespace, RegisterLoader.traceLoad)] = function (load) {
        var instance = this.registry.get(load.key);
        var previousInstance = this.registry.get(load.key + "@prev");
        if (instance &&
            previousInstance &&
            typeof previousInstance.__onReplace === 'function') {
            var event_1 = {
                previousInstance: previousInstance,
            };
            previousInstance.__onReplace(event_1);
        }
    };
    Runtime.prototype[RegisterLoader.traceResolvedStaticDependency] = function (parentKey, _, key) {
        this.registerDependency(parentKey, key);
    };
    Runtime.prototype[RegisterLoader.resolve] = function (key, parentKey) {
        var _this = this;
        if (this.injectedFiles.has(key)) {
            return key;
        }
        var urlResult = _super.prototype[RegisterLoader.resolve].call(this, key, parentKey || this.baseUri);
        return Promise.resolve(urlResult).then(function (url) {
            if (url) {
                if (_this.injectedFiles.has(url)) {
                    return url;
                }
                if (!url.startsWith(_this.baseUri)) {
                    return url;
                }
                var hostRequest_1 = url.slice(_this.baseUri.length);
                var hostResolveResult = hostResolve(_this.host, hostRequest_1);
                return Promise.resolve(hostResolveResult).then(function (hostResolution) {
                    if (typeof hostResolution !== 'string') {
                        return (Promise.reject(new Error("Failed to resolve host module '" + hostRequest_1 + "'")));
                    }
                    return "" + _this.baseUri + hostResolution;
                });
            }
            if (typeof _this.host.resolveBareDependency === 'function') {
                var resolveResult = _this.host.resolveBareDependency(key);
                return Promise.resolve(resolveResult).then(function (result) {
                    return result;
                });
            }
            var matches = key.match(NPM_MODULE_RX);
            var moduleName = (matches && matches[1]) || key;
            var modulePath = (matches && matches[2]) || '';
            return _this.resolve('./package.json')
                .catch(function () { return null; })
                .then(function (resolvedPackageJsonKey) {
                var packageJsonResult = typeof resolvedPackageJsonKey === 'string'
                    ? _this.import(resolvedPackageJsonKey).catch(function (error) {
                        return typeof _this.host.getCanonicalPath ===
                            'function'
                            ? Promise.reject(new Error("Error loading '" + key + "' because 'package.json' is invalid: " + error.message))
                            : {};
                    })
                    : Promise.resolve({});
                return packageJsonResult
                    .then(function (packageJson) {
                    var devDependencies = (packageJson &&
                        packageJson['devDependencies']) ||
                        {};
                    var dependencies = (packageJson && packageJson['dependencies']) ||
                        {};
                    var range = dependencies[moduleName] ||
                        devDependencies[moduleName] ||
                        _this.defaultDependencyVersions[moduleName];
                    var spec = range ? createJspmRange(range) : '';
                    return dynamicImport && !_this.useSystem
                        ? CDN_ESM_URL + "/" + moduleName + spec + modulePath
                        : CDN_SYSTEM_URL + "/" + moduleName + spec + modulePath;
                })
                    .then(function (resolvedKey) {
                    if (resolvedPackageJsonKey) {
                        _this.registerDependency(resolvedKey, resolvedPackageJsonKey);
                    }
                    return resolvedKey;
                });
            });
        });
    };
    Runtime.prototype[RegisterLoader.instantiate] = function (key, processAnonRegister) {
        if (this.injectedFiles.has(key)) {
            var injectedFile = this.injectedFiles.get(key);
            var instantiateResult = instantiate(this, key, injectedFile.source, processAnonRegister);
            return Promise.resolve(instantiateResult);
        }
        if (key.startsWith(this.baseUri)) {
            var loadHostResult = loadHostModule(this, key, processAnonRegister);
            return Promise.resolve(loadHostResult);
        }
        var loadRemoteResult = loadRemoteModule(this, key, processAnonRegister);
        return Promise.resolve(loadRemoteResult);
    };
    Runtime.prototype.inject = function (key, file) {
        this.injectedFiles.set(key, file);
    };
    Runtime.prototype.invalidate = function () {
        var _this = this;
        var pathnames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            pathnames[_i] = arguments[_i];
        }
        var getDependents = function (normalizedPath) {
            if (_this.dependents.has(normalizedPath)) {
                return Array.from(_this.dependents.get(normalizedPath));
            }
            return [];
        };
        var seen = new Set();
        var invalidationPromise = this.queue.then(function () {
            var invalidations = tslib_1.__spread(pathnames);
            var handleNextInvalidation = function () {
                if (!invalidations.length)
                    return Promise.resolve();
                var pathname = invalidations.shift();
                return _this.resolve(pathname).then(function (resolvedPathname) {
                    var e_1, _a;
                    if (!seen.has(resolvedPathname)) {
                        seen.add(resolvedPathname);
                        var dependents = getDependents(resolvedPathname);
                        var instance = _this.registry.get(resolvedPathname);
                        var event_2 = {
                            propagationStopped: false,
                            stopPropagation: function () {
                                this.defaultPrevented = true;
                            },
                        };
                        if (instance &&
                            typeof instance.__onAfterUnload === 'function') {
                            instance.__onAfterUnload(event_2);
                        }
                        _this.registry.delete(resolvedPathname);
                        _this.dependencies.delete(resolvedPathname);
                        _this.dependents.delete(resolvedPathname);
                        if (!event_2.propagationStopped) {
                            try {
                                for (var dependents_1 = tslib_1.__values(dependents), dependents_1_1 = dependents_1.next(); !dependents_1_1.done; dependents_1_1 = dependents_1.next()) {
                                    var dependent = dependents_1_1.value;
                                    invalidations.push(dependent);
                                }
                            }
                            catch (e_1_1) { e_1 = { error: e_1_1 }; }
                            finally {
                                try {
                                    if (dependents_1_1 && !dependents_1_1.done && (_a = dependents_1.return)) _a.call(dependents_1);
                                }
                                finally { if (e_1) throw e_1.error; }
                            }
                        }
                    }
                    return handleNextInvalidation();
                });
            };
            return handleNextInvalidation();
        });
        this.queue = invalidationPromise.catch(function () { return undefined; });
        return invalidationPromise;
    };
    Runtime.prototype.registerDependency = function (parentKey, key) {
        if (!this.dependencies.has(parentKey)) {
            this.dependencies.set(parentKey, new Set());
        }
        this.dependencies.get(parentKey).add(key);
        if (!this.dependents.has(key)) {
            this.dependents.set(key, new Set());
        }
        this.dependents.get(key).add(parentKey);
    };
    return Runtime;
}(RegisterLoader));
export { Runtime };
var dynamicImport = (function () {
    try {
        return new Function('spec', 'return import(spec)');
    }
    catch (__) {
        return null;
    }
})();
function hostResolve(host, key) {
    if (typeof host.getCanonicalPath === 'function') {
        return host.getCanonicalPath(key);
    }
    return key;
}
var EXT_RX = /(\.[^./]+)$/;
function getExt(filename) {
    var matches = filename.match(EXT_RX);
    return matches ? matches[1] : '';
}
function instantiate(runtime, key, code, processAnonRegister) {
    var ext = getExt(key);
    switch (ext) {
        case '.json':
            return instantiateJson(runtime, key, code);
        case '.css':
        case '.less':
            return instantiateCss(runtime, key, code, processAnonRegister);
        case '.vue':
            return instantiateVue(runtime, key, code, processAnonRegister);
        default:
            return instantiateJavascript(runtime, key, code, processAnonRegister);
    }
}
function instantiateCss(runtime, key, code, processAnonRegister) {
    var transpileResult = transpileCssToSystemRegister(runtime, key, code);
    return Promise.resolve(transpileResult).then(function (transpiledCode) {
        return instantiateJavascript(runtime, key, transpiledCode, processAnonRegister);
    });
}
function instantiateJson(runtime, _, code) {
    return new runtime[RegisterLoader.moduleNamespace](JSON.parse(code));
}
function instantiateJavascript(runtime, key, codeOrRecord, processAnonRegister) {
    var code = typeof codeOrRecord === 'string' ? codeOrRecord : codeOrRecord.source;
    var systemRegisterCodeResult = detectRegisterFormat(code)
        ? codeOrRecord
        : transpileJs(runtime, key, code);
    return Promise.resolve(systemRegisterCodeResult).then(function (transpiledCodeOrRecord) {
        var code = typeof transpiledCodeOrRecord === 'string'
            ? annotateCodeSource(transpiledCodeOrRecord, key)
            : annotateCodeSource(transpiledCodeOrRecord.source, key, transpiledCodeOrRecord.sourceMap);
        var moduleFactory = new Function('System', 'SystemJS', code);
        moduleFactory(runtime, runtime);
        if (!processAnonRegister()) {
            return EMPTY_MODULE;
        }
    });
}
function instantiateVue(runtime, key, code, processAnonRegister) {
    var transpileResult = transpileVue(runtime, key, code);
    return Promise.resolve(transpileResult).then(function (sourceFileRecord) {
        return instantiateJavascript(runtime, key, sourceFileRecord, processAnonRegister);
    });
}
var SOURCE_MAP_PREFIX = '\n//# sourceMapping' + 'URL=data:application/json;base64,';
function inlineSourceMap(sourceMap) {
    var sourceMapString;
    try {
        sourceMapString =
            typeof sourceMap === 'string'
                ? sourceMap
                : JSON.stringify(sourceMap);
    }
    catch (_) {
        sourceMapString = '';
    }
    if (typeof btoa !== 'undefined')
        return (SOURCE_MAP_PREFIX +
            btoa(unescape(encodeURIComponent(sourceMapString))));
    else
        return '';
}
function annotateCodeSource(code, filename, sourceMap) {
    var suffix = (sourceMap && inlineSourceMap(sourceMap)) ||
        "\n//# sourceURL=" + filename;
    return "" + code + suffix;
}
function loadRemoteModule(runtime, key, processAnonRegister) {
    if (typeof dynamicImport === 'function' && !runtime.useSystem) {
        var dynamicImportResult = dynamicImport(key);
        return Promise.resolve(dynamicImportResult).then(function (esModule) {
            var moduleNamespaceConstructor = runtime[RegisterLoader.moduleNamespace];
            // const baseObject =
            //     Object.keys(moduleExports).length <= 1 &&
            //     'default' in moduleExports
            //         ? moduleExports.default
            //         : moduleExports;
            if (esModule.default) {
                var baseObject = esModule.default;
                var descriptors = Object.getOwnPropertyDescriptors(esModule.default);
                Object.defineProperty(baseObject, '__esModule', {
                    value: true,
                });
                Object.defineProperty(baseObject, '__useDefault', {
                    value: esModule.default,
                });
                Object.defineProperty(baseObject, 'default', {
                    enumerable: true,
                    get: function () {
                        return esModule.default;
                    },
                });
                Object.defineProperties(baseObject, descriptors);
                if (toStringTag) {
                    Object.defineProperty(baseObject, toStringTag, {
                        value: 'Module',
                    });
                }
                return baseObject;
            }
            return new moduleNamespaceConstructor(esModule);
        });
    }
    return fetch(key)
        .then(function (res) { return res.text(); })
        .then(function (code) { return instantiate(runtime, key, code, processAnonRegister); });
}
function loadHostModule(runtime, key, processAnonRegister) {
    var hostKey = key.slice(runtime.baseUri.length);
    var codeResult = runtime.host.getFileContents(hostKey);
    return Promise.resolve(codeResult).then(function (code) {
        if (typeof code !== 'string') {
            return Promise.reject(new Error("The runtime host returned non-string file contents for '" + key + "'"));
        }
        return instantiate(runtime, key, code, processAnonRegister);
    });
}
function createJspmRange(semverRange) {
    var range = convertRange(semverRange);
    var versionString = '';
    if (range.isExact)
        versionString = '@' + range.version.toString();
    else if (range.isStable)
        versionString = '@' + range.version.major + '.' + range.version.minor;
    else if (range.isMajor)
        versionString = '@' + range.version.major;
    return versionString;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEUsT0FBTyxjQUVOLE1BQU0sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxFQUNILGVBQWUsR0FFbEIsTUFBTSx1Q0FBdUMsQ0FBQztBQUUvQyxPQUFPLFlBQVksTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMzQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sT0FBTyxDQUFDO0FBK0JyQyxNQUFNLENBQUMsSUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUM7QUFDakQsTUFBTSxDQUFDLElBQU0sY0FBYyxHQUFHLDRCQUE0QixDQUFDO0FBQzNELElBQU0sMkJBQTJCLEdBQUc7SUFDaEMsK0JBQStCLEVBQUUsS0FBSztJQUN0QyxJQUFJLEVBQUUsS0FBSztJQUNYLFlBQVksRUFBRSxPQUFPO0lBQ3JCLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLHVCQUF1QixFQUFFLEtBQUs7Q0FDakMsQ0FBQztBQUNGLElBQU0sWUFBWSxHQUFHLElBQUksZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLElBQU0sYUFBYSxHQUFHLCtCQUErQixDQUFDO0FBRXRELDRIQUE0SDtBQUM1SCxJQUFNLDJCQUEyQixHQUFHLHVGQUF1RixDQUFDO0FBQzVILDhCQUE4QixNQUFjO0lBQ3hDLElBQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ3hFLElBQUksQ0FBQyxxQkFBcUI7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN6QyxJQUFJLFNBQVMsR0FBRyxxQkFBcUIsQ0FB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