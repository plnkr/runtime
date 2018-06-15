import * as tslib_1 from "tslib";
import convertRange from 'sver/convert-range';
import SystemJS from 'systemjs';
import { createEsmCdnLoader, dynamicImport } from './esmLoader';
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
        this.useEsm =
            !window.PLNKR_RUNTIME_USE_SYSTEM &&
                typeof dynamicImport === 'function';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sWUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUVoQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNsRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFaEQsSUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUM7QUFDMUMsSUFBTSxjQUFjLEdBQUcsNEJBQTRCLENBQUM7QUFDcEQsSUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7QUFnRGpDO0lBV0ksaUJBQVksRUFLTTs7UUFKZCxzREFBc0Q7UUFDdEQsNEJBQVcsRUFDWCxjQUFtQyxFQUFuQyx3REFBbUMsRUFDbkMsMEJBQVU7UUFFVixpREFBaUQ7UUFDakQsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxXQUFXLGFBQUEsRUFBRSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FDbkMsK0JBQStCLEVBQy9CLE1BQU0sQ0FDVCxDQUFDO1FBQ0YsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFVBQVU7WUFDWCxVQUFVLEtBQUssS0FB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