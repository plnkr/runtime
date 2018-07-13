import * as tslib_1 from "tslib";
import { toStringTag } from 'es-module-loader/core/common';
import RegisterLoader from 'es-module-loader/core/register-loader';
import { ModuleNamespace, } from 'es-module-loader/core/loader-polyfill';
import convertRange from 'sver/convert-range';
import { transpileCss } from './css';
import { transpileJs } from './javascript';
var CDN_ESM_URL = 'https://dev.jspm.io';
var CDN_SYSTEM_URL = 'https://system-dev.jspm.io';
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
        _this.baseUri = document.baseURI;
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
    Runtime.prototype[(RegisterLoader.moduleNamespace, RegisterLoader.traceResolvedStaticDependency)] = function (parentKey, _, resolvedKey) {
        if (!this.dependencies.has(parentKey)) {
            this.dependencies.set(parentKey, new Set());
        }
        this.dependencies.get(parentKey).add(resolvedKey);
        if (!this.dependents.has(resolvedKey)) {
            this.dependents.set(resolvedKey, new Set());
        }
        this.dependents.get(resolvedKey).add(parentKey);
    };
    Runtime.prototype[RegisterLoader.resolve] = function (key, parentKey) {
        var _this = this;
        var urlResult = _super.prototype[RegisterLoader.resolve].call(this, key, parentKey);
        return Promise.resolve(urlResult).then(function (url) {
            if (url) {
                if (!url.startsWith(_this.baseUri)) {
                    return url;
                }
                var hostResolveResult = hostResolve(_this.host, url.slice(_this.baseUri.length + 1));
                return Promise.resolve(hostResolveResult).then(function (hostResolution) {
                    return _this.baseUri + "/" + hostResolution;
                });
            }
            var matches = key.match(NPM_MODULE_RX);
            var moduleName = (matches && matches[1]) || key;
            var modulePath = (matches && matches[2]) || '';
            return _this.import('./package.json')
                .catch(function () { return ({}); })
                .then(function (packageJson) {
                var devDependencies = (packageJson && packageJson.devDependencies) || {};
                var dependencies = (packageJson && packageJson.dependencies) || {};
                var range = dependencies[moduleName] ||
                    devDependencies[moduleName] ||
                    _this.defaultDependencyVersions[moduleName];
                var spec = range ? createJspmRange(range) : '';
                return dynamicImport && !_this.useSystem
                    ? CDN_ESM_URL + "/" + moduleName + spec + modulePath
                    : CDN_SYSTEM_URL + "/" + moduleName + spec + modulePath;
            });
        });
    };
    Runtime.prototype[RegisterLoader.instantiate] = function (key, processAnonRegister) {
        if (key.startsWith(this.baseUri)) {
            var loadHostResult = loadHostModule(this, key.slice(this.baseUri.length + 1), processAnonRegister);
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
                        var event_1 = {
                            defaultPrevented: false,
                            preventDefault: function () {
                                this.defaultPrevented = true;
                            },
                        };
                        if (instance &&
                            typeof instance.__onAfterUnload === 'function') {
                            instance.__onAfterUnload(event_1);
                        }
                        _this.registry.delete(resolvedPathname);
                        _this.dependencies.delete(resolvedPathname);
                        _this.dependents.delete(resolvedPathname);
                        if (!event_1.defaultPrevented) {
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
function instantiateJavascript(runtime, key, code, processAnonRegister) {
    var systemRegisterCodeResult = detectRegisterFormat(code)
        ? code
        : transpileJs(runtime, key, code);
    return Promise.resolve(systemRegisterCodeResult).then(function (code) {
        var moduleFactory = new Function('System', 'SystemJS', code);
        moduleFactory(runtime, runtime);
        if (!processAnonRegister()) {
            return EMPTY_MODULE;
        }
    });
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
    var codeResult = runtime.host.getFileContents(key);
    return Promise.resolve(codeResult).then(function (code) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRCxPQUFPLGNBQWMsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQ0gsZUFBZSxHQUVsQixNQUFNLHVDQUF1QyxDQUFDO0FBQy9DLE9BQU8sWUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDckMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQW1CM0MsSUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUM7QUFDMUMsSUFBTSxjQUFjLEdBQUcsNEJBQTRCLENBQUM7QUFDcEQsSUFBTSwyQkFBMkIsR0FBRztJQUNoQyxJQUFJLEVBQUUsS0FBSztDQUNkLENBQUM7QUFDRixJQUFNLFlBQVksR0FBRyxJQUFJLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3QyxJQUFNLGFBQWEsR0FBRywrQkFBK0IsQ0FBQztBQUV0RCw0SEFBNEg7QUFDNUgsSUFBTSwyQkFBMkIsR0FBRyx1RkFBdUYsQ0FBQztBQUM1SCw4QkFBOEIsTUFBYztJQUN4QyxJQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUN4RSxJQUFJLENBQUMscUJBQXFCO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFDekMsSUFBSSxTQUFTLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ2hELE9BQU8sQ0FDSCxNQUFNLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQztRQUMvQyxNQUFNLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxDQUNwRCxDQUFDO0FBQ04sQ0FBQztBQU1EO0lB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