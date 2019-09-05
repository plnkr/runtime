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
        if (Array.isArray(baseObject)) {
            Object.defineProperty(baseObject, toStringTag, {
                value: 'Module',
            });
            return baseObject;
        }
        if (baseObject instanceof Object &&
            !baseObject.__useDefault &&
            'default' in baseObject &&
            Object.keys(baseObject).length <= 1) {
            Object.keys(baseObject.default).forEach(function (key) {
                Object.defineProperty(baseObject, key, {
                    enumerable: true,
                    get: function () {
                        return baseObject.default[key];
                    },
                });
            });
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
        return _this;
    }
    Runtime.prototype[(RegisterLoader.moduleNamespace, RegisterLoader.traceLoad)] = function (load, link) {
        var instance = this.registry.get(load.key) || link.moduleObj;
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
    Runtime.prototype.invalidate = function (key, parentKey) {
        var _this = this;
        var getDependents = function (normalizedPath) {
            if (_this.dependents.has(normalizedPath)) {
                return Array.from(_this.dependents.get(normalizedPath));
            }
            return [];
        };
        var seen = new Set();
        var invalidationPromise = this.queue.then(function () {
            var invalidations = [[key, parentKey]];
            var handleNextInvalidation = function () {
                if (!invalidations.length)
                    return Promise.resolve();
                var _a = tslib_1.__read(invalidations.shift(), 2), key = _a[0], parentKey = _a[1];
                return _this.resolve(key, parentKey).then(function (resolvedPathname) {
                    var e_1, _a;
                    if (!seen.has(resolvedPathname)) {
                        seen.add(resolvedPathname);
                        var dependents = getDependents(resolvedPathname);
                        var instance = _this.registry.get(resolvedPathname);
                        var event_2 = {
                            propagationStopped: false,
                            defaultPrevented: false,
                            preventDefault: function () {
                                this.defaultPrevented = true;
                            },
                            stopPropagation: function () {
                                this.propagationStopped = true;
                            },
                        };
                        _this.registry.delete(resolvedPathname);
                        _this.dependencies.delete(resolvedPathname);
                        _this.dependents.delete(resolvedPathname);
                        if (instance) {
                            if (typeof instance.__onAfterUnload === 'function') {
                                instance.__onAfterUnload(event_2);
                            }
                            if (!event_2.propagationStopped) {
                                try {
                                    for (var dependents_1 = tslib_1.__values(dependents), dependents_1_1 = dependents_1.next(); !dependents_1_1.done; dependents_1_1 = dependents_1.next()) {
                                        var dependent = dependents_1_1.value;
                                        invalidations.push([dependent]);
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
                            if (event_2.defaultPrevented) {
                                _this.registry.set(resolvedPathname + "@prev", instance);
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
function instantiateJson(_, key, code) {
    try {
        var parsed_1 = JSON.parse(code);
        Object.defineProperty(parsed_1, 'default', {
            enumerable: true,
            get: function () {
                return parsed_1;
            },
        });
        Object.defineProperty(parsed_1, toStringTag, {
            value: 'Module',
        });
        return parsed_1;
    }
    catch (e) {
        throw new Error("Error parsing json '" + key + "': " + e.message);
    }
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
        var moduleFactory = new Function('System', 'SystemJS', 'module', code);
        moduleFactory(runtime, runtime, {
            id: key,
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEUsT0FBTyxjQUdOLE1BQU0sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxFQUNILGVBQWUsR0FFbEIsTUFBTSx1Q0FBdUMsQ0FBQztBQUUvQyxPQUFPLFlBQVksTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMzQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sT0FBTyxDQUFDO0FBaUNyQyxNQUFNLENBQUMsSUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUM7QUFDakQsTUFBTSxDQUFDLElBQU0sY0FBYyxHQUFHLDRCQUE0QixDQUFDO0FBQzNELElBQU0sMkJBQTJCLEdBQUc7SUFDaEMsK0JBQStCLEVBQUUsS0FBSztJQUN0QyxJQUFJLEVBQUUsS0FBSztJQUNYLFlBQVksRUFBRSxPQUFPO0lBQ3JCLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLHVCQUF1QixFQUFFLEtBQUs7Q0FDakMsQ0FBQztBQUNGLElBQU0sWUFBWSxHQUFHLElBQUksZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLElBQU0sYUFBYSxHQUFHLCtCQUErQixDQUFDO0FBRXRELDRIQUE0SDtBQUM1SCxJQUFNLDJCQUEyQixHQUFHLHVGQUF1RixDQUFDO0FBQzVILDhCQUE4QixNQUFjO0lBQ3hDLElBQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ3hFLElBQUksQ0FBQyxxQkFBcUI7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN6QyxJQUFJLFNBQVMsR0FBRyxxQkFBcUIsQ0FB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