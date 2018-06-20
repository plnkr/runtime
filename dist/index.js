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
        var _b = _a.defaultDependencies, defaultDependencies = _b === void 0 ? {} : _b, _c = _a.defaultExtensions, defaultExtensions = _c === void 0 ? ['.js', '.ts', '.jsx', '.tsx'] : _c, runtimeHost = _a.runtimeHost, transpiler = _a.transpiler;
        this.defaultDependencies = defaultDependencies;
        // this.defaultExtensions = defaultExtensions;
        this.esmLoader = createEsmCdnLoader();
        this.localLoader = createLocalLoader({
            defaultExtensions: defaultExtensions,
            runtimeHost: runtimeHost,
        });
        this.queue = Promise.resolve();
        // this.runtimeHost = runtimeHost;
        this.system = new SystemJS.constructor();
        this.localRoot = this.system.baseURL.replace(/^([a-zA-Z]+:\/\/)([^/]*)\/.*$/, '$1$2');
        this.transpiler =
            transpiler === false
                ? null
                : transpiler ||
                    createTranspiler({
                        createRuntime: createRuntime,
                        runtime: this,
                        runtimeHost: runtimeHost,
                        typescriptVersion: TYPESCRIPT_VERSION,
                    });
        this.useEsm =
            !window.PLNKR_RUNTIME_USE_SYSTEM &&
                typeof dynamicImport === 'function';
        this.system.registry.set('@runtime-loader-esm', this.system.newModule(this.esmLoader));
        this.system.registry.set('@runtime-loader-local', this.system.newModule(this.localLoader));
        if (this.transpiler) {
            this.system.registry.set('@runtime-transpiler', this.system.newModule(this.transpiler));
        }
        if (this.localRoot.charAt(this.localRoot.length - 1) === '/') {
            this.localRoot = this.localRoot.slice(0, this.localRoot.length - 1);
        }
        if (!this.defaultDependencies['typescript']) {
            this.defaultDependencies['typescript'] = TYPESCRIPT_VERSION;
        }
        var systemRegister = this.system.register;
        this.system.register = function (key, deps, declare) {
            if (typeof key !== 'string') {
                if (typeof deps === 'function')
                    declare = deps;
                deps = key;
                key = undefined;
            }
            var registerDeclare = declare;
            declare = function (_export, _context) {
                return registerDeclare.call(this, function (name, value) {
                    if (typeof name === 'object') {
                        if (typeof name['default'] === 'object') {
                            return _export(addSyntheticDefaultExports(name['default']));
                        }
                    }
                    else if (name === 'default' &&
                        typeof value === 'object') {
                        return _export(addSyntheticDefaultExports(value));
                    }
                    return _export(name, value);
                }, _context);
            };
            if (key)
                return systemRegister.call(this, key, deps, declare);
            else
                return systemRegister.call(this, deps, declare);
        };
        this.system.config({
            meta: (_d = {},
                _d[this.localRoot + "/*"] = {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-local',
                },
                _d[ESM_CDN_URL + "/*"] = {
                    // @ts-ignore
                    esModule: true,
                    loader: '@runtime-loader-esm',
                },
                _d[SYSTEM_CDN_URL + "/*"] = {
                    // @ts-ignore
                    esModule: true,
                },
                _d),
            transpiler: this.transpiler ? '@runtime-transpiler' : false,
        });
        this.system.trace = true;
        var _d;
    }
    Runtime.prototype.import = function (entrypointPath) {
        var _this = this;
        var importPromise = this.queue.then(function () {
            return _this.buildConfig()
                .then(function (config) {
                _this.system.config(config);
                return _this.system.import(entrypointPath);
            })
                .then(addSyntheticDefaultExports);
        });
        // this.queue = importPromise.catch(() => undefined);
        return importPromise;
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
        var invalidationPromise = this.queue.then(function () {
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
        this.queue = this.queue.catch(function () { return undefined; });
        return invalidationPromise;
    };
    Runtime.prototype.buildConfig = function () {
        var _this = this;
        var config = this.system.getConfig();
        var dependencies = this.defaultDependencies;
        config.map = {};
        return this.system.import('package.json').then(function (pkgJson) {
            Object.assign(dependencies, pkgJson.devDependencies || {});
            Object.assign(dependencies, pkgJson.dependencies || {});
            var baseUrl = _this.useEsm ? ESM_CDN_URL : SYSTEM_CDN_URL;
            for (var name_1 in dependencies) {
                var range = dependencies[name_1];
                var pkgId = baseUrl + "/" + name_1 + createJspmRange(range);
                config.map[name_1] = pkgId;
            }
            return config;
        });
    };
    Runtime.prototype.resolve = function (spec) {
        return this.system.resolve(spec);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sWUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUVoQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNsRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFaEQsSUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUM7QUFDMUMsSUFBTSxjQUFjLEdBQUcsNEJBQTRCLENBQUM7QUFDcEQsSUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7QUEyRGpDO0lBWUksaUJBQVksRUFLTTtZQUpkLDJCQUF3QixFQUF4Qiw2Q0FBd0IsRUFDeEIseUJBQWtELEVBQWxELHVFQUFrRCxFQUNsRCw0QkFBVyxFQUNYLDBCQUFVO1FBRVYsSUFBSSxDQUFDLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDO1FBQy9DLDhDQUE4QztRQUM5QyxJQUFJLENBQUMsU0FBUyxHQUFHLGtCQUFrQixFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQztZQUNqQyxpQkFBaUIsbUJBQUE7WUFDakIsV0FBVyxhQUFBO1NBQ2QsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDL0Isa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDekMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FB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