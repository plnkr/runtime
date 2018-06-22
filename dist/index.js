import * as tslib_1 from "tslib";
import convertRange from 'sver/convert-range';
import SystemJS from 'systemjs';
import { createCssLoader } from './cssLoader';
import { createEsmCdnLoader, dynamicImport } from './esmLoader';
import { createLocalLoader } from './localLoader';
import { addSyntheticDefaultExports } from './syntheticImports';
import { createTranspiler } from './transpiler';
var ESM_CDN_URL = 'https://dev.jspm.io';
var SYSTEM_CDN_URL = 'https://system-dev.jspm.io';
var LESS_VERSION = '2.7';
var TYPESCRIPT_VERSION = '2.8';
var Runtime = /** @class */ (function () {
    function Runtime(_a) {
        var _b = _a.defaultDependencies, defaultDependencies = _b === void 0 ? {} : _b, _c = _a.defaultExtensions, defaultExtensions = _c === void 0 ? ['.js', '.ts', '.jsx', '.tsx'] : _c, runtimeHost = _a.runtimeHost, transpiler = _a.transpiler;
        var cssLoader = createCssLoader({
            runtime: this,
        });
        this.defaultDependencies = defaultDependencies;
        // this.defaultExtensions = defaultExtensions;
        this.esmLoader = createEsmCdnLoader();
        this.localLoader = createLocalLoader({
            cssLoader: cssLoader,
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
        this.system.registry.set('@runtime-loader-css', this.system.newModule(cssLoader));
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
        if (!this.defaultDependencies['less']) {
            this.defaultDependencies['less'] = LESS_VERSION;
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
                _d['*.css'] = {
                    loader: '@runtime-loader-css',
                },
                _d['*.less'] = {
                    loader: '@runtime-loader-css',
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
                return _this.system
                    .import(entrypointPath)
                    .catch(function (err) { return Promise.reject(err.originalErr); });
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
        return this.system
            .import('package.json')
            .catch(function () { return ({}); })
            .then(function (pkgJson) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sWUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUVoQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2xELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUVoRCxJQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQztBQUMxQyxJQUFNLGNBQWMsR0FBRyw0QkFBNEIsQ0FBQztBQUNwRCxJQUFNLFlBQVksR0FBRyxLQUFLLENBQUM7QUFDM0IsSUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7QUEyRGpDO0lBWUksaUJBQVksRUFLTTtZQUpkLDJCQUF3QixFQUF4Qiw2Q0FBd0IsRUFDeEIseUJBQWtELEVBQWxELHVFQUFrRCxFQUNsRCw0QkFBVyxFQUNYLDBCQUFVO1FBRVYsSUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDO1lBQzlCLE9BQU8sRUFBRSxJQUFJO1NBQ2hCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQztRQUMvQyw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUM7WUFDakMsU0FBUyxXQUFBO1lBQ1QsaUJBQWlCLG1CQUFBO1lBQ2pCLFdBQVcsYUFBQTtTQUNkLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxLQUFL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