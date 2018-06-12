import * as tslib_1 from "tslib";
import convertRange from 'sver/convert-range';
import SystemJS from 'systemjs';
import { createEsmCdnLoader, supportsDynamicImport } from './esmLoader';
import { createLocalLoader } from './localLoader';
import { addSyntheticDefaultExports } from './syntheticImports';
import { createTranspiler } from './transpiler';
var ESM_CDN_URL = 'https://dev.jspm.io';
var SYSTEM_CDN_URL = 'https://system-dev.jspm.io';
var TYPESCRIPT_VERSION = '2.8';
var Runtime = /** @class */ (function () {
    function Runtime(_a) {
        var 
        // defaultExtensions = ['.js', '.ts', '.jsx', '.tsx'],
        runtimeHost = _a.runtimeHost, _b = _a.system, system = _b === void 0 ? new SystemJS.constructor() : _b, transpiler = _a.transpiler;
        // // this.defaultExtensions = defaultExtensions;
        this.esmLoader = createEsmCdnLoader();
        this.localLoader = createLocalLoader({ runtimeHost: runtimeHost });
        this.localRoot = system.baseURL.replace(/^([a-zA-Z]+:\/\/)([^/]*)\/.*$/, '$1$2');
        this.queue = Promise.resolve();
        this.runtimeHost = runtimeHost;
        this.system = system;
        this.transpiler =
            transpiler === false
                ? null
                : transpiler ||
                    createTranspiler({
                        createRuntime: createRuntime,
                        runtimeHost: runtimeHost,
                        typescriptVersion: TYPESCRIPT_VERSION,
                    });
        this.useEsm = !window.PLNKR_RUNTIME_USE_SYSTEM && supportsDynamicImport;
        this.system.registry.set('@runtime-loader-esm', system.newModule(this.esmLoader));
        this.system.registry.set('@runtime-loader-local', system.newModule(this.localLoader));
        if (this.transpiler) {
            this.system.registry.set('@runtime-transpiler', system.newModule(this.transpiler));
        }
        this.system.config({
            meta: (_c = {},
                _c[this.localRoot + "/*"] = {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-local',
                },
                _c[ESM_CDN_URL + "/*"] = {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-esm',
                },
                _c),
            transpiler: this.transpiler ? '@runtime-transpiler' : false,
        });
        this.system.trace = true;
        var _c;
    }
    Runtime.prototype.import = function (entrypointPath) {
        var _this = this;
        this.queue = this.queue.then(function () {
            return _this.buildConfig()
                .then(function (config) {
                _this.system.config(config);
                return _this.system.import(entrypointPath);
            })
                .then(addSyntheticDefaultExports);
        });
        return this.queue;
    };
    Runtime.prototype.invalidate = function () {
        var _this = this;
        var pathnames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            pathnames[_i] = arguments[_i];
        }
        var dependentGraph = new Map();
        var getDependents = function (normalizedPath) {
            if (dependentGraph.size !== Object.keys(_this.system.loads).length) {
                dependentGraph.clear();
                for (var key in _this.system.loads) {
                    var loadEntry = _this.system.loads[key];
                    for (var mapping in loadEntry.depMap) {
                        var dependency = loadEntry.depMap[mapping];
                        if (!dependentGraph.has(dependency)) {
                            dependentGraph.set(dependency, new Set());
                        }
                        dependentGraph.get(dependency).add(key);
                    }
                }
            }
            return dependentGraph.has(normalizedPath)
                ? Array.from(dependentGraph.get(normalizedPath))
                : [];
        };
        var normalizedPaths = new Map();
        var normalizePath = function (key) {
            if (normalizedPaths.has(key)) {
                return Promise.resolve(normalizedPaths.get(key));
            }
            return _this.system.resolve(key).then(function (resolvedPath) {
                normalizedPaths.set(key, resolvedPath);
                return resolvedPath;
            });
        };
        var seen = new Set();
        this.queue = this.queue.then(function () {
            var invalidations = pathnames.slice();
            var handleNextInvalidation = function () {
                if (!invalidations.length)
                    return Promise.resolve();
                var pathname = invalidations.shift();
                return normalizePath(pathname).then(function (resolvedPathname) {
                    if (!seen.has(resolvedPathname)) {
                        seen.add(resolvedPathname);
                        _this.system.registry.delete(resolvedPathname);
                        var dependents = getDependents(resolvedPathname);
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
                    return handleNextInvalidation();
                    var e_1, _a;
                });
            };
            return handleNextInvalidation();
        });
        return this.queue;
    };
    Runtime.prototype.buildConfig = function () {
        var _this = this;
        var config = this.system.getConfig();
        config.map = {};
        var dependencies = Object.create(null);
        return Promise.resolve(this.runtimeHost.getFileContents('package.json')).then(function (pkgJsonStr) {
            if (pkgJsonStr) {
                try {
                    var pkgJson = JSON.parse(pkgJsonStr);
                    Object.assign(dependencies, pkgJson.devDependencies || {});
                    Object.assign(dependencies, pkgJson.dependencies || {});
                }
                catch (e) {
                    // Do nothing
                }
            }
            var baseUrl = _this.useEsm ? ESM_CDN_URL : SYSTEM_CDN_URL;
            for (var name_1 in dependencies) {
                var range = dependencies[name_1];
                var pkgId = baseUrl + "/" + name_1 + createJspmRange(range);
                config.map[name_1] = pkgId;
            }
            return config;
        });
    };
    return Runtime;
}());
export { Runtime };
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
function createRuntime(options) {
    return new Runtime(options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sWUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUVoQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2xELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUVoRCxJQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQztBQUMxQyxJQUFNLGNBQWMsR0FBRyw0QkFBNEIsQ0FBQztBQUNwRCxJQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQztBQWdEakM7SUFXSSxpQkFBWSxFQUtNOztRQUpkLHNEQUFzRDtRQUN0RCw0QkFBVyxFQUNYLGNBQW1DLEVBQW5DLHdEQUFtQyxFQUNuQywwQkFBVTtRQUVWLGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsU0FBUyxHQUFHLGtCQUFrQixFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxFQUFFLFdBQVcsYUFBQSxFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUNuQywrQkFBK0IsRUFDL0IsTUFBTSxDQUNULENBQUM7UUFDRixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsVUFBVTtZQUNYLFVBQVUsS0FBSyxL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