(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global['@plnkr/runtime'] = {})));
}(this, (function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __values(o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    /*
     * Environment
     */
    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    var isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    var isWindows = typeof process !== 'undefined' && typeof process.platform === 'string' && process.platform.match(/^win/);

    var envGlobal = typeof self !== 'undefined' ? self : global;

    /*
     * Simple Symbol() shim
     */
    var hasSymbol = typeof Symbol !== 'undefined';
    function createSymbol (name) {
      return hasSymbol ? Symbol() : '@@' + name;
    }

    var hasInstance = hasSymbol && Symbol.hasInstance;
    var toStringTag = hasSymbol && Symbol.toStringTag;

    /*
     * Environment baseURI
     */
    var baseURI;

    // environent baseURI detection
    if (typeof document != 'undefined' && document.getElementsByTagName) {
      baseURI = document.baseURI;

      if (!baseURI) {
        var bases = document.getElementsByTagName('base');
        baseURI = bases[0] && bases[0].href || window.location.href;
      }
    }
    else if (typeof location != 'undefined') {
      baseURI = location.href;
    }

    // sanitize out the hash and querystring
    if (baseURI) {
      baseURI = baseURI.split('#')[0].split('?')[0];
      var slashIndex = baseURI.lastIndexOf('/');
      if (slashIndex !== -1)
        baseURI = baseURI.substr(0, slashIndex + 1);
    }
    else if (typeof process !== 'undefined' && process.cwd) {
      baseURI = 'file://' + (isWindows ? '/' : '') + process.cwd();
      if (isWindows)
        baseURI = baseURI.replace(/\\/g, '/');
    }
    else {
      throw new TypeError('No environment baseURI');
    }

    // ensure baseURI has trailing "/"
    if (baseURI[baseURI.length - 1] !== '/')
      baseURI += '/';

    /*
     * LoaderError with chaining for loader stacks
     */
    var errArgs = new Error(0, '_').fileName == '_';
    function LoaderError__Check_error_message_for_loader_stack (childErr, newMessage) {
      // Convert file:/// URLs to paths in Node
      if (!isBrowser)
        newMessage = newMessage.replace(isWindows ? /file:\/\/\//g : /file:\/\//g, '');

      var message = (childErr.message || childErr) + '\n  ' + newMessage;

      var err;
      if (errArgs && childErr.fileName)
        err = new Error(message, childErr.fileName, childErr.lineNumber);
      else
        err = new Error(message);


      var stack = childErr.originalErr ? childErr.originalErr.stack : childErr.stack;

      if (isNode)
        // node doesn't show the message otherwise
        err.stack = message + '\n  ' + stack;
      else
        err.stack = stack;

      err.originalErr = childErr.originalErr || childErr;

      return err;
    }

    var resolvedPromise = Promise.resolve();

    /*
     * Simple Array values shim
     */
    function arrayValues (arr) {
      if (arr.values)
        return arr.values();

      if (typeof Symbol === 'undefined' || !Symbol.iterator)
        throw new Error('Symbol.iterator not supported in this browser');

      var iterable = {};
      iterable[Symbol.iterator] = function () {
        var keys = Object.keys(arr);
        var keyIndex = 0;
        return {
          next: function () {
            if (keyIndex < keys.length)
              return {
                value: arr[keys[keyIndex++]],
                done: false
              };
            else
              return {
                value: undefined,
                done: true
              };
          }
        };
      };
      return iterable;
    }

    /*
     * 3. Reflect.Loader
     *
     * We skip the entire native internal pipeline, just providing the bare API
     */
    // 3.1.1
    function Loader () {
      this.registry = new Registry();
    }
    // 3.3.1
    Loader.prototype.constructor = Loader;

    function ensureInstantiated (module) {
      if (module === undefined)
        return;
      if (module instanceof ModuleNamespace === false && module[toStringTag] !== 'Module' && module[toStringTag] !== 'module')
        throw new TypeError('Module instantiation did not return a valid namespace object.');
      return module;
    }

    // 3.3.2
    Loader.prototype.import = function (key, parent) {
      if (typeof key !== 'string')
        throw new TypeError('Loader import method must be passed a module key string');
      // custom resolveInstantiate combined hook for better perf
      var loader = this;
      return resolvedPromise
      .then(function () {
        return loader[RESOLVE_INSTANTIATE](key, parent);
      })
      .then(ensureInstantiated)
      //.then(Module.evaluate)
      .catch(function (err) {
        throw LoaderError__Check_error_message_for_loader_stack(err, 'Loading ' + key + (parent ? ' from ' + parent : ''));
      });
    };
    // 3.3.3
    var RESOLVE = Loader.resolve = createSymbol('resolve');

    /*
     * Combined resolve / instantiate hook
     *
     * Not in current reduced spec, but necessary to separate RESOLVE from RESOLVE + INSTANTIATE as described
     * in the spec notes of this repo to ensure that loader.resolve doesn't instantiate when not wanted.
     *
     * We implement RESOLVE_INSTANTIATE as a single hook instead of a separate INSTANTIATE in order to avoid
     * the need for double registry lookups as a performance optimization.
     */
    var RESOLVE_INSTANTIATE = Loader.resolveInstantiate = createSymbol('resolveInstantiate');

    // default resolveInstantiate is just to call resolve and then get from the registry
    // this provides compatibility for the resolveInstantiate optimization
    Loader.prototype[RESOLVE_INSTANTIATE] = function (key, parent) {
      var loader = this;
      return loader.resolve(key, parent)
      .then(function (resolved) {
        return loader.registry.get(resolved);
      });
    };

    function ensureResolution (resolvedKey) {
      if (resolvedKey === undefined)
        throw new RangeError('No resolution found.');
      return resolvedKey;
    }

    Loader.prototype.resolve = function (key, parent) {
      var loader = this;
      return resolvedPromise
      .then(function() {
        return loader[RESOLVE](key, parent);
      })
      .then(ensureResolution)
      .catch(function (err) {
        throw LoaderError__Check_error_message_for_loader_stack(err, 'Resolving ' + key + (parent ? ' to ' + parent : ''));
      });
    };

    /*
     * Base module namespace constructor
     *
     * Implementors can provide a custom MODULE_NAMESPACE constructor derived from ModuleNamespace
     * with custom logic by overrideing the Loader-specific constructor.
     */
    Loader.moduleNamespace = createSymbol('module_namespace');

    /*
     * Custom tracing functions
     *
     * Implementors can provide custom `trace` and `traceDynanic` functions that will be invoked when
     * loader.trace === true when new static and dynamic dependencies are observed, respectively.
     */
    Loader.traceLoad = createSymbol('traceLoad');
    Loader.traceResolvedStaticDependency = createSymbol(
        'traceResolveStaticDependency'
    );
    Loader.traceDiscoverDynamicDependency = createSymbol(
        'traceDiscoverDynamicDependency'
    );

    // 3.3.4 (import without evaluate)
    // this is not documented because the use of deferred evaluation as in Module.evaluate is not
    // documented, as it is not considered a stable feature to be encouraged
    // Loader.prototype.load may well be deprecated if this stays disabled
    /* Loader.prototype.load = function (key, parent) {
      return Promise.resolve(this[RESOLVE_INSTANTIATE](key, parent || this.key))
      .catch(function (err) {
        throw addToError(err, 'Loading ' + key + (parent ? ' from ' + parent : ''));
      });
    }; */

    /*
     * 4. Registry
     *
     * Instead of structuring through a Map, just use a dictionary object
     * We throw for construction attempts so this doesn't affect the public API
     *
     * Registry has been adjusted to use Namespace objects over ModuleStatus objects
     * as part of simplifying loader API implementation
     */
    var iteratorSupport = typeof Symbol !== 'undefined' && Symbol.iterator;
    var REGISTRY = createSymbol('registry');
    function Registry() {
      this[REGISTRY] = {};
    }
    // 4.4.1
    if (iteratorSupport) {
      // 4.4.2
      Registry.prototype[Symbol.iterator] = function () {
        return this.entries()[Symbol.iterator]();
      };

      // 4.4.3
      Registry.prototype.entries = function () {
        var registry = this[REGISTRY];
        return arrayValues(Object.keys(registry).map(function (key) {
          return [key, registry[key]];
        }));
      };
    }

    // 4.4.4
    Registry.prototype.keys = function () {
      return arrayValues(Object.keys(this[REGISTRY]));
    };
    // 4.4.5
    Registry.prototype.values = function () {
      var registry = this[REGISTRY];
      return arrayValues(Object.keys(registry).map(function (key) {
        return registry[key];
      }));
    };
    // 4.4.6
    Registry.prototype.get = function (key) {
      return this[REGISTRY][key];
    };
    // 4.4.7
    Registry.prototype.set = function (key, namespace) {
      if (!(namespace instanceof ModuleNamespace || namespace[toStringTag] === 'Module' || namespace[toStringTag] === 'module'))
        throw new Error('Registry must be set with an instance of Module Namespace');
      this[REGISTRY][key] = namespace;
      return this;
    };
    // 4.4.8
    Registry.prototype.has = function (key) {
      return Object.hasOwnProperty.call(this[REGISTRY], key);
    };
    // 4.4.9
    Registry.prototype.delete = function (key) {
      if (Object.hasOwnProperty.call(this[REGISTRY], key)) {
        delete this[REGISTRY][key];
        return true;
      }
      return false;
    };

    /*
     * Simple ModuleNamespace Exotic object based on a baseObject
     * We export this for allowing a fast-path for module namespace creation over Module descriptors
     */
    // var EVALUATE = createSymbol('evaluate');
    var BASE_OBJECT = createSymbol('baseObject');

    // 8.3.1 Reflect.Module
    /*
     * Best-effort simplified non-spec implementation based on
     * a baseObject referenced via getters.
     *
     * Allows:
     *
     *   loader.registry.set('x', new Module({ default: 'x' }));
     *
     * Optional evaluation function provides experimental Module.evaluate
     * support for non-executed modules in registry.
     */
    function ModuleNamespace (baseObject/*, evaluate*/) {
      Object.defineProperty(this, BASE_OBJECT, {
        value: baseObject
      });

      // evaluate defers namespace population
      /* if (evaluate) {
        Object.defineProperty(this, EVALUATE, {
          value: evaluate,
          configurable: true,
          writable: true
        });
      }
      else { */
        Object.keys(baseObject).forEach(extendNamespace, this);
      //}
    }// 8.4.2
    ModuleNamespace.prototype = Object.create(null);

    if (toStringTag)
      Object.defineProperty(ModuleNamespace.prototype, toStringTag, {
        value: 'Module'
      });

    if (hasInstance && toStringTag)
      Object.defineProperty(ModuleNamespace, hasInstance, {
        value: function (instance) {
          return instance[toStringTag] === 'Module' || instance[toStringTag] === 'module';
        }
      });

    function extendNamespace (key) {
      Object.defineProperty(this, key, {
        enumerable: true,
        get: function () {
          return this[BASE_OBJECT][key];
        }
      });
    }

    /* function doEvaluate (evaluate, context) {
      try {
        evaluate.call(context);
      }
      catch (e) {
        return e;
      }
    }

    // 8.4.1 Module.evaluate... not documented or used because this is potentially unstable
    Module.evaluate = function (ns) {
      var evaluate = ns[EVALUATE];
      if (evaluate) {
        ns[EVALUATE] = undefined;
        var err = doEvaluate(evaluate);
        if (err) {
          // cache the error
          ns[EVALUATE] = function () {
            throw err;
          };
          throw err;
        }
        Object.keys(ns[BASE_OBJECT]).forEach(extendNamespace, ns);
      }
      // make chainable
      return ns;
    }; */

    /*
     * Optimized URL normalization assuming a syntax-valid URL parent
     */
    function throwResolveError (relUrl, parentUrl) {
      throw new RangeError('Unable to resolve "' + relUrl + '" to ' + parentUrl);
    }
    var backslashRegEx = /\\/g;
    function resolveIfNotPlain (relUrl, parentUrl) {
      if (relUrl[0] === ' ' || relUrl[relUrl.length - 1] === ' ')
        relUrl = relUrl.trim();
      var parentProtocol = parentUrl && parentUrl.substr(0, parentUrl.indexOf(':') + 1);

      var firstChar = relUrl[0];
      var secondChar = relUrl[1];

      // protocol-relative
      if (firstChar === '/' && secondChar === '/') {
        if (!parentProtocol)
          throwResolveError(relUrl, parentUrl);
        if (relUrl.indexOf('\\') !== -1)
          relUrl = relUrl.replace(backslashRegEx, '/');
        return parentProtocol + relUrl;
      }
      // relative-url
      else if (firstChar === '.' && (secondChar === '/' || secondChar === '.' && (relUrl[2] === '/' || relUrl.length === 2 && (relUrl += '/')) ||
          relUrl.length === 1  && (relUrl += '/')) ||
          firstChar === '/') {
        if (relUrl.indexOf('\\') !== -1)
          relUrl = relUrl.replace(backslashRegEx, '/');
        var parentIsPlain = !parentProtocol || parentUrl[parentProtocol.length] !== '/';

        // read pathname from parent if a URL
        // pathname taken to be part after leading "/"
        var pathname;
        if (parentIsPlain) {
          // resolving to a plain parent -> skip standard URL prefix, and treat entire parent as pathname
          if (parentUrl === undefined)
            throwResolveError(relUrl, parentUrl);
          pathname = parentUrl;
        }
        else if (parentUrl[parentProtocol.length + 1] === '/') {
          // resolving to a :// so we need to read out the auth and host
          if (parentProtocol !== 'file:') {
            pathname = parentUrl.substr(parentProtocol.length + 2);
            pathname = pathname.substr(pathname.indexOf('/') + 1);
          }
          else {
            pathname = parentUrl.substr(8);
          }
        }
        else {
          // resolving to :/ so pathname is the /... part
          pathname = parentUrl.substr(parentProtocol.length + 1);
        }

        if (firstChar === '/') {
          if (parentIsPlain)
            throwResolveError(relUrl, parentUrl);
          else
            return parentUrl.substr(0, parentUrl.length - pathname.length - 1) + relUrl;
        }

        // join together and split for removal of .. and . segments
        // looping the string instead of anything fancy for perf reasons
        // '../../../../../z' resolved to 'x/y' is just 'z' regardless of parentIsPlain
        var segmented = pathname.substr(0, pathname.lastIndexOf('/') + 1) + relUrl;

        var output = [];
        var segmentIndex = -1;

        for (var i = 0; i < segmented.length; i++) {
          // busy reading a segment - only terminate on '/'
          if (segmentIndex !== -1) {
            if (segmented[i] === '/') {
              output.push(segmented.substring(segmentIndex, i + 1));
              segmentIndex = -1;
            }
            continue;
          }

          // new segment - check if it is relative
          if (segmented[i] === '.') {
            // ../ segment
            if (segmented[i + 1] === '.' && (segmented[i + 2] === '/' || i + 2 === segmented.length)) {
              output.pop();
              i += 2;
            }
            // ./ segment
            else if (segmented[i + 1] === '/' || i + 1 === segmented.length) {
              i += 1;
            }
            else {
              // the start of a new segment as below
              segmentIndex = i;
              continue;
            }

            // this is the plain URI backtracking error (../, package:x -> error)
            if (parentIsPlain && output.length === 0)
              throwResolveError(relUrl, parentUrl);

            continue;
          }

          // it is the start of a new segment
          segmentIndex = i;
        }
        // finish reading out the last segment
        if (segmentIndex !== -1)
          output.push(segmented.substr(segmentIndex));

        return parentUrl.substr(0, parentUrl.length - pathname.length) + output.join('');
      }

      // sanitizes and verifies (by returning undefined if not a valid URL-like form)
      // Windows filepath compatibility is an added convenience here
      var protocolIndex = relUrl.indexOf(':');
      if (protocolIndex !== -1) {
        if (isNode) {
          // C:\x becomes file:///c:/x (we don't support C|\x)
          if (relUrl[1] === ':' && relUrl[2] === '\\' && relUrl[0].match(/[a-z]/i))
            return 'file:///' + relUrl.replace(backslashRegEx, '/');
        }
        return relUrl;
      }
    }

    var resolvedPromise$1 = Promise.resolve();

    /*
     * Register Loader
     *
     * Builds directly on top of loader polyfill to provide:
     * - loader.register support
     * - hookable higher-level resolve
     * - instantiate hook returning a ModuleNamespace or undefined for es module loading
     * - loader error behaviour as in HTML and loader specs, caching load and eval errors separately
     * - build tracing support by providing a .trace=true and .loads object format
     */

    var REGISTER_INTERNAL = createSymbol('register-internal');

    function RegisterLoader () {
      Loader.call(this);

      var registryDelete = this.registry.delete;
      this.registry.delete = function (key) {
        var deleted = registryDelete.call(this, key);

        // also delete from register registry if linked
        if (records.hasOwnProperty(key) && !records[key].linkRecord) {
          delete records[key];
          deleted = true;
        }

        return deleted;
      };

      var records = {};

      this[REGISTER_INTERNAL] = {
        // last anonymous System.register call
        lastRegister: undefined,
        // in-flight es module load records
        records: records
      };
      this.trace = false;
    }

    RegisterLoader.prototype = Object.create(Loader.prototype);
    RegisterLoader.prototype.constructor = RegisterLoader;

    var INSTANTIATE = RegisterLoader.instantiate = createSymbol('instantiate');

    // default normalize is the WhatWG style normalizer
    RegisterLoader.prototype[RegisterLoader.resolve = Loader.resolve] = function (key, parentKey) {
      return resolveIfNotPlain(key, parentKey || baseURI);
    };

    RegisterLoader.prototype[INSTANTIATE] = function (key, processAnonRegister) {};


    RegisterLoader.prototype[RegisterLoader.moduleNamespace = Loader.moduleNamespace] = ModuleNamespace;
    RegisterLoader.prototype[RegisterLoader.traceDiscoverDynamicDependency = Loader.traceDiscoverDynamicDependency] = traceDiscoverDynamicDependency;
    RegisterLoader.prototype[RegisterLoader.traceLoad = Loader.traceLoad] = traceLoad;
    RegisterLoader.prototype[RegisterLoader.traceResolvedStaticDependency = Loader.traceResolvedStaticDependency] = traceResolveStaticDependency;

    // once evaluated, the linkRecord is set to undefined leaving just the other load record properties
    // this allows tracking new binding listeners for es modules through importerSetters
    // for dynamic modules, the load record is removed entirely.
    function createLoadRecord (state, key, registration) {
      return state.records[key] = {
        key: key,

        // defined System.register cache
        registration: registration,

        // module namespace object
        module: undefined,

        // es-only
        // this sticks around so new module loads can listen to binding changes
        // for already-loaded modules by adding themselves to their importerSetters
        importerSetters: undefined,

        loadError: undefined,
        evalError: undefined,

        // in-flight linking record
        linkRecord: {
          // promise for instantiated
          instantiatePromise: undefined,
          dependencies: undefined,
          execute: undefined,
          executingRequire: false,

          // underlying module object bindings
          moduleObj: undefined,

          // es only, also indicates if es or not
          setters: undefined,

          // promise for instantiated dependencies (dependencyInstantiations populated)
          depsInstantiatePromise: undefined,
          // will be the array of dependency load record or a module namespace
          dependencyInstantiations: undefined,

          // top-level await!
          evaluatePromise: undefined,

          // NB optimization and way of ensuring module objects in setters
          // indicates setters which should run pre-execution of that dependency
          // setters is then just for completely executed module objects
          // alternatively we just pass the partially filled module objects as
          // arguments into the execute function
          // hoisted: undefined
        }
      };
    }

    RegisterLoader.prototype[Loader.resolveInstantiate] = function (key, parentKey) {
      var loader = this;
      var state = this[REGISTER_INTERNAL];
      var registry = this.registry[REGISTRY];

      return resolveInstantiate(loader, key, parentKey, registry, state)
      .then(function (instantiated) {
        if (instantiated instanceof loader[Loader.moduleNamespace] || instantiated[toStringTag] === 'Module')
          return instantiated;

        // resolveInstantiate always returns a load record with a link record and no module value
        var link = instantiated.linkRecord;

        // if already beaten to done, return
        if (!link) {
          if (instantiated.module)
            return instantiated.module;
          throw instantiated.evalError;
        }

        return deepInstantiateDeps(loader, instantiated, link, registry, state)
        .then(function () {
          return ensureEvaluate(loader, instantiated, link, registry, state);
        });
      });
    };

    function resolveInstantiate (loader, key, parentKey, registry, state) {
      // normalization shortpath for already-normalized key
      // could add a plain name filter, but doesn't yet seem necessary for perf
      var module = registry[key];
      if (module)
        return Promise.resolve(module);

      var load = state.records[key];

      // already linked but not in main registry is ignored
      if (load && !load.module) {
        if (load.loadError)
          return Promise.reject(load.loadError);
        return instantiate(loader, load, load.linkRecord, registry, state);
      }

      return loader.resolve(key, parentKey)
      .then(function (resolvedKey) {
        // main loader registry always takes preference
        module = registry[resolvedKey];
        if (module)
          return module;

        load = state.records[resolvedKey];

        // already has a module value but not already in the registry (load.module)
        // means it was removed by registry.delete, so we should
        // disgard the current load record creating a new one over it
        // but keep any existing registration
        if (!load || load.module)
          load = createLoadRecord(state, resolvedKey, load && load.registration);

        if (load.loadError)
          return Promise.reject(load.loadError);

        var link = load.linkRecord;
        if (!link)
          return load;

        return instantiate(loader, load, link, registry, state);
      });
    }

    function createProcessAnonRegister (loader, load, state) {
      return function () {
        var lastRegister = state.lastRegister;

        if (!lastRegister)
          return !!load.registration;

        state.lastRegister = undefined;
        load.registration = lastRegister;

        return true;
      };
    }

    function instantiate (loader, load, link, registry, state) {
      return link.instantiatePromise || (link.instantiatePromise =
      // if there is already an existing registration, skip running instantiate
      (load.registration ? resolvedPromise$1 : resolvedPromise$1.then(function () {
        state.lastRegister = undefined;
        return loader[INSTANTIATE](load.key, loader[INSTANTIATE].length > 1 && createProcessAnonRegister(loader, load, state));
      }))
      .then(function (instantiation) {
        // direct module return from instantiate -> we're done
        if (instantiation !== undefined) {
          if (!(instantiation instanceof loader[Loader.moduleNamespace] || instantiation[toStringTag] === 'Module'))
            throw new TypeError(`Instantiate did not return a valid ${typeof instantiation} object.`);

          delete state.records[load.key];
          registry[load.key] = instantiation;
          loader[Loader.traceLoad](load, link);
          return instantiation;
        }

        // run the cached loader.register declaration if there is one
        var registration = load.registration;
        // clear to allow new registrations for future loads (combined with registry delete)
        load.registration = undefined;
        if (!registration)
          throw new TypeError('Module instantiation did not call an anonymous or correctly named System.register.');

        link.dependencies = registration[0];

        load.importerSetters = [];

        link.moduleObj = {};

        // process System.registerDynamic declaration
        if (registration[2]) {
          link.moduleObj.default = link.moduleObj.__useDefault = {};
          link.executingRequire = registration[1];
          link.execute = registration[2];
        }

        // process System.register declaration
        else {
          registerDeclarative(loader, load, link, registration[1]);
        }

        return load;
      })
      .catch(function (err) {
        load.linkRecord = undefined;
        throw load.loadError = load.loadError || LoaderError__Check_error_message_for_loader_stack(err, 'Instantiating ' + load.key);
      }));
    }

    // like resolveInstantiate, but returning load records for linking
    function resolveInstantiateDep (loader, key, parentKey, registry, state) {
      // normalization shortpaths for already-normalized key
      // DISABLED to prioritise consistent resolver calls
      // could add a plain name filter, but doesn't yet seem necessary for perf
      /* var load = state.records[key];
      var module = registry[key];

      if (module) {
        if (traceDepMap)
          traceDepMap[key] = key;

        // registry authority check in case module was deleted or replaced in main registry
        if (load && load.module && load.module === module)
          return load;
        else
          return module;
      }

      // already linked but not in main registry is ignored
      if (load && !load.module) {
        if (traceDepMap)
          traceDepMap[key] = key;
        return instantiate(loader, load, load.linkRecord, registry, state);
      } */
      return loader.resolve(key, parentKey)
      .then(function (resolvedKey) {
        loader[Loader.traceResolvedStaticDependency](parentKey, key, resolvedKey);

        // normalization shortpaths for already-normalized key
        var load = state.records[resolvedKey];
        var module = registry[resolvedKey];

        // main loader registry always takes preference
        if (module && (!load || load.module && module !== load.module))
          return module;

        if (load && load.loadError)
          throw load.loadError;

        // already has a module value but not already in the registry (load.module)
        // means it was removed by registry.delete, so we should
        // disgard the current load record creating a new one over it
        // but keep any existing registration
        if (!load || !module && load.module)
          load = createLoadRecord(state, resolvedKey, load && load.registration);

        var link = load.linkRecord;
        if (!link)
          return load;

        return instantiate(loader, load, link, registry, state);
      });
    }

    function traceDiscoverDynamicDependency(parentKey, key) {
      if (this.trace) {
        this.loads[parentKey].dynamicDeps.push(key);
      }
    }

    function traceResolveStaticDependency(parentKey, key, resolvedKey) {
      if (this.trace && this.loads[parentKey]) {
        this.loads[parentKey].depMap[key] = resolvedKey;
      }
    }

    function traceLoad(load, link) {
      if (this.trace) {
        this.loads = this.loads || {};
        this.loads[load.key] = {
          key: load.key,
          deps: link.dependencies,
          dynamicDeps: [],
          depMap: link.depMap || {}
        };
      }
    }

    /*
     * Convert a CJS module.exports into a valid object for new Module:
     *
     *   new Module(getEsModule(module.exports))
     *
     * Sets the default value to the module, while also reading off named exports carefully.
     */
    function registerDeclarative (loader, load, link, declare) {
      var moduleObj = link.moduleObj;
      var importerSetters = load.importerSetters;

      var definedExports = false;

      // closure especially not based on link to allow link record disposal
      var declared = declare.call(envGlobal, function (name, value) {
        if (typeof name === 'object') {
          var changed = false;
          for (var p in name) {
            value = name[p];
            if (p !== '__useDefault' && (!(p in moduleObj) || moduleObj[p] !== value)) {
              changed = true;
              moduleObj[p] = value;
            }
          }
          if (changed === false)
            return value;
        }
        else {
          if ((definedExports || name in moduleObj) && moduleObj[name] === value)
            return value;
          moduleObj[name] = value;
        }

        for (var i = 0; i < importerSetters.length; i++)
          importerSetters[i](moduleObj);

        return value;
      }, new ContextualLoader(loader, load.key));

      link.setters = declared.setters || [];
      link.execute = declared.execute;
      if (declared.exports) {
        link.moduleObj = moduleObj = declared.exports;
        definedExports = true;
      }
    }

    function instantiateDeps (loader, load, link, registry, state) {
      if (link.depsInstantiatePromise)
        return link.depsInstantiatePromise;

      var depsInstantiatePromises = Array(link.dependencies.length);

      for (var i = 0; i < link.dependencies.length; i++)
        depsInstantiatePromises[i] = resolveInstantiateDep(loader, link.dependencies[i], load.key, registry, state);

      var depsInstantiatePromise = Promise.all(depsInstantiatePromises)
      .then(function (dependencyInstantiations) {
        link.dependencyInstantiations = dependencyInstantiations;

        // run setters to set up bindings to instantiated dependencies
        if (link.setters) {
          for (var i = 0; i < dependencyInstantiations.length; i++) {
            var setter = link.setters[i];
            if (setter) {
              var instantiation = dependencyInstantiations[i];

              if (instantiation instanceof loader[Loader.moduleNamespace] || instantiation[toStringTag] === 'Module') {
                setter(instantiation);
              }
              else {
                if (instantiation.loadError)
                  throw instantiation.loadError;
                setter(instantiation.module || instantiation.linkRecord.moduleObj);
                // this applies to both es and dynamic registrations
                if (instantiation.importerSetters)
                  instantiation.importerSetters.push(setter);
              }
            }
          }
        }

        return load;
      });

      depsInstantiatePromise = depsInstantiatePromise.then(function () {
        loader[Loader.traceLoad](loader, load, link);
        return load;
      });

      depsInstantiatePromise = depsInstantiatePromise.catch(function (err) {
        // throw up the instantiateDeps stack
        link.depsInstantiatePromise = undefined;
        throw LoaderError__Check_error_message_for_loader_stack(err, 'Loading ' + load.key);
      });

      depsInstantiatePromise.catch(function () {});

      return link.depsInstantiatePromise = depsInstantiatePromise;
    }

    function deepInstantiateDeps (loader, load, link, registry, state) {
      var seen = [];
      function addDeps (load, link) {
        if (!link)
          return resolvedPromise$1;
        if (seen.indexOf(load) !== -1)
          return resolvedPromise$1;
        seen.push(load);

        return instantiateDeps(loader, load, link, registry, state)
        .then(function () {
          var depPromises;
          for (var i = 0; i < link.dependencies.length; i++) {
            var depLoad = link.dependencyInstantiations[i];
            if (!(depLoad instanceof loader[Loader.moduleNamespace] || depLoad[toStringTag] === 'Module')) {
              depPromises = depPromises || [];
              depPromises.push(addDeps(depLoad, depLoad.linkRecord));
            }
          }
          if (depPromises)
            return Promise.all(depPromises);
        });
      }
      return addDeps(load, link);
    }

    /*
     * System.register
     */
    RegisterLoader.prototype.register = function (key, deps, declare) {
      var state = this[REGISTER_INTERNAL];

      // anonymous modules get stored as lastAnon
      if (declare === undefined) {
        state.lastRegister = [key, deps, undefined];
      }

      // everything else registers into the register cache
      else {
        var load = state.records[key] || createLoadRecord(state, key, undefined);
        load.registration = [deps, declare, undefined];
      }
    };

    /*
     * System.registerDyanmic
     */
    RegisterLoader.prototype.registerDynamic = function (key, deps, executingRequire, execute) {
      var state = this[REGISTER_INTERNAL];

      // anonymous modules get stored as lastAnon
      if (typeof key !== 'string') {
        state.lastRegister = [key, deps, executingRequire];
      }

      // everything else registers into the register cache
      else {
        var load = state.records[key] || createLoadRecord(state, key, undefined);
        load.registration = [deps, executingRequire, execute];
      }
    };

    // ContextualLoader class
    // backwards-compatible with previous System.register context argument by exposing .id, .key
    function ContextualLoader (loader, key) {
      this.loader = loader;
      this.key = this.id = key;
      this.meta = {
        url: key
        // scriptElement: null
      };
    }
    /*ContextualLoader.prototype.constructor = function () {
      throw new TypeError('Cannot subclass the contextual loader only Reflect.Loader.');
    };*/
    ContextualLoader.prototype.import = function (key) {
      this.loader[Loader.traceDiscoverDynamicDependency](this.key, key);
      return this.loader.import(key, this.key);
    };
    /*ContextualLoader.prototype.resolve = function (key) {
      return this.loader.resolve(key, this.key);
    };*/

    function ensureEvaluate (loader, load, link, registry, state) {
      if (load.module)
        return load.module;
      if (load.evalError)
        throw load.evalError;
      if (link.evaluatePromise)
        return link.evaluatePromise;

      if (link.setters) {
        var evaluatePromise = doEvaluateDeclarative(loader, load, link, registry, state, [load]);
        if (evaluatePromise)
          return evaluatePromise;
      }
      else {
        doEvaluateDynamic(loader, load, link, registry, state, [load]);
      }
      return load.module;
    }

    function makeDynamicRequire (loader, key, dependencies, dependencyInstantiations, registry, state, seen) {
      // we can only require from already-known dependencies
      return function (name) {
        for (var i = 0; i < dependencies.length; i++) {
          if (dependencies[i] === name) {
            var depLoad = dependencyInstantiations[i];
            var module;

            if (depLoad instanceof loader[Loader.moduleNamespace] || depLoad[toStringTag] === 'Module') {
              module = depLoad;
            }
            else {
              if (depLoad.evalError)
                throw depLoad.evalError;
              if (depLoad.module === undefined && seen.indexOf(depLoad) === -1 && !depLoad.linkRecord.evaluatePromise) {
                if (depLoad.linkRecord.setters) {
                  doEvaluateDeclarative(loader, depLoad, depLoad.linkRecord, registry, state, [depLoad]);
                }
                else {
                  seen.push(depLoad);
                  doEvaluateDynamic(loader, depLoad, depLoad.linkRecord, registry, state, seen);
                }
              }
              module = depLoad.module || depLoad.linkRecord.moduleObj;
            }

            return '__useDefault' in module ? module.__useDefault : module;
          }
        }
        throw new Error('Module ' + name + ' not declared as a System.registerDynamic dependency of ' + key);
      };
    }

    function evalError (load, err) {
      load.linkRecord = undefined;
      var evalError = LoaderError__Check_error_message_for_loader_stack(err, 'Evaluating ' + load.key);
      if (load.evalError === undefined)
        load.evalError = evalError;
      throw evalError;
    }

    // es modules evaluate dependencies first
    // returns the error if any
    function doEvaluateDeclarative (loader, load, link, registry, state, seen) {
      var depLoad, depLink;
      var depLoadPromises;
      for (var i = 0; i < link.dependencies.length; i++) {
        var depLoad = link.dependencyInstantiations[i];
        if (depLoad instanceof loader[Loader.moduleNamespace] || depLoad[toStringTag] === 'Module')
          continue;

        // custom Module returned from instantiate
        depLink = depLoad.linkRecord;
        if (depLink) {
          if (depLoad.evalError) {
            evalError(load, depLoad.evalError);
          }
          else if (depLink.setters) {
            if (seen.indexOf(depLoad) === -1) {
              seen.push(depLoad);
              try {
                var depLoadPromise = doEvaluateDeclarative(loader, depLoad, depLink, registry, state, seen);
              }
              catch (e) {
                evalError(load, e);
              }
              if (depLoadPromise) {
                depLoadPromises = depLoadPromises || [];
                depLoadPromises.push(depLoadPromise.catch(function (err) {
                  evalError(load, err);
                }));
              }
            }
          }
          else {
            try {
              doEvaluateDynamic(loader, depLoad, depLink, registry, state, [depLoad]);
            }
            catch (e) {
              evalError(load, e);
            }
          }
        }
      }

      if (depLoadPromises)
        return link.evaluatePromise = Promise.all(depLoadPromises)
        .then(function () {
          if (link.execute) {
            // ES System.register execute
            // "this" is null in ES
            try {
              var execPromise = link.execute.call(nullContext);
            }
            catch (e) {
              evalError(load, e);
            }
            if (execPromise)
              return execPromise.catch(function (e) {
                evalError(load, e);
              })
              .then(function () {
                load.linkRecord = undefined;
                return registry[load.key] = load.module = new loader[Loader.moduleNamespace](link.moduleObj);
              });
          }

          // dispose link record
          load.linkRecord = undefined;
          registry[load.key] = load.module = new loader[Loader.moduleNamespace](link.moduleObj);
        });

      if (link.execute) {
        // ES System.register execute
        // "this" is null in ES
        try {
          var execPromise = link.execute.call(nullContext);
        }
        catch (e) {
          evalError(load, e);
        }
        if (execPromise)
          return link.evaluatePromise = execPromise.catch(function (e) {
            evalError(load, e);
          })
          .then(function () {
            load.linkRecord = undefined;
            return registry[load.key] = load.module = new loader[Loader.moduleNamespace](link.moduleObj);
          });
      }

      // dispose link record
      load.linkRecord = undefined;
      registry[load.key] = load.module = new loader[Loader.moduleNamespace](link.moduleObj);
    }

    // non es modules explicitly call moduleEvaluate through require
    function doEvaluateDynamic (loader, load, link, registry, state, seen) {
      // System.registerDynamic execute
      // "this" is "exports" in CJS
      var module = { id: load.key };
      var moduleObj = link.moduleObj;
      Object.defineProperty(module, 'exports', {
        configurable: true,
        set: function (exports) {
          moduleObj.default = moduleObj.__useDefault = exports;
        },
        get: function () {
          return moduleObj.__useDefault;
        }
      });

      var require = makeDynamicRequire(loader, load.key, link.dependencies, link.dependencyInstantiations, registry, state, seen);

      // evaluate deps first
      if (!link.executingRequire)
        for (var i = 0; i < link.dependencies.length; i++)
          require(link.dependencies[i]);

      try {
        var output = link.execute.call(envGlobal, require, moduleObj.default, module);
        if (output !== undefined)
          module.exports = output;
      }
      catch (e) {
        evalError(load, e);
      }

      load.linkRecord = undefined;

      // pick up defineProperty calls to module.exports when we can
      if (module.exports !== moduleObj.__useDefault)
        moduleObj.default = moduleObj.__useDefault = module.exports;

      var moduleDefault = moduleObj.default;

      // __esModule flag extension support via lifting
      if (moduleDefault) {
        for (var p in moduleDefault) {
          if (Object.hasOwnProperty.call(moduleDefault, p) && !Object.hasOwnProperty.call(moduleObj, p))
            moduleObj[p] = moduleDefault[p];
        }
      }

      registry[load.key] = load.module = new loader[Loader.moduleNamespace](link.moduleObj);

      // run importer setters and clear them
      // this allows dynamic modules to update themselves into es modules
      // as soon as execution has completed
      if (load.importerSetters)
        for (var i = 0; i < load.importerSetters.length; i++)
          load.importerSetters[i](load.module);
      load.importerSetters = undefined;
    }

    // the closest we can get to call(undefined)
    var nullContext = Object.create(null);
    if (Object.freeze)
      Object.freeze(nullContext);

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var semver = createCommonjsModule(function (module, exports) {
    exports = module.exports = SemVer;

    // The debug function is excluded entirely from the minified version.
    /* nomin */ var debug;
    /* nomin */ if (typeof process === 'object' &&
        /* nomin */ process.env &&
        /* nomin */ process.env.NODE_DEBUG &&
        /* nomin */ /\bsemver\b/i.test(process.env.NODE_DEBUG))
      /* nomin */ debug = function() {
        /* nomin */ var args = Array.prototype.slice.call(arguments, 0);
        /* nomin */ args.unshift('SEMVER');
        /* nomin */ console.log.apply(console, args);
        /* nomin */ };
    /* nomin */ else
      /* nomin */ debug = function() {};

    // Note: this is the semver.org version of the spec that it implements
    // Not necessarily the package version of this code.
    exports.SEMVER_SPEC_VERSION = '2.0.0';

    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

    // Max safe segment length for coercion.
    var MAX_SAFE_COMPONENT_LENGTH = 16;

    // The actual regexps go on exports.re
    var re = exports.re = [];
    var src = exports.src = [];
    var R = 0;

    // The following Regular Expressions can be used for tokenizing,
    // validating, and parsing SemVer version strings.

    // ## Numeric Identifier
    // A single `0`, or a non-zero digit followed by zero or more digits.

    var NUMERICIDENTIFIER = R++;
    src[NUMERICIDENTIFIER] = '0|[1-9]\\d*';
    var NUMERICIDENTIFIERLOOSE = R++;
    src[NUMERICIDENTIFIERLOOSE] = '[0-9]+';


    // ## Non-numeric Identifier
    // Zero or more digits, followed by a letter or hyphen, and then zero or
    // more letters, digits, or hyphens.

    var NONNUMERICIDENTIFIER = R++;
    src[NONNUMERICIDENTIFIER] = '\\d*[a-zA-Z-][a-zA-Z0-9-]*';


    // ## Main Version
    // Three dot-separated numeric identifiers.

    var MAINVERSION = R++;
    src[MAINVERSION] = '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                       '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                       '(' + src[NUMERICIDENTIFIER] + ')';

    var MAINVERSIONLOOSE = R++;
    src[MAINVERSIONLOOSE] = '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                            '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                            '(' + src[NUMERICIDENTIFIERLOOSE] + ')';

    // ## Pre-release Version Identifier
    // A numeric identifier, or a non-numeric identifier.

    var PRERELEASEIDENTIFIER = R++;
    src[PRERELEASEIDENTIFIER] = '(?:' + src[NUMERICIDENTIFIER] +
                                '|' + src[NONNUMERICIDENTIFIER] + ')';

    var PRERELEASEIDENTIFIERLOOSE = R++;
    src[PRERELEASEIDENTIFIERLOOSE] = '(?:' + src[NUMERICIDENTIFIERLOOSE] +
                                     '|' + src[NONNUMERICIDENTIFIER] + ')';


    // ## Pre-release Version
    // Hyphen, followed by one or more dot-separated pre-release version
    // identifiers.

    var PRERELEASE = R++;
    src[PRERELEASE] = '(?:-(' + src[PRERELEASEIDENTIFIER] +
                      '(?:\\.' + src[PRERELEASEIDENTIFIER] + ')*))';

    var PRERELEASELOOSE = R++;
    src[PRERELEASELOOSE] = '(?:-?(' + src[PRERELEASEIDENTIFIERLOOSE] +
                           '(?:\\.' + src[PRERELEASEIDENTIFIERLOOSE] + ')*))';

    // ## Build Metadata Identifier
    // Any combination of digits, letters, or hyphens.

    var BUILDIDENTIFIER = R++;
    src[BUILDIDENTIFIER] = '[0-9A-Za-z-]+';

    // ## Build Metadata
    // Plus sign, followed by one or more period-separated build metadata
    // identifiers.

    var BUILD = R++;
    src[BUILD] = '(?:\\+(' + src[BUILDIDENTIFIER] +
                 '(?:\\.' + src[BUILDIDENTIFIER] + ')*))';


    // ## Full Version String
    // A main version, followed optionally by a pre-release version and
    // build metadata.

    // Note that the only major, minor, patch, and pre-release sections of
    // the version string are capturing groups.  The build metadata is not a
    // capturing group, because it should not ever be used in version
    // comparison.

    var FULL = R++;
    var FULLPLAIN = 'v?' + src[MAINVERSION] +
                    src[PRERELEASE] + '?' +
                    src[BUILD] + '?';

    src[FULL] = '^' + FULLPLAIN + '$';

    // like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
    // also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
    // common in the npm registry.
    var LOOSEPLAIN = '[v=\\s]*' + src[MAINVERSIONLOOSE] +
                     src[PRERELEASELOOSE] + '?' +
                     src[BUILD] + '?';

    var LOOSE = R++;
    src[LOOSE] = '^' + LOOSEPLAIN + '$';

    var GTLT = R++;
    src[GTLT] = '((?:<|>)?=?)';

    // Something like "2.*" or "1.2.x".
    // Note that "x.x" is a valid xRange identifer, meaning "any version"
    // Only the first item is strictly required.
    var XRANGEIDENTIFIERLOOSE = R++;
    src[XRANGEIDENTIFIERLOOSE] = src[NUMERICIDENTIFIERLOOSE] + '|x|X|\\*';
    var XRANGEIDENTIFIER = R++;
    src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + '|x|X|\\*';

    var XRANGEPLAIN = R++;
    src[XRANGEPLAIN] = '[v=\\s]*(' + src[XRANGEIDENTIFIER] + ')' +
                       '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                       '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                       '(?:' + src[PRERELEASE] + ')?' +
                       src[BUILD] + '?' +
                       ')?)?';

    var XRANGEPLAINLOOSE = R++;
    src[XRANGEPLAINLOOSE] = '[v=\\s]*(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                            '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                            '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                            '(?:' + src[PRERELEASELOOSE] + ')?' +
                            src[BUILD] + '?' +
                            ')?)?';

    var XRANGE = R++;
    src[XRANGE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAIN] + '$';
    var XRANGELOOSE = R++;
    src[XRANGELOOSE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAINLOOSE] + '$';

    // Coercion.
    // Extract anything that could conceivably be a part of a valid semver
    var COERCE = R++;
    src[COERCE] = '(?:^|[^\\d])' +
                  '(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '})' +
                  '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' +
                  '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' +
                  '(?:$|[^\\d])';

    // Tilde ranges.
    // Meaning is "reasonably at or greater than"
    var LONETILDE = R++;
    src[LONETILDE] = '(?:~>?)';

    var TILDETRIM = R++;
    src[TILDETRIM] = '(\\s*)' + src[LONETILDE] + '\\s+';
    re[TILDETRIM] = new RegExp(src[TILDETRIM], 'g');
    var tildeTrimReplace = '$1~';

    var TILDE = R++;
    src[TILDE] = '^' + src[LONETILDE] + src[XRANGEPLAIN] + '$';
    var TILDELOOSE = R++;
    src[TILDELOOSE] = '^' + src[LONETILDE] + src[XRANGEPLAINLOOSE] + '$';

    // Caret ranges.
    // Meaning is "at least and backwards compatible with"
    var LONECARET = R++;
    src[LONECARET] = '(?:\\^)';

    var CARETTRIM = R++;
    src[CARETTRIM] = '(\\s*)' + src[LONECARET] + '\\s+';
    re[CARETTRIM] = new RegExp(src[CARETTRIM], 'g');
    var caretTrimReplace = '$1^';

    var CARET = R++;
    src[CARET] = '^' + src[LONECARET] + src[XRANGEPLAIN] + '$';
    var CARETLOOSE = R++;
    src[CARETLOOSE] = '^' + src[LONECARET] + src[XRANGEPLAINLOOSE] + '$';

    // A simple gt/lt/eq thing, or just "" to indicate "any version"
    var COMPARATORLOOSE = R++;
    src[COMPARATORLOOSE] = '^' + src[GTLT] + '\\s*(' + LOOSEPLAIN + ')$|^$';
    var COMPARATOR = R++;
    src[COMPARATOR] = '^' + src[GTLT] + '\\s*(' + FULLPLAIN + ')$|^$';


    // An expression to strip any whitespace between the gtlt and the thing
    // it modifies, so that `> 1.2.3` ==> `>1.2.3`
    var COMPARATORTRIM = R++;
    src[COMPARATORTRIM] = '(\\s*)' + src[GTLT] +
                          '\\s*(' + LOOSEPLAIN + '|' + src[XRANGEPLAIN] + ')';

    // this one has to use the /g flag
    re[COMPARATORTRIM] = new RegExp(src[COMPARATORTRIM], 'g');
    var comparatorTrimReplace = '$1$2$3';


    // Something like `1.2.3 - 1.2.4`
    // Note that these all use the loose form, because they'll be
    // checked against either the strict or loose comparator form
    // later.
    var HYPHENRANGE = R++;
    src[HYPHENRANGE] = '^\\s*(' + src[XRANGEPLAIN] + ')' +
                       '\\s+-\\s+' +
                       '(' + src[XRANGEPLAIN] + ')' +
                       '\\s*$';

    var HYPHENRANGELOOSE = R++;
    src[HYPHENRANGELOOSE] = '^\\s*(' + src[XRANGEPLAINLOOSE] + ')' +
                            '\\s+-\\s+' +
                            '(' + src[XRANGEPLAINLOOSE] + ')' +
                            '\\s*$';

    // Star ranges basically just allow anything at all.
    var STAR = R++;
    src[STAR] = '(<|>)?=?\\s*\\*';

    // Compile to actual regexp objects.
    // All are flag-free, unless they were created above with a flag.
    for (var i = 0; i < R; i++) {
      debug(i, src[i]);
      if (!re[i])
        re[i] = new RegExp(src[i]);
    }

    exports.parse = parse;
    function parse(version, loose) {
      if (version instanceof SemVer)
        return version;

      if (typeof version !== 'string')
        return null;

      if (version.length > MAX_LENGTH)
        return null;

      var r = loose ? re[LOOSE] : re[FULL];
      if (!r.test(version))
        return null;

      try {
        return new SemVer(version, loose);
      } catch (er) {
        return null;
      }
    }

    exports.valid = valid;
    function valid(version, loose) {
      var v = parse(version, loose);
      return v ? v.version : null;
    }


    exports.clean = clean;
    function clean(version, loose) {
      var s = parse(version.trim().replace(/^[=v]+/, ''), loose);
      return s ? s.version : null;
    }

    exports.SemVer = SemVer;

    function SemVer(version, loose) {
      if (version instanceof SemVer) {
        if (version.loose === loose)
          return version;
        else
          version = version.version;
      } else if (typeof version !== 'string') {
        throw new TypeError('Invalid Version: ' + version);
      }

      if (version.length > MAX_LENGTH)
        throw new TypeError('version is longer than ' + MAX_LENGTH + ' characters')

      if (!(this instanceof SemVer))
        return new SemVer(version, loose);

      debug('SemVer', version, loose);
      this.loose = loose;
      var m = version.trim().match(loose ? re[LOOSE] : re[FULL]);

      if (!m)
        throw new TypeError('Invalid Version: ' + version);

      this.raw = version;

      // these are actually numbers
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];

      if (this.major > MAX_SAFE_INTEGER || this.major < 0)
        throw new TypeError('Invalid major version')

      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0)
        throw new TypeError('Invalid minor version')

      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0)
        throw new TypeError('Invalid patch version')

      // numberify any prerelease numeric ids
      if (!m[4])
        this.prerelease = [];
      else
        this.prerelease = m[4].split('.').map(function(id) {
          if (/^[0-9]+$/.test(id)) {
            var num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER)
              return num;
          }
          return id;
        });

      this.build = m[5] ? m[5].split('.') : [];
      this.format();
    }

    SemVer.prototype.format = function() {
      this.version = this.major + '.' + this.minor + '.' + this.patch;
      if (this.prerelease.length)
        this.version += '-' + this.prerelease.join('.');
      return this.version;
    };

    SemVer.prototype.toString = function() {
      return this.version;
    };

    SemVer.prototype.compare = function(other) {
      debug('SemVer.compare', this.version, this.loose, other);
      if (!(other instanceof SemVer))
        other = new SemVer(other, this.loose);

      return this.compareMain(other) || this.comparePre(other);
    };

    SemVer.prototype.compareMain = function(other) {
      if (!(other instanceof SemVer))
        other = new SemVer(other, this.loose);

      return compareIdentifiers(this.major, other.major) ||
             compareIdentifiers(this.minor, other.minor) ||
             compareIdentifiers(this.patch, other.patch);
    };

    SemVer.prototype.comparePre = function(other) {
      if (!(other instanceof SemVer))
        other = new SemVer(other, this.loose);

      // NOT having a prerelease is > having one
      if (this.prerelease.length && !other.prerelease.length)
        return -1;
      else if (!this.prerelease.length && other.prerelease.length)
        return 1;
      else if (!this.prerelease.length && !other.prerelease.length)
        return 0;

      var i = 0;
      do {
        var a = this.prerelease[i];
        var b = other.prerelease[i];
        debug('prerelease compare', i, a, b);
        if (a === undefined && b === undefined)
          return 0;
        else if (b === undefined)
          return 1;
        else if (a === undefined)
          return -1;
        else if (a === b)
          continue;
        else
          return compareIdentifiers(a, b);
      } while (++i);
    };

    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    SemVer.prototype.inc = function(release, identifier) {
      switch (release) {
        case 'premajor':
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc('pre', identifier);
          break;
        case 'preminor':
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc('pre', identifier);
          break;
        case 'prepatch':
          // If this is already a prerelease, it will bump to the next version
          // drop any prereleases that might already exist, since they are not
          // relevant at this point.
          this.prerelease.length = 0;
          this.inc('patch', identifier);
          this.inc('pre', identifier);
          break;
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case 'prerelease':
          if (this.prerelease.length === 0)
            this.inc('patch', identifier);
          this.inc('pre', identifier);
          break;

        case 'major':
          // If this is a pre-major version, bump up to the same major version.
          // Otherwise increment major.
          // 1.0.0-5 bumps to 1.0.0
          // 1.1.0 bumps to 2.0.0
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0)
            this.major++;
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case 'minor':
          // If this is a pre-minor version, bump up to the same minor version.
          // Otherwise increment minor.
          // 1.2.0-5 bumps to 1.2.0
          // 1.2.1 bumps to 1.3.0
          if (this.patch !== 0 || this.prerelease.length === 0)
            this.minor++;
          this.patch = 0;
          this.prerelease = [];
          break;
        case 'patch':
          // If this is not a pre-release version, it will increment the patch.
          // If it is a pre-release it will bump up to the same patch version.
          // 1.2.0-5 patches to 1.2.0
          // 1.2.0 patches to 1.2.1
          if (this.prerelease.length === 0)
            this.patch++;
          this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
        case 'pre':
          if (this.prerelease.length === 0)
            this.prerelease = [0];
          else {
            var i = this.prerelease.length;
            while (--i >= 0) {
              if (typeof this.prerelease[i] === 'number') {
                this.prerelease[i]++;
                i = -2;
              }
            }
            if (i === -1) // didn't increment anything
              this.prerelease.push(0);
          }
          if (identifier) {
            // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
            // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
            if (this.prerelease[0] === identifier) {
              if (isNaN(this.prerelease[1]))
                this.prerelease = [identifier, 0];
            } else
              this.prerelease = [identifier, 0];
          }
          break;

        default:
          throw new Error('invalid increment argument: ' + release);
      }
      this.format();
      this.raw = this.version;
      return this;
    };

    exports.inc = inc;
    function inc(version, release, loose, identifier) {
      if (typeof(loose) === 'string') {
        identifier = loose;
        loose = undefined;
      }

      try {
        return new SemVer(version, loose).inc(release, identifier).version;
      } catch (er) {
        return null;
      }
    }

    exports.diff = diff;
    function diff(version1, version2) {
      if (eq(version1, version2)) {
        return null;
      } else {
        var v1 = parse(version1);
        var v2 = parse(version2);
        if (v1.prerelease.length || v2.prerelease.length) {
          for (var key in v1) {
            if (key === 'major' || key === 'minor' || key === 'patch') {
              if (v1[key] !== v2[key]) {
                return 'pre'+key;
              }
            }
          }
          return 'prerelease';
        }
        for (var key in v1) {
          if (key === 'major' || key === 'minor' || key === 'patch') {
            if (v1[key] !== v2[key]) {
              return key;
            }
          }
        }
      }
    }

    exports.compareIdentifiers = compareIdentifiers;

    var numeric = /^[0-9]+$/;
    function compareIdentifiers(a, b) {
      var anum = numeric.test(a);
      var bnum = numeric.test(b);

      if (anum && bnum) {
        a = +a;
        b = +b;
      }

      return (anum && !bnum) ? -1 :
             (bnum && !anum) ? 1 :
             a < b ? -1 :
             a > b ? 1 :
             0;
    }

    exports.rcompareIdentifiers = rcompareIdentifiers;
    function rcompareIdentifiers(a, b) {
      return compareIdentifiers(b, a);
    }

    exports.major = major;
    function major(a, loose) {
      return new SemVer(a, loose).major;
    }

    exports.minor = minor;
    function minor(a, loose) {
      return new SemVer(a, loose).minor;
    }

    exports.patch = patch;
    function patch(a, loose) {
      return new SemVer(a, loose).patch;
    }

    exports.compare = compare;
    function compare(a, b, loose) {
      return new SemVer(a, loose).compare(new SemVer(b, loose));
    }

    exports.compareLoose = compareLoose;
    function compareLoose(a, b) {
      return compare(a, b, true);
    }

    exports.rcompare = rcompare;
    function rcompare(a, b, loose) {
      return compare(b, a, loose);
    }

    exports.sort = sort;
    function sort(list, loose) {
      return list.sort(function(a, b) {
        return exports.compare(a, b, loose);
      });
    }

    exports.rsort = rsort;
    function rsort(list, loose) {
      return list.sort(function(a, b) {
        return exports.rcompare(a, b, loose);
      });
    }

    exports.gt = gt;
    function gt(a, b, loose) {
      return compare(a, b, loose) > 0;
    }

    exports.lt = lt;
    function lt(a, b, loose) {
      return compare(a, b, loose) < 0;
    }

    exports.eq = eq;
    function eq(a, b, loose) {
      return compare(a, b, loose) === 0;
    }

    exports.neq = neq;
    function neq(a, b, loose) {
      return compare(a, b, loose) !== 0;
    }

    exports.gte = gte;
    function gte(a, b, loose) {
      return compare(a, b, loose) >= 0;
    }

    exports.lte = lte;
    function lte(a, b, loose) {
      return compare(a, b, loose) <= 0;
    }

    exports.cmp = cmp;
    function cmp(a, op, b, loose) {
      var ret;
      switch (op) {
        case '===':
          if (typeof a === 'object') a = a.version;
          if (typeof b === 'object') b = b.version;
          ret = a === b;
          break;
        case '!==':
          if (typeof a === 'object') a = a.version;
          if (typeof b === 'object') b = b.version;
          ret = a !== b;
          break;
        case '': case '=': case '==': ret = eq(a, b, loose); break;
        case '!=': ret = neq(a, b, loose); break;
        case '>': ret = gt(a, b, loose); break;
        case '>=': ret = gte(a, b, loose); break;
        case '<': ret = lt(a, b, loose); break;
        case '<=': ret = lte(a, b, loose); break;
        default: throw new TypeError('Invalid operator: ' + op);
      }
      return ret;
    }

    exports.Comparator = Comparator;
    function Comparator(comp, loose) {
      if (comp instanceof Comparator) {
        if (comp.loose === loose)
          return comp;
        else
          comp = comp.value;
      }

      if (!(this instanceof Comparator))
        return new Comparator(comp, loose);

      debug('comparator', comp, loose);
      this.loose = loose;
      this.parse(comp);

      if (this.semver === ANY)
        this.value = '';
      else
        this.value = this.operator + this.semver.version;

      debug('comp', this);
    }

    var ANY = {};
    Comparator.prototype.parse = function(comp) {
      var r = this.loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
      var m = comp.match(r);

      if (!m)
        throw new TypeError('Invalid comparator: ' + comp);

      this.operator = m[1];
      if (this.operator === '=')
        this.operator = '';

      // if it literally is just '>' or '' then allow anything.
      if (!m[2])
        this.semver = ANY;
      else
        this.semver = new SemVer(m[2], this.loose);
    };

    Comparator.prototype.toString = function() {
      return this.value;
    };

    Comparator.prototype.test = function(version) {
      debug('Comparator.test', version, this.loose);

      if (this.semver === ANY)
        return true;

      if (typeof version === 'string')
        version = new SemVer(version, this.loose);

      return cmp(version, this.operator, this.semver, this.loose);
    };

    Comparator.prototype.intersects = function(comp, loose) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError('a Comparator is required');
      }

      var rangeTmp;

      if (this.operator === '') {
        rangeTmp = new Range(comp.value, loose);
        return satisfies(this.value, rangeTmp, loose);
      } else if (comp.operator === '') {
        rangeTmp = new Range(this.value, loose);
        return satisfies(comp.semver, rangeTmp, loose);
      }

      var sameDirectionIncreasing =
        (this.operator === '>=' || this.operator === '>') &&
        (comp.operator === '>=' || comp.operator === '>');
      var sameDirectionDecreasing =
        (this.operator === '<=' || this.operator === '<') &&
        (comp.operator === '<=' || comp.operator === '<');
      var sameSemVer = this.semver.version === comp.semver.version;
      var differentDirectionsInclusive =
        (this.operator === '>=' || this.operator === '<=') &&
        (comp.operator === '>=' || comp.operator === '<=');
      var oppositeDirectionsLessThan =
        cmp(this.semver, '<', comp.semver, loose) &&
        ((this.operator === '>=' || this.operator === '>') &&
        (comp.operator === '<=' || comp.operator === '<'));
      var oppositeDirectionsGreaterThan =
        cmp(this.semver, '>', comp.semver, loose) &&
        ((this.operator === '<=' || this.operator === '<') &&
        (comp.operator === '>=' || comp.operator === '>'));

      return sameDirectionIncreasing || sameDirectionDecreasing ||
        (sameSemVer && differentDirectionsInclusive) ||
        oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    };


    exports.Range = Range;
    function Range(range, loose) {
      if (range instanceof Range) {
        if (range.loose === loose) {
          return range;
        } else {
          return new Range(range.raw, loose);
        }
      }

      if (range instanceof Comparator) {
        return new Range(range.value, loose);
      }

      if (!(this instanceof Range))
        return new Range(range, loose);

      this.loose = loose;

      // First, split based on boolean or ||
      this.raw = range;
      this.set = range.split(/\s*\|\|\s*/).map(function(range) {
        return this.parseRange(range.trim());
      }, this).filter(function(c) {
        // throw out any that are not relevant for whatever reason
        return c.length;
      });

      if (!this.set.length) {
        throw new TypeError('Invalid SemVer Range: ' + range);
      }

      this.format();
    }

    Range.prototype.format = function() {
      this.range = this.set.map(function(comps) {
        return comps.join(' ').trim();
      }).join('||').trim();
      return this.range;
    };

    Range.prototype.toString = function() {
      return this.range;
    };

    Range.prototype.parseRange = function(range) {
      var loose = this.loose;
      range = range.trim();
      debug('range', range, loose);
      // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
      var hr = loose ? re[HYPHENRANGELOOSE] : re[HYPHENRANGE];
      range = range.replace(hr, hyphenReplace);
      debug('hyphen replace', range);
      // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
      range = range.replace(re[COMPARATORTRIM], comparatorTrimReplace);
      debug('comparator trim', range, re[COMPARATORTRIM]);

      // `~ 1.2.3` => `~1.2.3`
      range = range.replace(re[TILDETRIM], tildeTrimReplace);

      // `^ 1.2.3` => `^1.2.3`
      range = range.replace(re[CARETTRIM], caretTrimReplace);

      // normalize spaces
      range = range.split(/\s+/).join(' ');

      // At this point, the range is completely trimmed and
      // ready to be split into comparators.

      var compRe = loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
      var set = range.split(' ').map(function(comp) {
        return parseComparator(comp, loose);
      }).join(' ').split(/\s+/);
      if (this.loose) {
        // in loose mode, throw out any that are not valid comparators
        set = set.filter(function(comp) {
          return !!comp.match(compRe);
        });
      }
      set = set.map(function(comp) {
        return new Comparator(comp, loose);
      });

      return set;
    };

    Range.prototype.intersects = function(range, loose) {
      if (!(range instanceof Range)) {
        throw new TypeError('a Range is required');
      }

      return this.set.some(function(thisComparators) {
        return thisComparators.every(function(thisComparator) {
          return range.set.some(function(rangeComparators) {
            return rangeComparators.every(function(rangeComparator) {
              return thisComparator.intersects(rangeComparator, loose);
            });
          });
        });
      });
    };

    // Mostly just for testing and legacy API reasons
    exports.toComparators = toComparators;
    function toComparators(range, loose) {
      return new Range(range, loose).set.map(function(comp) {
        return comp.map(function(c) {
          return c.value;
        }).join(' ').trim().split(' ');
      });
    }

    // comprised of xranges, tildes, stars, and gtlt's at this point.
    // already replaced the hyphen ranges
    // turn into a set of JUST comparators.
    function parseComparator(comp, loose) {
      debug('comp', comp);
      comp = replaceCarets(comp, loose);
      debug('caret', comp);
      comp = replaceTildes(comp, loose);
      debug('tildes', comp);
      comp = replaceXRanges(comp, loose);
      debug('xrange', comp);
      comp = replaceStars(comp, loose);
      debug('stars', comp);
      return comp;
    }

    function isX(id) {
      return !id || id.toLowerCase() === 'x' || id === '*';
    }

    // ~, ~> --> * (any, kinda silly)
    // ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
    // ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
    // ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
    // ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
    // ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
    function replaceTildes(comp, loose) {
      return comp.trim().split(/\s+/).map(function(comp) {
        return replaceTilde(comp, loose);
      }).join(' ');
    }

    function replaceTilde(comp, loose) {
      var r = loose ? re[TILDELOOSE] : re[TILDE];
      return comp.replace(r, function(_, M, m, p, pr) {
        debug('tilde', comp, _, M, m, p, pr);
        var ret;

        if (isX(M))
          ret = '';
        else if (isX(m))
          ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
        else if (isX(p))
          // ~1.2 == >=1.2.0 <1.3.0
          ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
        else if (pr) {
          debug('replaceTilde pr', pr);
          if (pr.charAt(0) !== '-')
            pr = '-' + pr;
          ret = '>=' + M + '.' + m + '.' + p + pr +
                ' <' + M + '.' + (+m + 1) + '.0';
        } else
          // ~1.2.3 == >=1.2.3 <1.3.0
          ret = '>=' + M + '.' + m + '.' + p +
                ' <' + M + '.' + (+m + 1) + '.0';

        debug('tilde return', ret);
        return ret;
      });
    }

    // ^ --> * (any, kinda silly)
    // ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
    // ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
    // ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
    // ^1.2.3 --> >=1.2.3 <2.0.0
    // ^1.2.0 --> >=1.2.0 <2.0.0
    function replaceCarets(comp, loose) {
      return comp.trim().split(/\s+/).map(function(comp) {
        return replaceCaret(comp, loose);
      }).join(' ');
    }

    function replaceCaret(comp, loose) {
      debug('caret', comp, loose);
      var r = loose ? re[CARETLOOSE] : re[CARET];
      return comp.replace(r, function(_, M, m, p, pr) {
        debug('caret', comp, _, M, m, p, pr);
        var ret;

        if (isX(M))
          ret = '';
        else if (isX(m))
          ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
        else if (isX(p)) {
          if (M === '0')
            ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
          else
            ret = '>=' + M + '.' + m + '.0 <' + (+M + 1) + '.0.0';
        } else if (pr) {
          debug('replaceCaret pr', pr);
          if (pr.charAt(0) !== '-')
            pr = '-' + pr;
          if (M === '0') {
            if (m === '0')
              ret = '>=' + M + '.' + m + '.' + p + pr +
                    ' <' + M + '.' + m + '.' + (+p + 1);
            else
              ret = '>=' + M + '.' + m + '.' + p + pr +
                    ' <' + M + '.' + (+m + 1) + '.0';
          } else
            ret = '>=' + M + '.' + m + '.' + p + pr +
                  ' <' + (+M + 1) + '.0.0';
        } else {
          debug('no pr');
          if (M === '0') {
            if (m === '0')
              ret = '>=' + M + '.' + m + '.' + p +
                    ' <' + M + '.' + m + '.' + (+p + 1);
            else
              ret = '>=' + M + '.' + m + '.' + p +
                    ' <' + M + '.' + (+m + 1) + '.0';
          } else
            ret = '>=' + M + '.' + m + '.' + p +
                  ' <' + (+M + 1) + '.0.0';
        }

        debug('caret return', ret);
        return ret;
      });
    }

    function replaceXRanges(comp, loose) {
      debug('replaceXRanges', comp, loose);
      return comp.split(/\s+/).map(function(comp) {
        return replaceXRange(comp, loose);
      }).join(' ');
    }

    function replaceXRange(comp, loose) {
      comp = comp.trim();
      var r = loose ? re[XRANGELOOSE] : re[XRANGE];
      return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
        debug('xRange', comp, ret, gtlt, M, m, p, pr);
        var xM = isX(M);
        var xm = xM || isX(m);
        var xp = xm || isX(p);
        var anyX = xp;

        if (gtlt === '=' && anyX)
          gtlt = '';

        if (xM) {
          if (gtlt === '>' || gtlt === '<') {
            // nothing is allowed
            ret = '<0.0.0';
          } else {
            // nothing is forbidden
            ret = '*';
          }
        } else if (gtlt && anyX) {
          // replace X with 0
          if (xm)
            m = 0;
          if (xp)
            p = 0;

          if (gtlt === '>') {
            // >1 => >=2.0.0
            // >1.2 => >=1.3.0
            // >1.2.3 => >= 1.2.4
            gtlt = '>=';
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else if (xp) {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === '<=') {
            // <=0.7.x is actually <0.8.0, since any 0.7.x should
            // pass.  Similarly, <=7.x is actually <8.0.0, etc.
            gtlt = '<';
            if (xm)
              M = +M + 1;
            else
              m = +m + 1;
          }

          ret = gtlt + M + '.' + m + '.' + p;
        } else if (xm) {
          ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
        } else if (xp) {
          ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
        }

        debug('xRange return', ret);

        return ret;
      });
    }

    // Because * is AND-ed with everything else in the comparator,
    // and '' means "any version", just remove the *s entirely.
    function replaceStars(comp, loose) {
      debug('replaceStars', comp, loose);
      // Looseness is ignored here.  star is always as loose as it gets!
      return comp.trim().replace(re[STAR], '');
    }

    // This function is passed to string.replace(re[HYPHENRANGE])
    // M, m, patch, prerelease, build
    // 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
    // 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
    // 1.2 - 3.4 => >=1.2.0 <3.5.0
    function hyphenReplace($0,
                           from, fM, fm, fp, fpr, fb,
                           to, tM, tm, tp, tpr, tb) {

      if (isX(fM))
        from = '';
      else if (isX(fm))
        from = '>=' + fM + '.0.0';
      else if (isX(fp))
        from = '>=' + fM + '.' + fm + '.0';
      else
        from = '>=' + from;

      if (isX(tM))
        to = '';
      else if (isX(tm))
        to = '<' + (+tM + 1) + '.0.0';
      else if (isX(tp))
        to = '<' + tM + '.' + (+tm + 1) + '.0';
      else if (tpr)
        to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr;
      else
        to = '<=' + to;

      return (from + ' ' + to).trim();
    }


    // if ANY of the sets match ALL of its comparators, then pass
    Range.prototype.test = function(version) {
      if (!version)
        return false;

      if (typeof version === 'string')
        version = new SemVer(version, this.loose);

      for (var i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version))
          return true;
      }
      return false;
    };

    function testSet(set, version) {
      for (var i = 0; i < set.length; i++) {
        if (!set[i].test(version))
          return false;
      }

      if (version.prerelease.length) {
        // Find the set of versions that are allowed to have prereleases
        // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
        // That should allow `1.2.3-pr.2` to pass.
        // However, `1.2.4-alpha.notready` should NOT be allowed,
        // even though it's within the range set by the comparators.
        for (var i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === ANY)
            continue;

          if (set[i].semver.prerelease.length > 0) {
            var allowed = set[i].semver;
            if (allowed.major === version.major &&
                allowed.minor === version.minor &&
                allowed.patch === version.patch)
              return true;
          }
        }

        // Version has a -pre, but it's not one of the ones we like.
        return false;
      }

      return true;
    }

    exports.satisfies = satisfies;
    function satisfies(version, range, loose) {
      try {
        range = new Range(range, loose);
      } catch (er) {
        return false;
      }
      return range.test(version);
    }

    exports.maxSatisfying = maxSatisfying;
    function maxSatisfying(versions, range, loose) {
      var max = null;
      var maxSV = null;
      try {
        var rangeObj = new Range(range, loose);
      } catch (er) {
        return null;
      }
      versions.forEach(function (v) {
        if (rangeObj.test(v)) { // satisfies(v, range, loose)
          if (!max || maxSV.compare(v) === -1) { // compare(max, v, true)
            max = v;
            maxSV = new SemVer(max, loose);
          }
        }
      });
      return max;
    }

    exports.minSatisfying = minSatisfying;
    function minSatisfying(versions, range, loose) {
      var min = null;
      var minSV = null;
      try {
        var rangeObj = new Range(range, loose);
      } catch (er) {
        return null;
      }
      versions.forEach(function (v) {
        if (rangeObj.test(v)) { // satisfies(v, range, loose)
          if (!min || minSV.compare(v) === 1) { // compare(min, v, true)
            min = v;
            minSV = new SemVer(min, loose);
          }
        }
      });
      return min;
    }

    exports.validRange = validRange;
    function validRange(range, loose) {
      try {
        // Return '*' instead of '' so that truthiness works.
        // This will throw if it's invalid anyway
        return new Range(range, loose).range || '*';
      } catch (er) {
        return null;
      }
    }

    // Determine if version is less than all the versions possible in the range
    exports.ltr = ltr;
    function ltr(version, range, loose) {
      return outside(version, range, '<', loose);
    }

    // Determine if version is greater than all the versions possible in the range.
    exports.gtr = gtr;
    function gtr(version, range, loose) {
      return outside(version, range, '>', loose);
    }

    exports.outside = outside;
    function outside(version, range, hilo, loose) {
      version = new SemVer(version, loose);
      range = new Range(range, loose);

      var gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case '>':
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = '>';
          ecomp = '>=';
          break;
        case '<':
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = '<';
          ecomp = '<=';
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }

      // If it satisifes the range it is not outside
      if (satisfies(version, range, loose)) {
        return false;
      }

      // From now on, variable terms are as if we're in "gtr" mode.
      // but note that everything is flipped for the "ltr" function.

      for (var i = 0; i < range.set.length; ++i) {
        var comparators = range.set[i];

        var high = null;
        var low = null;

        comparators.forEach(function(comparator) {
          if (comparator.semver === ANY) {
            comparator = new Comparator('>=0.0.0');
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, loose)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, loose)) {
            low = comparator;
          }
        });

        // If the edge version comparator has a operator then our version
        // isn't outside it
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }

        // If the lowest version comparator has an operator and our version
        // is less than it then it isn't higher than the range
        if ((!low.operator || low.operator === comp) &&
            ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    }

    exports.prerelease = prerelease;
    function prerelease(version, loose) {
      var parsed = parse(version, loose);
      return (parsed && parsed.prerelease.length) ? parsed.prerelease : null;
    }

    exports.intersects = intersects;
    function intersects(r1, r2, loose) {
      r1 = new Range(r1, loose);
      r2 = new Range(r2, loose);
      return r1.intersects(r2)
    }

    exports.coerce = coerce;
    function coerce(version) {
      if (version instanceof SemVer)
        return version;

      if (typeof version !== 'string')
        return null;

      var match = version.match(re[COERCE]);

      if (match == null)
        return null;

      return parse((match[1] || '0') + '.' + (match[2] || '0') + '.' + (match[3] || '0')); 
    }
    });
    var semver_1 = semver.SEMVER_SPEC_VERSION;
    var semver_2 = semver.re;
    var semver_3 = semver.src;
    var semver_4 = semver.parse;
    var semver_5 = semver.valid;
    var semver_6 = semver.clean;
    var semver_7 = semver.SemVer;
    var semver_8 = semver.inc;
    var semver_9 = semver.diff;
    var semver_10 = semver.compareIdentifiers;
    var semver_11 = semver.rcompareIdentifiers;
    var semver_12 = semver.major;
    var semver_13 = semver.minor;
    var semver_14 = semver.patch;
    var semver_15 = semver.compare;
    var semver_16 = semver.compareLoose;
    var semver_17 = semver.rcompare;
    var semver_18 = semver.sort;
    var semver_19 = semver.rsort;
    var semver_20 = semver.gt;
    var semver_21 = semver.lt;
    var semver_22 = semver.eq;
    var semver_23 = semver.neq;
    var semver_24 = semver.gte;
    var semver_25 = semver.lte;
    var semver_26 = semver.cmp;
    var semver_27 = semver.Comparator;
    var semver_28 = semver.Range;
    var semver_29 = semver.toComparators;
    var semver_30 = semver.satisfies;
    var semver_31 = semver.maxSatisfying;
    var semver_32 = semver.minSatisfying;
    var semver_33 = semver.validRange;
    var semver_34 = semver.ltr;
    var semver_35 = semver.gtr;
    var semver_36 = semver.outside;
    var semver_37 = semver.prerelease;
    var semver_38 = semver.intersects;
    var semver_39 = semver.coerce;

    const shortSemverRegEx = /^([~\^])?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;
    const semverRegEx = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-z-]+(?:\.[\da-z-]+)*))?(\+[\da-z-]+)?$/i;
    var semverRegEx_1 = semverRegEx;
    var shortSemverRegEx_1 = shortSemverRegEx;

    const MAJOR = Symbol('major');
    const MINOR = Symbol('minor');
    const PATCH = Symbol('patch');
    const PRE = Symbol('pre');
    const BUILD = Symbol('build');
    const TAG = Symbol('tag');

    let numRegEx = /^\d+$/;
    class Semver {
      constructor (version) {
        let semver = version.match(semverRegEx);
        if (!semver) {
          this[TAG] = version;
          return;
        }
        this[MAJOR] = parseInt(semver[1], 10);
        this[MINOR] = parseInt(semver[2], 10);
        this[PATCH] = parseInt(semver[3], 10);
        this[PRE] = semver[4] && semver[4].split('.');
        this[BUILD] = semver[5];
      }
      get major () {
        return this[MAJOR];
      }
      get minor () {
        return this[MINOR];
      }
      get patch () {
        return this[PATCH];
      }
      get pre () {
        return this[PRE];
      }
      get build () {
        return this[BUILD];
      }
      get tag () {
        return this[TAG];
      }
      gt (version) {
        return Semver.compare(this, version) === 1;
      }
      lt (version) {
        return Semver.compare(this, version) === -1;
      }
      eq (version) {
        if (!(version instanceof Semver))
          version = new Semver(version);

        if (this[TAG] && version[TAG])
          return this[TAG] === version[TAG];
        if (this[TAG] || version[TAG])
          return false;
        if (this[MAJOR] !== version[MAJOR])
          return false;
        if (this[MINOR] !== version[MINOR])
          return false;
        if (this[PATCH] !== version[PATCH])
          return false;
        if (this[PRE] === undefined && version[PRE] === undefined)
          return true;
        if (this[PRE] === undefined || version[PRE] === undefined)
          return false;
        if (this[PRE].length !== version[PRE].length)
          return false;
        for (let i = 0; i < this[PRE].length; i++) {
          if (this[PRE][i] !== version[PRE][i])
            return false;
        }
        return this[BUILD] === version[BUILD];
      }
      matches (range, unstable = false) {
        if (!(range instanceof SemverRange))
          range = new SemverRange(range);
        return range.has(this, unstable);
      }
      toString () {
        if (this[TAG])
          return this[TAG];
        return this[MAJOR] + '.' + this[MINOR] + '.' + this[PATCH] + (this[PRE] ? '-' + this[PRE].join('.') : '') + (this[BUILD] ? this[BUILD] : '');
      }
      static isValid (version) {
        let semver = version.match(semverRegEx);
        return semver && semver[2] !== undefined && semver[3] !== undefined;
      }
      static compare (v1, v2) {
        if (!(v1 instanceof Semver))
          v1 = new Semver(v1);
        if (!(v2 instanceof Semver))
          v2 = new Semver(v2);

        // not semvers - tags have equal precedence
        if (v1[TAG] && v2[TAG])
          return 0;
        // semver beats tag version
        if (v1[TAG])
          return -1;
        if (v2[TAG])
          return 1;
        // compare version numbers
        if (v1[MAJOR] !== v2[MAJOR])
          return v1[MAJOR] > v2[MAJOR] ? 1 : -1;
        if (v1[MINOR] !== v2[MINOR])
          return v1[MINOR] > v2[MINOR] ? 1 : -1;
        if (v1[PATCH] !== v2[PATCH])
          return v1[PATCH] > v2[PATCH] ? 1 : -1;
        if (!v1[PRE] && !v2[PRE])
          return 0;
        if (!v1[PRE])
          return 1;
        if (!v2[PRE])
          return -1;
        // prerelease comparison
        return prereleaseCompare(v1[PRE], v2[PRE]);
      }
    }
    var Semver_1 = Semver;

    function prereleaseCompare (v1Pre, v2Pre) {
      for (let i = 0, l = Math.min(v1Pre.length, v2Pre.length); i < l; i++) {
        if (v1Pre[i] !== v2Pre[i]) {
          let isNum1 = v1Pre[i].match(numRegEx);
          let isNum2 = v2Pre[i].match(numRegEx);
          // numeric has lower precedence
          if (isNum1 && !isNum2)
            return -1;
          if (isNum2 && !isNum1)
            return 1;
          // compare parts
          if (isNum1 && isNum2)
            return parseInt(v1Pre[i], 10) > parseInt(v2Pre[i], 10) ? 1 : -1;
          else
            return v1Pre[i] > v2Pre[i] ? 1 : -1;
        }
      }
      if (v1Pre.length === v2Pre.length)
        return 0;
      // more pre-release fields win if equal
      return v1Pre.length > v2Pre.length ? 1 : -1;

    }

    const WILDCARD_RANGE = 0;
    const MAJOR_RANGE = 1;
    const STABLE_RANGE = 2;
    const EXACT_RANGE = 3;

    const TYPE = Symbol('type');
    const VERSION = Symbol('version');

    class SemverRange {
      constructor (versionRange) {
        if (versionRange === '*' || versionRange === '') {
          this[TYPE] = WILDCARD_RANGE;
          return;
        }
        let shortSemver = versionRange.match(shortSemverRegEx);
        if (shortSemver) {
          if (shortSemver[1])
            versionRange = versionRange.substr(1);
          if (shortSemver[3] === undefined) {
            // ^, ~ mean the same thing for a single major
            this[VERSION] = new Semver(versionRange + '.0.0');
            this[TYPE] = MAJOR_RANGE;
          }
          else {
            this[VERSION] = new Semver(versionRange + '.0');
            // ^ only becomes major range for major > 0
            if (shortSemver[1] === '^' && shortSemver[2] !== '0')
              this[TYPE] = MAJOR_RANGE;
            else
              this[TYPE] = STABLE_RANGE;
          }
          // empty pre array === support prerelease ranges
          this[VERSION][PRE] = this[VERSION][PRE] || [];
        }
        else if (versionRange[0] === '^') {
          this[VERSION] = new Semver(versionRange.substr(1));
          if (this[VERSION][MAJOR] === 0) {
            if (this[VERSION][MINOR] === 0)
              this[TYPE] = EXACT_RANGE;
            else
              this[TYPE] = STABLE_RANGE;
          }
          else {
            this[TYPE] = MAJOR_RANGE;
          }
        }
        else if (versionRange[0] === '~') {
          this[VERSION] = new Semver(versionRange.substr(1));
          this[TYPE] = STABLE_RANGE;
        }
        else {
          this[VERSION] = new Semver(versionRange);
          this[TYPE] = EXACT_RANGE;
        }
        if (this[VERSION][TAG] && this[TYPE] !== EXACT_RANGE)
          this[TYPE] = EXACT_RANGE;
      }
      get isExact () {
        return this[TYPE] === EXACT_RANGE;
      }
      get isExactSemver () {
        return this[TYPE] === EXACT_RANGE && this.version[TAG] === undefined;
      }
      get isExactTag () {
        return this[TYPE] === EXACT_RANGE && this.version[TAG] !== undefined;
      }
      get isStable () {
        return this[TYPE] === STABLE_RANGE;
      }
      get isMajor () {
        return this[TYPE] === MAJOR_RANGE;
      }
      get isWildcard () {
        return this[TYPE] === WILDCARD_RANGE;
      }
      get type () {
        switch (this[TYPE]) {
          case WILDCARD_RANGE:
            return 'wildcard';
          case MAJOR_RANGE:
            return 'major';
          case STABLE_RANGE:
            return 'stable';
          case EXACT_RANGE:
            return 'exact';
        }
      }
      get version () {
        return this[VERSION];
      }
      gt (range) {
        return SemverRange.compare(this, range) === 1;
      }
      lt (range) {
        return SemverRange.compare(this, range) === -1;
      }
      eq (range) {
        return SemverRange.compare(this, range) === 0;
      }
      has (version, unstable = false) {
        if (!(version instanceof Semver))
          version = new Semver(version);
        if (this[TYPE] === WILDCARD_RANGE)
          return unstable || (!version[PRE] && !version[TAG]);
        if (this[TYPE] === EXACT_RANGE)
          return this[VERSION].eq(version);
        if (version[TAG])
          return false;
        if (this[VERSION][MAJOR] !== version[MAJOR])
          return false;
        if (this[TYPE] === MAJOR_RANGE ? this[VERSION][MINOR] > version[MINOR] : this[VERSION][MINOR] !== version[MINOR])
          return false;
        if ((this[TYPE] === MAJOR_RANGE ? this[VERSION][MINOR] === version[MINOR] : true) && this[VERSION][PATCH] > version[PATCH])
          return false;
        if (version[PRE] === undefined || version[PRE].length === 0)
          return true;
        if (this[VERSION][PRE] === undefined || this[VERSION][PRE].length === 0)
          return unstable;
        if (unstable === false && (this[VERSION][MINOR] !== version[MINOR] || this[VERSION][PATCH] !== version[PATCH]))
          return false;
        return prereleaseCompare(this[VERSION][PRE], version[PRE]) !== 1;
      }
      contains (range) {
        if (!(range instanceof SemverRange))
          range = new SemverRange(range);
        if (this[TYPE] === WILDCARD_RANGE)
          return true;
        if (range[TYPE] === WILDCARD_RANGE)
          return false;
        return range[TYPE] >= this[TYPE] && this.has(range[VERSION], true);
      }
      intersect (range) {
        if (!(range instanceof SemverRange))
          range = new SemverRange(range);

        if (this[TYPE] === WILDCARD_RANGE && range[TYPE] === WILDCARD_RANGE)
          return this;
        if (this[TYPE] === WILDCARD_RANGE)
          return range;
        if (range[TYPE] === WILDCARD_RANGE)
          return this;

        if (this[TYPE] === EXACT_RANGE)
          return range.has(this[VERSION], true) ? this : undefined;
        if (range[TYPE] === EXACT_RANGE)
          return this.has(range[VERSION], true) ? range : undefined;

        let higherRange, lowerRange, polarity;
        if (range[VERSION].gt(this[VERSION])) {
          higherRange = range;
          lowerRange = this;
          polarity = true;
        }
        else {
          higherRange = this;
          lowerRange = range;
          polarity = false;
        }

        if (!lowerRange.has(higherRange[VERSION], true))
          return;

        if (lowerRange[TYPE] === MAJOR_RANGE)
          return polarity ? range : this;

        let intersection = new SemverRange(higherRange[VERSION].toString());
        intersection[TYPE] = STABLE_RANGE;
        return intersection;
      }
      bestMatch (versions, unstable = false) {
        let maxSemver;
        versions.forEach(version => {
          if (!(version instanceof Semver))
            version = new Semver(version);
          if (!this.has(version, unstable))
            return;
          if (!maxSemver)
            maxSemver = version;
          else if (Semver.compare(version, maxSemver) === 1)
            maxSemver = version;
        });
        return maxSemver;
      }
      toString () {
        let version = this[VERSION];
        switch (this[TYPE]) {
          case WILDCARD_RANGE:
            return '*';
          case MAJOR_RANGE:
            if (version[MAJOR] === 0 && version[MINOR] === 0 && version[PATCH] === 0)
               return '0';
            if (version[PRE] && version[PRE].length === 0 && version[PATCH] === 0)
               return '^' + version[MAJOR] + '.' + version[MINOR];
            return '^' + version.toString();
          case STABLE_RANGE:
            if (version[PRE] && version[PRE].length === 0 && version[PATCH] === 0)
              return version[MAJOR] + '.' + version[MINOR];
            return '~' + version.toString();
          case EXACT_RANGE:
            return version.toString();
        }
      }
      static match (range, version, unstable = false) {
        if (!(version instanceof Semver))
          version = new Semver(version);
        return version.matches(range, unstable);
      }
      static isValid (range) {
        let semverRange = new SemverRange(range);
        return semverRange[TYPE] !== EXACT_RANGE || semverRange[VERSION][TAG] === undefined;
      }
      static compare (r1, r2) {
        if (!(r1 instanceof SemverRange))
          r1 = new SemverRange(r1);
        if (!(r2 instanceof SemverRange))
          r2 = new SemverRange(r2);
        if (r1[TYPE] === WILDCARD_RANGE && r2[TYPE] === WILDCARD_RANGE)
          return 0;
        if (r1[TYPE] === WILDCARD_RANGE)
          return 1;
        if (r2[TYPE] === WILDCARD_RANGE)
          return -1;
        let cmp = Semver.compare(r1[VERSION], r2[VERSION]);
        if (cmp !== 0) {
          return cmp;
        }
        if (r1[TYPE] === r2[TYPE])
          return 0;
        return r1[TYPE] > r2[TYPE] ? 1 : -1;
      }
    }
    var SemverRange_1 = SemverRange;

    var sver = {
    	semverRegEx: semverRegEx_1,
    	shortSemverRegEx: shortSemverRegEx_1,
    	Semver: Semver_1,
    	SemverRange: SemverRange_1
    };

    const { Semver: Semver$1, SemverRange: SemverRange$1 } = sver;

    var convertRange = function nodeRangeToSemverRange (range) {
      let parsed = semver.validRange(range);

      // tag version
      if (!parsed)
        return new SemverRange$1(range);

      if (parsed === '*')
        return new SemverRange$1(parsed);

      try {
        let semverRange = new SemverRange$1(range);
        if (!semverRange.version.tag)
          return semverRange;
      }
      catch (e) {
        if (e.code !== 'ENOTSEMVER')
          throw e;
      }

      let outRange;
      for (let union of parsed.split('||')) {

        // compute the intersection into a lowest upper bound and a highest lower bound
        let upperBound, lowerBound, upperEq, lowerEq;
        for (let intersection of union.split(' ')) {
          let lt = intersection[0] === '<';
          let gt = intersection[0] === '>';
          if (!lt && !gt) {
            upperBound = intersection;
            upperEq = true;
            break;
          }
          let eq = intersection[1] === '=';
          if (!gt) {
            let version = new Semver$1(intersection.substr(1 + eq));
            if (!upperBound || upperBound.gt(version)) {
              upperBound = version;
              upperEq = eq;
            }
          }
          else if (!lt) {
            let eq = intersection[1] === '=';
            let version = new Semver$1(intersection.substr(1 + eq));
            if (!lowerBound || lowerBound.lt(version)) {
              lowerBound = version;
              lowerEq = eq;
            }
          }
        }

        // if the lower bound is greater than the upper bound then just return the lower bound exactly
        if (lowerBound && upperBound && lowerBound.gt(upperBound)) {
          let curRange = new SemverRange$1(lowerBound.toString());
          // the largest or highest union range wins
          if (!outRange || !outRange.contains(curRange) && (curRange.gt(outRange) || curRange.contains(outRange)))
            outRange = curRange;
          continue;
        }

        // determine the largest semver range satisfying the upper bound
        let upperRange;
        if (upperBound) {
          // if the upper bound has an equality then we return it directly
          if (upperEq) {
            let curRange = new SemverRange$1(upperBound.toString());
            // the largest or highest union range wins
            if (!outRange || !outRange.contains(curRange) && (curRange.gt(outRange) || curRange.contains(outRange)))
              outRange = curRange;
            continue;
          }

          let major = 0, minor = 0, patch = 0, rangeType = '';

          // if an exact prerelease range, match the lower bound as a range
          if (upperBound.pre && lowerBound.major === upperBound.major && lowerBound.minor === upperBound.minor && lowerBound.patch === upperBound.patch) {
            outRange = new SemverRange$1('~' + lowerBound.toString());
            continue;
          }

          // <2.0.0 -> ^1.0.0
          else if (upperBound.patch === 0) {
            if (upperBound.minor === 0) {
              if (upperBound.major > 0) {
                major = upperBound.major - 1;
                rangeType = '^';
              }
            }
            // <1.2.0 -> ~1.1.0
            else {
              major = upperBound.major;
              minor = upperBound.minor - 1;
              rangeType = '~';
            }
          }
          // <1.2.3 -> ~1.2.0
          else {
            major = upperBound.major;
            minor = upperBound.minor;
            patch = 0;
            rangeType = '~';
          }

          if (major === 0 && rangeType === '^')
            upperRange = new SemverRange$1('0');
          else
            upperRange = new SemverRange$1(rangeType + major + '.' + minor + '.' + patch);
        }

        // determine the lower range semver range
        let lowerRange;
        if (!lowerEq) {
          if (lowerBound.pre)
            lowerRange = new SemverRange$1('^' + lowerBound.major + '.' + lowerBound.minor + '.' + lowerBound.patch + '-' + [...lowerBound.pre, 1].join('.'));
          else
            lowerRange = new SemverRange$1('^' + lowerBound.major + '.' + lowerBound.minor + '.' + (lowerBound.patch + 1));
        }
        else {
          lowerRange = new SemverRange$1('^' + lowerBound.toString());
        }

        // we then intersect the upper semver range with the lower semver range
        // if the intersection is empty, we return the upper range only
        let curRange = upperRange ? lowerRange.intersect(upperRange) || upperRange : lowerRange;

        // the largest or highest union range wins
        if (!outRange || !outRange.contains(curRange) && (curRange.gt(outRange) || curRange.contains(outRange)))
          outRange = curRange;
      }
      return outRange;
    };

    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    function encode(decoded) {
        var sourceFileIndex = 0; // second field
        var sourceCodeLine = 0; // third field
        var sourceCodeColumn = 0; // fourth field
        var nameIndex = 0; // fifth field
        var mappings = '';
        for (var i = 0; i < decoded.length; i++) {
            var line = decoded[i];
            if (i > 0)
                mappings += ';';
            if (line.length === 0)
                continue;
            var generatedCodeColumn = 0; // first field
            var lineMappings = [];
            for (var _i = 0, line_1 = line; _i < line_1.length; _i++) {
                var segment = line_1[_i];
                var segmentMappings = encodeInteger(segment[0] - generatedCodeColumn);
                generatedCodeColumn = segment[0];
                if (segment.length > 1) {
                    segmentMappings +=
                        encodeInteger(segment[1] - sourceFileIndex) +
                            encodeInteger(segment[2] - sourceCodeLine) +
                            encodeInteger(segment[3] - sourceCodeColumn);
                    sourceFileIndex = segment[1];
                    sourceCodeLine = segment[2];
                    sourceCodeColumn = segment[3];
                }
                if (segment.length === 5) {
                    segmentMappings += encodeInteger(segment[4] - nameIndex);
                    nameIndex = segment[4];
                }
                lineMappings.push(segmentMappings);
            }
            mappings += lineMappings.join(',');
        }
        return mappings;
    }
    function encodeInteger(num) {
        var result = '';
        num = num < 0 ? (-num << 1) | 1 : num << 1;
        do {
            var clamped = num & 31;
            num >>= 5;
            if (num > 0) {
                clamped |= 32;
            }
            result += chars[clamped];
        } while (num > 0);
        return result;
    }
    //# sourceMappingURL=sourcemap-codec.es.js.map

    var Chunk = function Chunk(start, end, content) {
    	this.start = start;
    	this.end = end;
    	this.original = content;

    	this.intro = '';
    	this.outro = '';

    	this.content = content;
    	this.storeName = false;
    	this.edited = false;

    	// we make these non-enumerable, for sanity while debugging
    	Object.defineProperties(this, {
    		previous: { writable: true, value: null },
    		next:     { writable: true, value: null }
    	});
    };

    Chunk.prototype.appendLeft = function appendLeft (content) {
    	this.outro += content;
    };

    Chunk.prototype.appendRight = function appendRight (content) {
    	this.intro = this.intro + content;
    };

    Chunk.prototype.clone = function clone () {
    	var chunk = new Chunk(this.start, this.end, this.original);

    	chunk.intro = this.intro;
    	chunk.outro = this.outro;
    	chunk.content = this.content;
    	chunk.storeName = this.storeName;
    	chunk.edited = this.edited;

    	return chunk;
    };

    Chunk.prototype.contains = function contains (index) {
    	return this.start < index && index < this.end;
    };

    Chunk.prototype.eachNext = function eachNext (fn) {
    	var chunk = this;
    	while (chunk) {
    		fn(chunk);
    		chunk = chunk.next;
    	}
    };

    Chunk.prototype.eachPrevious = function eachPrevious (fn) {
    	var chunk = this;
    	while (chunk) {
    		fn(chunk);
    		chunk = chunk.previous;
    	}
    };

    Chunk.prototype.edit = function edit (content, storeName, contentOnly) {
    	this.content = content;
    	if (!contentOnly) {
    		this.intro = '';
    		this.outro = '';
    	}
    	this.storeName = storeName;

    	this.edited = true;

    	return this;
    };

    Chunk.prototype.prependLeft = function prependLeft (content) {
    	this.outro = content + this.outro;
    };

    Chunk.prototype.prependRight = function prependRight (content) {
    	this.intro = content + this.intro;
    };

    Chunk.prototype.split = function split (index) {
    	var sliceIndex = index - this.start;

    	var originalBefore = this.original.slice(0, sliceIndex);
    	var originalAfter = this.original.slice(sliceIndex);

    	this.original = originalBefore;

    	var newChunk = new Chunk(index, this.end, originalAfter);
    	newChunk.outro = this.outro;
    	this.outro = '';

    	this.end = index;

    	if (this.edited) {
    		// TODO is this block necessary?...
    		newChunk.edit('', false);
    		this.content = '';
    	} else {
    		this.content = originalBefore;
    	}

    	newChunk.next = this.next;
    	if (newChunk.next) { newChunk.next.previous = newChunk; }
    	newChunk.previous = this;
    	this.next = newChunk;

    	return newChunk;
    };

    Chunk.prototype.toString = function toString () {
    	return this.intro + this.content + this.outro;
    };

    Chunk.prototype.trimEnd = function trimEnd (rx) {
    	this.outro = this.outro.replace(rx, '');
    	if (this.outro.length) { return true; }

    	var trimmed = this.content.replace(rx, '');

    	if (trimmed.length) {
    		if (trimmed !== this.content) {
    			this.split(this.start + trimmed.length).edit('', undefined, true);
    		}
    		return true;

    	} else {
    		this.edit('', undefined, true);

    		this.intro = this.intro.replace(rx, '');
    		if (this.intro.length) { return true; }
    	}
    };

    Chunk.prototype.trimStart = function trimStart (rx) {
    	this.intro = this.intro.replace(rx, '');
    	if (this.intro.length) { return true; }

    	var trimmed = this.content.replace(rx, '');

    	if (trimmed.length) {
    		if (trimmed !== this.content) {
    			this.split(this.end - trimmed.length);
    			this.edit('', undefined, true);
    		}
    		return true;

    	} else {
    		this.edit('', undefined, true);

    		this.outro = this.outro.replace(rx, '');
    		if (this.outro.length) { return true; }
    	}
    };

    var btoa = function () {
    	throw new Error('Unsupported environment: `window.btoa` or `Buffer` should be supported.');
    };
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    	btoa = window.btoa;
    } else if (typeof Buffer === 'function') {
    	btoa = function (str) { return new Buffer(str).toString('base64'); };
    }

    var SourceMap = function SourceMap(properties) {
    	this.version = 3;
    	this.file = properties.file;
    	this.sources = properties.sources;
    	this.sourcesContent = properties.sourcesContent;
    	this.names = properties.names;
    	this.mappings = encode(properties.mappings);
    };

    SourceMap.prototype.toString = function toString () {
    	return JSON.stringify(this);
    };

    SourceMap.prototype.toUrl = function toUrl () {
    	return 'data:application/json;charset=utf-8;base64,' + btoa(this.toString());
    };

    function guessIndent(code) {
    	var lines = code.split('\n');

    	var tabbed = lines.filter(function (line) { return /^\t+/.test(line); });
    	var spaced = lines.filter(function (line) { return /^ {2,}/.test(line); });

    	if (tabbed.length === 0 && spaced.length === 0) {
    		return null;
    	}

    	// More lines tabbed than spaced? Assume tabs, and
    	// default to tabs in the case of a tie (or nothing
    	// to go on)
    	if (tabbed.length >= spaced.length) {
    		return '\t';
    	}

    	// Otherwise, we need to guess the multiple
    	var min = spaced.reduce(function (previous, current) {
    		var numSpaces = /^ +/.exec(current)[0].length;
    		return Math.min(numSpaces, previous);
    	}, Infinity);

    	return new Array(min + 1).join(' ');
    }

    function getRelativePath(from, to) {
    	var fromParts = from.split(/[/\\]/);
    	var toParts = to.split(/[/\\]/);

    	fromParts.pop(); // get dirname

    	while (fromParts[0] === toParts[0]) {
    		fromParts.shift();
    		toParts.shift();
    	}

    	if (fromParts.length) {
    		var i = fromParts.length;
    		while (i--) { fromParts[i] = '..'; }
    	}

    	return fromParts.concat(toParts).join('/');
    }

    var toString = Object.prototype.toString;

    function isObject(thing) {
    	return toString.call(thing) === '[object Object]';
    }

    function getLocator(source) {
    	var originalLines = source.split('\n');
    	var lineOffsets = [];

    	for (var i = 0, pos = 0; i < originalLines.length; i++) {
    		lineOffsets.push(pos);
    		pos += originalLines[i].length + 1;
    	}

    	return function locate(index) {
    		var i = 0;
    		var j = lineOffsets.length;
    		while (i < j) {
    			var m = (i + j) >> 1;
    			if (index < lineOffsets[m]) {
    				j = m;
    			} else {
    				i = m + 1;
    			}
    		}
    		var line = i - 1;
    		var column = index - lineOffsets[line];
    		return { line: line, column: column };
    	};
    }

    var Mappings = function Mappings(hires) {
    	this.hires = hires;
    	this.generatedCodeLine = 0;
    	this.generatedCodeColumn = 0;
    	this.raw = [];
    	this.rawSegments = this.raw[this.generatedCodeLine] = [];
    	this.pending = null;
    };

    Mappings.prototype.addEdit = function addEdit (sourceIndex, content, loc, nameIndex) {
    	if (content.length) {
    		var segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
    		if (nameIndex >= 0) {
    			segment.push(nameIndex);
    		}
    		this.rawSegments.push(segment);
    	} else if (this.pending) {
    		this.rawSegments.push(this.pending);
    	}

    	this.advance(content);
    	this.pending = null;
    };

    Mappings.prototype.addUneditedChunk = function addUneditedChunk (sourceIndex, chunk, original, loc, sourcemapLocations) {
    		var this$1 = this;

    	var originalCharIndex = chunk.start;
    	var first = true;

    	while (originalCharIndex < chunk.end) {
    		if (this$1.hires || first || sourcemapLocations[originalCharIndex]) {
    			this$1.rawSegments.push([this$1.generatedCodeColumn, sourceIndex, loc.line, loc.column]);
    		}

    		if (original[originalCharIndex] === '\n') {
    			loc.line += 1;
    			loc.column = 0;
    			this$1.generatedCodeLine += 1;
    			this$1.raw[this$1.generatedCodeLine] = this$1.rawSegments = [];
    			this$1.generatedCodeColumn = 0;
    		} else {
    			loc.column += 1;
    			this$1.generatedCodeColumn += 1;
    		}

    		originalCharIndex += 1;
    		first = false;
    	}

    	this.pending = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
    };

    Mappings.prototype.advance = function advance (str) {
    		var this$1 = this;

    	if (!str) { return; }

    	var lines = str.split('\n');

    	if (lines.length > 1) {
    		for (var i = 0; i < lines.length - 1; i++) {
    			this$1.generatedCodeLine++;
    			this$1.raw[this$1.generatedCodeLine] = this$1.rawSegments = [];
    		}
    		this.generatedCodeColumn = 0;
    	}

    	this.generatedCodeColumn += lines[lines.length - 1].length;
    };

    var n = '\n';

    var warned = {
    	insertLeft: false,
    	insertRight: false,
    	storeName: false
    };

    var MagicString = function MagicString(string, options) {
    	if ( options === void 0 ) options = {};

    	var chunk = new Chunk(0, string.length, string);

    	Object.defineProperties(this, {
    		original:              { writable: true, value: string },
    		outro:                 { writable: true, value: '' },
    		intro:                 { writable: true, value: '' },
    		firstChunk:            { writable: true, value: chunk },
    		lastChunk:             { writable: true, value: chunk },
    		lastSearchedChunk:     { writable: true, value: chunk },
    		byStart:               { writable: true, value: {} },
    		byEnd:                 { writable: true, value: {} },
    		filename:              { writable: true, value: options.filename },
    		indentExclusionRanges: { writable: true, value: options.indentExclusionRanges },
    		sourcemapLocations:    { writable: true, value: {} },
    		storedNames:           { writable: true, value: {} },
    		indentStr:             { writable: true, value: guessIndent(string) }
    	});

    	this.byStart[0] = chunk;
    	this.byEnd[string.length] = chunk;
    };

    MagicString.prototype.addSourcemapLocation = function addSourcemapLocation (char) {
    	this.sourcemapLocations[char] = true;
    };

    MagicString.prototype.append = function append (content) {
    	if (typeof content !== 'string') { throw new TypeError('outro content must be a string'); }

    	this.outro += content;
    	return this;
    };

    MagicString.prototype.appendLeft = function appendLeft (index, content) {
    	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

    	this._split(index);

    	var chunk = this.byEnd[index];

    	if (chunk) {
    		chunk.appendLeft(content);
    	} else {
    		this.intro += content;
    	}
    	return this;
    };

    MagicString.prototype.appendRight = function appendRight (index, content) {
    	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

    	this._split(index);

    	var chunk = this.byStart[index];

    	if (chunk) {
    		chunk.appendRight(content);
    	} else {
    		this.outro += content;
    	}
    	return this;
    };

    MagicString.prototype.clone = function clone () {
    	var cloned = new MagicString(this.original, { filename: this.filename });

    	var originalChunk = this.firstChunk;
    	var clonedChunk = (cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone());

    	while (originalChunk) {
    		cloned.byStart[clonedChunk.start] = clonedChunk;
    		cloned.byEnd[clonedChunk.end] = clonedChunk;

    		var nextOriginalChunk = originalChunk.next;
    		var nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();

    		if (nextClonedChunk) {
    			clonedChunk.next = nextClonedChunk;
    			nextClonedChunk.previous = clonedChunk;

    			clonedChunk = nextClonedChunk;
    		}

    		originalChunk = nextOriginalChunk;
    	}

    	cloned.lastChunk = clonedChunk;

    	if (this.indentExclusionRanges) {
    		cloned.indentExclusionRanges = this.indentExclusionRanges.slice();
    	}

    	Object.keys(this.sourcemapLocations).forEach(function (loc) {
    		cloned.sourcemapLocations[loc] = true;
    	});

    	return cloned;
    };

    MagicString.prototype.generateDecodedMap = function generateDecodedMap (options) {
    		var this$1 = this;

    	options = options || {};

    	var sourceIndex = 0;
    	var names = Object.keys(this.storedNames);
    	var mappings = new Mappings(options.hires);

    	var locate = getLocator(this.original);

    	if (this.intro) {
    		mappings.advance(this.intro);
    	}

    	this.firstChunk.eachNext(function (chunk) {
    		var loc = locate(chunk.start);

    		if (chunk.intro.length) { mappings.advance(chunk.intro); }

    		if (chunk.edited) {
    			mappings.addEdit(
    				sourceIndex,
    				chunk.content,
    				loc,
    				chunk.storeName ? names.indexOf(chunk.original) : -1
    			);
    		} else {
    			mappings.addUneditedChunk(sourceIndex, chunk, this$1.original, loc, this$1.sourcemapLocations);
    		}

    		if (chunk.outro.length) { mappings.advance(chunk.outro); }
    	});

    	return {
    		file: options.file ? options.file.split(/[/\\]/).pop() : null,
    		sources: [options.source ? getRelativePath(options.file || '', options.source) : null],
    		sourcesContent: options.includeContent ? [this.original] : [null],
    		names: names,
    		mappings: mappings.raw
    	};
    };

    MagicString.prototype.generateMap = function generateMap (options) {
    	return new SourceMap(this.generateDecodedMap(options));
    };

    MagicString.prototype.getIndentString = function getIndentString () {
    	return this.indentStr === null ? '\t' : this.indentStr;
    };

    MagicString.prototype.indent = function indent (indentStr, options) {
    		var this$1 = this;

    	var pattern = /^[^\r\n]/gm;

    	if (isObject(indentStr)) {
    		options = indentStr;
    		indentStr = undefined;
    	}

    	indentStr = indentStr !== undefined ? indentStr : this.indentStr || '\t';

    	if (indentStr === '') { return this; } // noop

    	options = options || {};

    	// Process exclusion ranges
    	var isExcluded = {};

    	if (options.exclude) {
    		var exclusions =
    			typeof options.exclude[0] === 'number' ? [options.exclude] : options.exclude;
    		exclusions.forEach(function (exclusion) {
    			for (var i = exclusion[0]; i < exclusion[1]; i += 1) {
    				isExcluded[i] = true;
    			}
    		});
    	}

    	var shouldIndentNextCharacter = options.indentStart !== false;
    	var replacer = function (match) {
    		if (shouldIndentNextCharacter) { return ("" + indentStr + match); }
    		shouldIndentNextCharacter = true;
    		return match;
    	};

    	this.intro = this.intro.replace(pattern, replacer);

    	var charIndex = 0;
    	var chunk = this.firstChunk;

    	while (chunk) {
    		var end = chunk.end;

    		if (chunk.edited) {
    			if (!isExcluded[charIndex]) {
    				chunk.content = chunk.content.replace(pattern, replacer);

    				if (chunk.content.length) {
    					shouldIndentNextCharacter = chunk.content[chunk.content.length - 1] === '\n';
    				}
    			}
    		} else {
    			charIndex = chunk.start;

    			while (charIndex < end) {
    				if (!isExcluded[charIndex]) {
    					var char = this$1.original[charIndex];

    					if (char === '\n') {
    						shouldIndentNextCharacter = true;
    					} else if (char !== '\r' && shouldIndentNextCharacter) {
    						shouldIndentNextCharacter = false;

    						if (charIndex === chunk.start) {
    							chunk.prependRight(indentStr);
    						} else {
    							this$1._splitChunk(chunk, charIndex);
    							chunk = chunk.next;
    							chunk.prependRight(indentStr);
    						}
    					}
    				}

    				charIndex += 1;
    			}
    		}

    		charIndex = chunk.end;
    		chunk = chunk.next;
    	}

    	this.outro = this.outro.replace(pattern, replacer);

    	return this;
    };

    MagicString.prototype.insert = function insert () {
    	throw new Error('magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)');
    };

    MagicString.prototype.insertLeft = function insertLeft (index, content) {
    	if (!warned.insertLeft) {
    		console.warn('magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead'); // eslint-disable-line no-console
    		warned.insertLeft = true;
    	}

    	return this.appendLeft(index, content);
    };

    MagicString.prototype.insertRight = function insertRight (index, content) {
    	if (!warned.insertRight) {
    		console.warn('magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead'); // eslint-disable-line no-console
    		warned.insertRight = true;
    	}

    	return this.prependRight(index, content);
    };

    MagicString.prototype.move = function move (start, end, index) {
    	if (index >= start && index <= end) { throw new Error('Cannot move a selection inside itself'); }

    	this._split(start);
    	this._split(end);
    	this._split(index);

    	var first = this.byStart[start];
    	var last = this.byEnd[end];

    	var oldLeft = first.previous;
    	var oldRight = last.next;

    	var newRight = this.byStart[index];
    	if (!newRight && last === this.lastChunk) { return this; }
    	var newLeft = newRight ? newRight.previous : this.lastChunk;

    	if (oldLeft) { oldLeft.next = oldRight; }
    	if (oldRight) { oldRight.previous = oldLeft; }

    	if (newLeft) { newLeft.next = first; }
    	if (newRight) { newRight.previous = last; }

    	if (!first.previous) { this.firstChunk = last.next; }
    	if (!last.next) {
    		this.lastChunk = first.previous;
    		this.lastChunk.next = null;
    	}

    	first.previous = newLeft;
    	last.next = newRight || null;

    	if (!newLeft) { this.firstChunk = first; }
    	if (!newRight) { this.lastChunk = last; }
    	return this;
    };

    MagicString.prototype.overwrite = function overwrite (start, end, content, options) {
    		var this$1 = this;

    	if (typeof content !== 'string') { throw new TypeError('replacement content must be a string'); }

    	while (start < 0) { start += this$1.original.length; }
    	while (end < 0) { end += this$1.original.length; }

    	if (end > this.original.length) { throw new Error('end is out of bounds'); }
    	if (start === end)
    		{ throw new Error('Cannot overwrite a zero-length range – use appendLeft or prependRight instead'); }

    	this._split(start);
    	this._split(end);

    	if (options === true) {
    		if (!warned.storeName) {
    			console.warn('The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string'); // eslint-disable-line no-console
    			warned.storeName = true;
    		}

    		options = { storeName: true };
    	}
    	var storeName = options !== undefined ? options.storeName : false;
    	var contentOnly = options !== undefined ? options.contentOnly : false;

    	if (storeName) {
    		var original = this.original.slice(start, end);
    		this.storedNames[original] = true;
    	}

    	var first = this.byStart[start];
    	var last = this.byEnd[end];

    	if (first) {
    		if (end > first.end && first.next !== this.byStart[first.end]) {
    			throw new Error('Cannot overwrite across a split point');
    		}

    		first.edit(content, storeName, contentOnly);

    		if (first !== last) {
    			var chunk = first.next;
    			while (chunk !== last) {
    				chunk.edit('', false);
    				chunk = chunk.next;
    			}

    			chunk.edit('', false);
    		}
    	} else {
    		// must be inserting at the end
    		var newChunk = new Chunk(start, end, '').edit(content, storeName);

    		// TODO last chunk in the array may not be the last chunk, if it's moved...
    		last.next = newChunk;
    		newChunk.previous = last;
    	}
    	return this;
    };

    MagicString.prototype.prepend = function prepend (content) {
    	if (typeof content !== 'string') { throw new TypeError('outro content must be a string'); }

    	this.intro = content + this.intro;
    	return this;
    };

    MagicString.prototype.prependLeft = function prependLeft (index, content) {
    	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

    	this._split(index);

    	var chunk = this.byEnd[index];

    	if (chunk) {
    		chunk.prependLeft(content);
    	} else {
    		this.intro = content + this.intro;
    	}
    	return this;
    };

    MagicString.prototype.prependRight = function prependRight (index, content) {
    	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

    	this._split(index);

    	var chunk = this.byStart[index];

    	if (chunk) {
    		chunk.prependRight(content);
    	} else {
    		this.outro = content + this.outro;
    	}
    	return this;
    };

    MagicString.prototype.remove = function remove (start, end) {
    		var this$1 = this;

    	while (start < 0) { start += this$1.original.length; }
    	while (end < 0) { end += this$1.original.length; }

    	if (start === end) { return this; }

    	if (start < 0 || end > this.original.length) { throw new Error('Character is out of bounds'); }
    	if (start > end) { throw new Error('end must be greater than start'); }

    	this._split(start);
    	this._split(end);

    	var chunk = this.byStart[start];

    	while (chunk) {
    		chunk.intro = '';
    		chunk.outro = '';
    		chunk.edit('');

    		chunk = end > chunk.end ? this$1.byStart[chunk.end] : null;
    	}
    	return this;
    };

    MagicString.prototype.lastChar = function lastChar () {
    	if (this.outro.length)
    		{ return this.outro[this.outro.length - 1]; }
    	var chunk = this.lastChunk;
    	do {
    		if (chunk.outro.length)
    			{ return chunk.outro[chunk.outro.length - 1]; }
    		if (chunk.content.length)
    			{ return chunk.content[chunk.content.length - 1]; }
    		if (chunk.intro.length)
    			{ return chunk.intro[chunk.intro.length - 1]; }
    	} while (chunk = chunk.previous);
    	if (this.intro.length)
    		{ return this.intro[this.intro.length - 1]; }
    	return '';
    };

    MagicString.prototype.lastLine = function lastLine () {
    	var lineIndex = this.outro.lastIndexOf(n);
    	if (lineIndex !== -1)
    		{ return this.outro.substr(lineIndex + 1); }
    	var lineStr = this.outro;
    	var chunk = this.lastChunk;
    	do {
    		if (chunk.outro.length > 0) {
    			lineIndex = chunk.outro.lastIndexOf(n);
    			if (lineIndex !== -1)
    				{ return chunk.outro.substr(lineIndex + 1) + lineStr; }
    			lineStr = chunk.outro + lineStr;
    		}

    		if (chunk.content.length > 0) {
    			lineIndex = chunk.content.lastIndexOf(n);
    			if (lineIndex !== -1)
    				{ return chunk.content.substr(lineIndex + 1) + lineStr; }
    			lineStr = chunk.content + lineStr;
    		}

    		if (chunk.intro.length > 0) {
    			lineIndex = chunk.intro.lastIndexOf(n);
    			if (lineIndex !== -1)
    				{ return chunk.intro.substr(lineIndex + 1) + lineStr; }
    			lineStr = chunk.intro + lineStr;
    		}
    	} while (chunk = chunk.previous);
    	lineIndex = this.intro.lastIndexOf(n);
    	if (lineIndex !== -1)
    		{ return this.intro.substr(lineIndex + 1) + lineStr; }
    	return this.intro + lineStr;
    };

    MagicString.prototype.slice = function slice (start, end) {
    		var this$1 = this;
    		if ( start === void 0 ) start = 0;
    		if ( end === void 0 ) end = this.original.length;

    	while (start < 0) { start += this$1.original.length; }
    	while (end < 0) { end += this$1.original.length; }

    	var result = '';

    	// find start chunk
    	var chunk = this.firstChunk;
    	while (chunk && (chunk.start > start || chunk.end <= start)) {
    		// found end chunk before start
    		if (chunk.start < end && chunk.end >= end) {
    			return result;
    		}

    		chunk = chunk.next;
    	}

    	if (chunk && chunk.edited && chunk.start !== start)
    		{ throw new Error(("Cannot use replaced character " + start + " as slice start anchor.")); }

    	var startChunk = chunk;
    	while (chunk) {
    		if (chunk.intro && (startChunk !== chunk || chunk.start === start)) {
    			result += chunk.intro;
    		}

    		var containsEnd = chunk.start < end && chunk.end >= end;
    		if (containsEnd && chunk.edited && chunk.end !== end)
    			{ throw new Error(("Cannot use replaced character " + end + " as slice end anchor.")); }

    		var sliceStart = startChunk === chunk ? start - chunk.start : 0;
    		var sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;

    		result += chunk.content.slice(sliceStart, sliceEnd);

    		if (chunk.outro && (!containsEnd || chunk.end === end)) {
    			result += chunk.outro;
    		}

    		if (containsEnd) {
    			break;
    		}

    		chunk = chunk.next;
    	}

    	return result;
    };

    // TODO deprecate this? not really very useful
    MagicString.prototype.snip = function snip (start, end) {
    	var clone = this.clone();
    	clone.remove(0, start);
    	clone.remove(end, clone.original.length);

    	return clone;
    };

    MagicString.prototype._split = function _split (index) {
    		var this$1 = this;

    	if (this.byStart[index] || this.byEnd[index]) { return; }

    	var chunk = this.lastSearchedChunk;
    	var searchForward = index > chunk.end;

    	while (chunk) {
    		if (chunk.contains(index)) { return this$1._splitChunk(chunk, index); }

    		chunk = searchForward ? this$1.byStart[chunk.end] : this$1.byEnd[chunk.start];
    	}
    };

    MagicString.prototype._splitChunk = function _splitChunk (chunk, index) {
    	if (chunk.edited && chunk.content.length) {
    		// zero-length edited chunks are a special case (overlapping replacements)
    		var loc = getLocator(this.original)(index);
    		throw new Error(
    			("Cannot split a chunk that has already been edited (" + (loc.line) + ":" + (loc.column) + " – \"" + (chunk.original) + "\")")
    		);
    	}

    	var newChunk = chunk.split(index);

    	this.byEnd[index] = chunk;
    	this.byStart[index] = newChunk;
    	this.byEnd[newChunk.end] = newChunk;

    	if (chunk === this.lastChunk) { this.lastChunk = newChunk; }

    	this.lastSearchedChunk = chunk;
    	return true;
    };

    MagicString.prototype.toString = function toString () {
    	var str = this.intro;

    	var chunk = this.firstChunk;
    	while (chunk) {
    		str += chunk.toString();
    		chunk = chunk.next;
    	}

    	return str + this.outro;
    };

    MagicString.prototype.isEmpty = function isEmpty () {
    	var chunk = this.firstChunk;
    	do {
    		if (chunk.intro.length && chunk.intro.trim() ||
    				chunk.content.length && chunk.content.trim() ||
    				chunk.outro.length && chunk.outro.trim())
    			{ return false; }
    	} while (chunk = chunk.next);
    	return true;
    };

    MagicString.prototype.length = function length () {
    	var chunk = this.firstChunk;
    	var length = 0;
    	do {
    		length += chunk.intro.length + chunk.content.length + chunk.outro.length;
    	} while (chunk = chunk.next);
    	return length;
    };

    MagicString.prototype.trimLines = function trimLines () {
    	return this.trim('[\\r\\n]');
    };

    MagicString.prototype.trim = function trim (charType) {
    	return this.trimStart(charType).trimEnd(charType);
    };

    MagicString.prototype.trimEndAborted = function trimEndAborted (charType) {
    		var this$1 = this;

    	var rx = new RegExp((charType || '\\s') + '+$');

    	this.outro = this.outro.replace(rx, '');
    	if (this.outro.length) { return true; }

    	var chunk = this.lastChunk;

    	do {
    		var end = chunk.end;
    		var aborted = chunk.trimEnd(rx);

    		// if chunk was trimmed, we have a new lastChunk
    		if (chunk.end !== end) {
    			if (this$1.lastChunk === chunk) {
    				this$1.lastChunk = chunk.next;
    			}

    			this$1.byEnd[chunk.end] = chunk;
    			this$1.byStart[chunk.next.start] = chunk.next;
    			this$1.byEnd[chunk.next.end] = chunk.next;
    		}

    		if (aborted) { return true; }
    		chunk = chunk.previous;
    	} while (chunk);

    	return false;
    };

    MagicString.prototype.trimEnd = function trimEnd (charType) {
    	this.trimEndAborted(charType);
    	return this;
    };
    MagicString.prototype.trimStartAborted = function trimStartAborted (charType) {
    		var this$1 = this;

    	var rx = new RegExp('^' + (charType || '\\s') + '+');

    	this.intro = this.intro.replace(rx, '');
    	if (this.intro.length) { return true; }

    	var chunk = this.firstChunk;

    	do {
    		var end = chunk.end;
    		var aborted = chunk.trimStart(rx);

    		if (chunk.end !== end) {
    			// special case...
    			if (chunk === this$1.lastChunk) { this$1.lastChunk = chunk.next; }

    			this$1.byEnd[chunk.end] = chunk;
    			this$1.byStart[chunk.next.start] = chunk.next;
    			this$1.byEnd[chunk.next.end] = chunk.next;
    		}

    		if (aborted) { return true; }
    		chunk = chunk.next;
    	} while (chunk);

    	return false;
    };

    MagicString.prototype.trimStart = function trimStart (charType) {
    	this.trimStartAborted(charType);
    	return this;
    };
    //# sourceMappingURL=magic-string.es.js.map

    function createRegisterFunction(code) {
        var ms = new MagicString(code);
        ms.overwrite(0, ms.length(), JSON.stringify(code));
        ms.prepend("System.register([], " + registerTemplateParts[0]);
        ms.append(registerTemplateParts[1] + ");");
        return ms.toString();
    }
    function transpileCss(runtime, key, code) {
        if (key.endsWith('.less')) {
            return transpileLess(runtime, key, code);
        }
        return createRegisterFunction(code);
    }
    function transpileLess(runtime, key, code) {
        return runtime
            .import('less/browser', key)
            .then(function (browser) {
            var less = browser(window, {});
            var options = {
                filename: key,
            };
            return less.render(code, options).then(function (renderOutput) {
                return createRegisterFunction(renderOutput.css);
            });
        });
    }
    var registerTemplate = function ($__export) {
        var element;
        var replace;
        var markup;
        function __onReplace(replaceEvent) {
            replace = replaceEvent.previousInstance.element;
        }
        $__export('__onReplace', __onReplace);
        return {
            execute: function () {
                markup = '<CSS>';
                $__export('markup', markup);
                element = document.createElement('style');
                element.type = 'text/css';
                element.innerHTML = markup;
                if (replace) {
                    document.head.replaceChild(element, replace);
                    replace = null;
                }
                else {
                    document.head.appendChild(element);
                }
                $__export('element', element);
            },
        };
    };
    var registerTemplateParts = registerTemplate
        .toString()
        .split(/'<CSS>'|"<CSS>"/);

    var transpilerInstances = new WeakMap();
    function transpileJs(runtime, key, code) {
        var configFileName = key.endsWith('.js') || key.endsWith('.jsx')
            ? './jsconfig.json'
            : './tsconfig.json';
        var configFileResult = runtime
            .import(configFileName, key)
            .catch(function () { return null; })
            .then(function (data) { return data || {}; });
        var typescriptResult = runtime.import('typescript', key);
        return Promise.all([configFileResult, typescriptResult]).then(function (args) {
            var _a = __read(args, 2), config = _a[0], typescript = _a[1];
            if (!transpilerInstances.has(args)) {
                transpilerInstances.set(args, new RuntimeCompilerHost(typescript));
            }
            var host = transpilerInstances.get(args);
            var file = host.addFile(key, code, typescript.ScriptTarget.ES5);
            if (!file.output) {
                var compilerOptions = __assign({ allowJs: true, jsx: typescript.JsxEmit.React }, (config.compilerOptions || {}), { allowNonTsExtensions: true, allowSyntheticDefaultImports: true, esModuleInterop: true, isolatedModules: true, lib: null, module: typescript.ModuleKind.System, noLib: true, suppressOutputPathCheck: true });
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
        __extends(RuntimeModuleNamespace, _super);
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
    if (toStringTag) {
        Object.defineProperty(RuntimeModuleNamespace.prototype, toStringTag, {
            value: 'Module',
        });
    }
    var Runtime = /** @class */ (function (_super) {
        __extends(Runtime, _super);
        function Runtime(_a) {
            var _b = _a.defaultDependencyVersions, defaultDependencyVersions = _b === void 0 ? {} : _b, host = _a.host, _c = _a.useSystem, useSystem = _c === void 0 ? !!(window || global)['PLNKR_RUNTIME_USE_SYSTEM'] : _c;
            var _this = _super.call(this, document.baseURI) || this;
            _this.baseUri = document.baseURI.endsWith('/')
                ? document.baseURI
                : document.baseURI + "/";
            _this.cachedResolves = new Map();
            _this.cachedResolvesRev = new Map();
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
            _this.defaultDependencyVersions = __assign({}, DEFAULT_DEPENDENCY_VERSIONS, defaultDependencyVersions);
            _this.dependencies = new Map();
            _this.dependents = new Map();
            return _this;
        }
        Runtime.prototype[(RegisterLoader.traceLoad)] = function (load) {
            var instance = this.registry.get(load.key);
            var previousInstance = this.registry.get(load.key + "@prev");
            if (instance &&
                previousInstance &&
                typeof previousInstance.__onReplace === 'function') {
                var event = {
                    previousInstance: previousInstance,
                };
                previousInstance.__onReplace(event);
            }
        };
        Runtime.prototype[RegisterLoader.traceResolvedStaticDependency] = function (parentKey, _, resolvedKey) {
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
                    var hostRequest_1 = url.slice(_this.baseUri.length);
                    var hostResolveResult = hostResolve(_this.host, hostRequest_1);
                    return Promise.resolve(hostResolveResult).then(function (hostResolution) {
                        if (typeof hostResolution !== 'string') {
                            return (Promise.reject(new Error("Failed to resolve host module '" + hostRequest_1 + "'")));
                        }
                        return "" + _this.baseUri + hostResolution;
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
                var loadHostResult = loadHostModule(this, key.slice(this.baseUri.length), processAnonRegister);
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
                var invalidations = __spread(pathnames);
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
                            var event = {
                                propagationStopped: false,
                                stopPropagation: function () {
                                    this.defaultPrevented = true;
                                },
                            };
                            if (instance &&
                                typeof instance.__onAfterUnload === 'function') {
                                instance.__onAfterUnload(event);
                            }
                            _this.registry.delete(resolvedPathname);
                            _this.dependencies.delete(resolvedPathname);
                            _this.dependents.delete(resolvedPathname);
                            if (!event.propagationStopped) {
                                try {
                                    for (var dependents_1 = __values(dependents), dependents_1_1 = dependents_1.next(); !dependents_1_1.done; dependents_1_1 = dependents_1.next()) {
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
    function instantiate$1(runtime, key, code, processAnonRegister) {
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
            .then(function (code) { return instantiate$1(runtime, key, code, processAnonRegister); });
    }
    function loadHostModule(runtime, key, processAnonRegister) {
        var codeResult = runtime.host.getFileContents(key);
        return Promise.resolve(codeResult).then(function (code) {
            if (typeof code !== 'string') {
                return Promise.reject(new Error("The runtime host returned non-string file contents for '" + key + "'"));
            }
            return instantiate$1(runtime, key, code, processAnonRegister);
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

    exports.RuntimeModuleNamespace = RuntimeModuleNamespace;
    exports.Runtime = Runtime;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=runtime.js.map
