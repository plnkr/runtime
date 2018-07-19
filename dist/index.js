import * as tslib_1 from "tslib";
import { toStringTag } from 'es-module-loader/core/common';
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
        var _b = _a.baseUri, baseUri = _b === void 0 ? document.baseURI : _b, _c = _a.defaultDependencyVersions, defaultDependencyVersions = _c === void 0 ? {} : _c, host = _a.host, _d = _a.useSystem, useSystem = _d === void 0 ? !!(window || global)['PLNKR_RUNTIME_USE_SYSTEM'] : _d;
        var _this = _super.call(this, document.baseURI) || this;
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
        var urlResult = _super.prototype[RegisterLoader.resolve].call(this, key, parentKey);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRCxPQUFPLGNBRU4sTUFBTSx1Q0FBdUMsQ0FBQztBQUMvQyxPQUFPLEVBQ0gsZUFBZSxHQUVsQixNQUFNLHVDQUF1QyxDQUFDO0FBRS9DLE9BQU8sWUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzNDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxPQUFPLENBQUM7QUErQnJDLE1BQU0sQ0FBQyxJQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQztBQUNqRCxNQUFNLENBQUMsSUFBTSxjQUFjLEdBQUcsNEJBQTRCLENBQUM7QUFDM0QsSUFBTSwyQkFBMkIsR0FBRztJQUNoQywrQkFBK0IsRUFBRSxLQUFLO0lBQ3RDLElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWSxFQUFFLE9BQU87SUFDckIsVUFBVSxFQUFFLEtBQUs7SUFDakIsdUJBQXVCLEVBQUUsS0FBSztDQUNqQyxDQUFDO0FBQ0YsSUFBTSxZQUFZLEdBQUcsSUFBSSxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDN0MsSUFBTSxhQUFhLEdBQUcsK0JBQStCLENBQUM7QUFFdEQsNEhBQTRIO0FBQzVILElBQU0sMkJBQTJCLEdBQUcsdUZBQXVGLENBQUM7QUFDNUgsOEJBQThCLE1BQWM7SUFDeEMsSUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDeEUsSUFBSSxDQUFDLHFCQUFxQjtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3pDLElBQUksU0FBUyxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FB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