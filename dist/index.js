import * as tslib_1 from "tslib";
import { toStringTag } from 'es-module-loader/core/common';
import RegisterLoader from 'es-module-loader/core/register-loader';
import { ModuleNamespace, } from 'es-module-loader/core/loader-polyfill';
import convertRange from 'sver/convert-range';
import { transpileCss } from './css';
import { transpileJs } from './javascript';
export var CDN_ESM_URL = 'https://dev.jspm.io';
export var CDN_SYSTEM_URL = 'https://system-dev.jspm.io';
var DEFAULT_DEPENDENCY_VERSIONS = {
    less: '2.7',
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
        var _b = _a.defaultDependencyVersions, defaultDependencyVersions = _b === void 0 ? {} : _b, host = _a.host, _c = _a.useSystem, useSystem = _c === void 0 ? !!(window || global)['PLNKR_RUNTIME_USE_SYSTEM'] : _c;
        var _this = _super.call(this, document.baseURI) || this;
        _this.baseUri = document.baseURI.endsWith('/')
            ? document.baseURI
            : document.baseURI + "/";
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
        var urlResult = _super.prototype[RegisterLoader.resolve].call(this, key, parentKey);
        return Promise.resolve(urlResult).then(function (url) {
            if (url) {
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
        if (key.startsWith(this.baseUri)) {
            var loadHostResult = loadHostModule(this, key, processAnonRegister);
            return Promise.resolve(loadHostResult);
        }
        var loadRemoteResult = loadRemoteModule(this, key, processAnonRegister);
        return Promise.resolve(loadRemoteResult);
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
        default:
            return instantiateJavascript(runtime, key, code, processAnonRegister);
    }
}
function instantiateCss(runtime, key, code, processAnonRegister) {
    var transpileResult = transpileCss(runtime, key, code);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRCxPQUFPLGNBRU4sTUFBTSx1Q0FBdUMsQ0FBQztBQUMvQyxPQUFPLEVBQ0gsZUFBZSxHQUVsQixNQUFNLHVDQUF1QyxDQUFDO0FBQy9DLE9BQU8sWUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDckMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQThCM0MsTUFBTSxDQUFDLElBQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDO0FBQ2pELE1BQU0sQ0FBQyxJQUFNLGNBQWMsR0FBRyw0QkFBNEIsQ0FBQztBQUMzRCxJQUFNLDJCQUEyQixHQUFHO0lBQ2hDLElBQUksRUFBRSxLQUFLO0NBQ2QsQ0FBQztBQUNGLElBQU0sWUFBWSxHQUFHLElBQUksZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLElBQU0sYUFBYSxHQUFHLCtCQUErQixDQUFDO0FBRXRELDRIQUE0SDtBQUM1SCxJQUFNLDJCQUEyQixHQUFHLHVGQUF1RixDQUFDO0FBQzVILDhCQUE4QixNQUFjO0lBQ3hDLElBQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ3hFLElBQUksQ0FBQyxxQkFBcUI7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN6QyxJQUFJLFNBQVMsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDaEQsT0FBTyxDQUNILE1BQU0sQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLENBQ3BELENB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