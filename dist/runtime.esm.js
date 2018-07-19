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
    if (records.hasOwnProperty(key) && (records[key].linkRecord || records[key].loadError || records[key].evalError)) {
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

var jsStringEscape = function (string) {
  return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
    // Escape all characters not included in SingleStringCharacters and
    // DoubleStringCharacters on
    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
    switch (character) {
      case '"':
      case "'":
      case '\\':
        return '\\' + character
      // Four possible LineTerminator characters need to be escaped:
      case '\n':
        return '\\n'
      case '\r':
        return '\\r'
      case '\u2028':
        return '\\u2028'
      case '\u2029':
        return '\\u2029'
    }
  })
};

function createRegisterFunction(node) {
    const queue = node.children.map((child, i) => ({ parent: node, node: child, i }));
    while (queue.length) {
        const { parent, node, i } = queue.shift();
        if (typeof node === 'string') {
            parent.children[i] = jsStringEscape(node);
            continue;
        }
        node.children.forEach((child, i) => queue.push({ parent: node, node: child, i }));
    }
    node.prepend(`System.register([], ${registerTemplateParts[0]}"`);
    node.add(`"${registerTemplateParts[1]});`);
    const result = node.toStringWithSourceMap();
    return {
        source: result.code,
        sourceMap: result.map.toJSON(),
    };
}
function transpileCssToSystemRegister(runtime, key, code) {
    if (key.endsWith('.less')) {
        return transpileLessToSystemRegister(runtime, key, code);
    }
    return Promise.resolve().then(function () { return sourceMap; }).then((sourceMap) => {
        const node = new sourceMap.SourceNode(1, 0, key, code);
        return createRegisterFunction(node);
    });
}
function transpileLessToSystemRegister(runtime, key, codeOrRecord) {
    const sourceMapMappingsResult = runtime.resolve('source-map/lib/mappings.wasm');
    const sourceMapResult = (runtime.import('source-map'));
    const transpileLessResult = transpileLess(runtime, key, codeOrRecord);
    return Promise.all([
        sourceMapMappingsResult,
        sourceMapResult,
        transpileLessResult,
    ]).then(([sourceMapMappingsUrl, sourceMap, transpiled]) => {
        sourceMap.SourceMapConsumer.initialize({
            'lib/mappings.wasm': sourceMapMappingsUrl,
        });
        return sourceMap.SourceMapConsumer.with(transpiled.sourceMap, null, consumer => {
            const node = sourceMap.SourceNode.fromStringWithSourceMap(transpiled.source, consumer);
            return createRegisterFunction(node);
        });
    });
}
function transpileLess(runtime, key, codeOrRecord) {
    const lessFactoryResult = runtime.import('less/lib/less');
    const lessAbstractFileManagerResult = (runtime.import('less/lib/less/environment/abstract-file-manager'));
    const sourceMapMappingsResult = runtime.resolve('source-map/lib/mappings.wasm');
    const sourceMapResult = (runtime.import('source-map'));
    return Promise.all([
        lessFactoryResult,
        lessAbstractFileManagerResult,
        sourceMapMappingsResult,
        sourceMapResult,
    ]).then(([lessFactory, AbstractFileManager, sourceMapMappingsUrl, sourceMap,]) => {
        sourceMap.SourceMapConsumer.initialize({
            'lib/mappings.wasm': sourceMapMappingsUrl,
        });
        const environment = {
            encodeBase64: btoa,
            getSourceMapGenerator: () => sourceMap.SourceMapGenerator,
        };
        const fileManager = class extends AbstractFileManager {
            loadFile(filename, currentDirectory) {
                const contentsResult = runtime.host.getFileContents(`${currentDirectory}/${filename}`);
                return Promise.resolve(contentsResult).then(contents => ({
                    filename,
                    contents,
                }));
            }
        };
        const less = lessFactory(environment, [fileManager]);
        const options = {
            filename: key,
            sourceMap: {
                outputSourceFiles: true,
            },
        };
        const code = typeof codeOrRecord === 'string'
            ? codeOrRecord
            : codeOrRecord.source;
        return less.render(code, options).then(renderOutput => {
            return {
                source: renderOutput.css,
                sourceMap: typeof renderOutput.map === 'string'
                    ? JSON.parse(renderOutput.map)
                    : undefined,
            };
        });
    });
}
const registerTemplate = function ($__export) {
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
const registerTemplateParts = registerTemplate
    .toString()
    .split(/'<CSS>'|"<CSS>"/);

function transpileJs(runtime, key, code) {
    const configFileName = key.endsWith('.js') || key.endsWith('.jsx')
        ? './jsconfig.json'
        : './tsconfig.json';
    return runtime
        .resolve(configFileName)
        .catch(() => null)
        .then(resolvedConfigFileName => {
        const configFileResult = typeof resolvedConfigFileName === 'string'
            ? runtime
                .import(resolvedConfigFileName)
                .catch(() => null)
                .then(data => data || {})
            : Promise.resolve({});
        const typescriptResult = (runtime.import('typescript', key));
        return Promise.all([configFileResult, typescriptResult])
            .then(args => {
            try {
                return transpileWithCustomHost(key, code, args[0], args[1]);
            }
            catch (error) {
                return Promise.reject(error);
            }
        })
            .then(sourceFileRecord => {
            if (resolvedConfigFileName) {
                runtime.registerDependency(key, resolvedConfigFileName);
            }
            return sourceFileRecord;
        });
    });
}
function transpileWithCustomHost(key, code, config, typescript) {
    const host = new RuntimeCompilerHost(typescript);
    const file = host.addFile(key, code, typescript.ScriptTarget.ES5);
    if (!file.output) {
        const compilerOptions = Object.assign({ allowJs: true, jsx: typescript.JsxEmit.React }, (config.compilerOptions || {}), { allowNonTsExtensions: true, allowSyntheticDefaultImports: true, esModuleInterop: true, inlineSources: true, isolatedModules: true, lib: null, module: typescript.ModuleKind.System, noLib: true, sourceMap: true, suppressOutputPathCheck: true });
        const program = typescript.createProgram([key], compilerOptions, host);
        let jstext = undefined;
        let maptext = undefined;
        // Emit
        const emitResult = program.emit(undefined, (outputName, output) => {
            if (outputName.endsWith('.map')) {
                maptext = output;
            }
            else {
                jstext = output.slice(0, output.lastIndexOf('//#')); // remove sourceMappingURL
            }
        });
        const diagnostics = emitResult.diagnostics
            .concat(program.getOptionsDiagnostics())
            .concat(program.getSyntacticDiagnostics());
        file.output = {
            failure: diagnostics.some(diag => diag.category === typescript.DiagnosticCategory.Error),
            diags: diagnostics,
            js: jstext,
            sourceMap: maptext,
        };
    }
    if (file.output.failure) {
        const error = new Error(`Compilation failed: ${file.output.diags.map(diag => typescript.flattenDiagnosticMessageText(diag.messageText, '\n'))}`);
        throw error;
    }
    const record = {
        source: file.output.js,
        sourceMap: tryParse(file.output.sourceMap),
    };
    return record;
}
function tryParse(sourceMap) {
    try {
        return JSON.parse(sourceMap);
    }
    catch (_) {
        return null;
    }
}
class RuntimeCompilerHost {
    constructor(typescript) {
        this.typescript = typescript;
        this.files = {};
    }
    getDefaultLibFileName(options) {
        return this.getDefaultLibFilePaths(options)[0];
    }
    getDefaultLibFilePaths(options) {
        return options.lib
            ? options.lib.map(libName => `typescript/lib/lib.${libName}.d.ts`)
            : ['typescript/lib/lib.d.ts'];
    }
    useCaseSensitiveFileNames() {
        return false;
    }
    getCanonicalFileName(fileName) {
        return this.typescript.normalizePath(fileName);
    }
    getCurrentDirectory() {
        return '';
    }
    getNewLine() {
        return '\n';
    }
    readFile() {
        throw new Error('Not implemented');
    }
    writeFile() {
        throw new Error('Not implemented');
    }
    getSourceFile(fileName) {
        fileName = this.getCanonicalFileName(fileName);
        return this.files[fileName];
    }
    getAllFiles() {
        return Object.keys(this.files).map(key => this.files[key]);
    }
    fileExists(fileName) {
        return !!this.getSourceFile(fileName);
    }
    getDirectories() {
        throw new Error('Not implemented');
    }
    addFile(fileName, text, target) {
        fileName = this.getCanonicalFileName(fileName);
        const file = this.files[fileName];
        if (!file || file.text != text) {
            this.files[fileName] = this.typescript.createSourceFile(fileName, text, target || this.typescript.ScriptTarget.ES5);
        }
        return this.files[fileName];
    }
}

let nextVueId = 0;
function transpileVue(runtime, key, code) {
    const componentCompilerUtilsResult = runtime.import('@vue/component-compiler-utils');
    const sourceMapResult = (runtime.import('source-map'));
    const templateCompilerResult = (runtime.import('vue-template-compiler'));
    return Promise.all([
        templateCompilerResult,
        componentCompilerUtilsResult,
        sourceMapResult,
    ]).then(([vueTemplateCompiler, vueComponentCompilerUtils, _]) => {
        const id = `data-v-${nextVueId++}`;
        const dependencies = [];
        const options = {};
        const setters = [];
        let executeBody = '$__export("default", options);';
        let registerBody = `var options = { _scopeId: "${id}" };`;
        const parsedComponent = vueComponentCompilerUtils.parse({
            source: code,
            filename: key,
            compiler: vueTemplateCompiler,
        });
        if (parsedComponent.script) {
            const dependencyUrl = `${key}.js`;
            runtime.inject(dependencyUrl, {
                source: parsedComponent.script.content,
                sourceMap: (parsedComponent.script.map),
            });
            dependencies.push(dependencyUrl);
            setters.push(function (importedScript) {
                if (Object.keys(importedScript).length <= 1 &&
                    importedScript.default) {
                    importedScript = importedScript.default;
                }
                for (var key in importedScript) {
                    options[key] = importedScript[key];
                }
            });
        }
        if (parsedComponent.template) {
            const compiledTemplate = vueComponentCompilerUtils.compileTemplate({
                compiler: vueTemplateCompiler,
                filename: key,
                isProduction: true,
                source: parsedComponent.template.content,
            });
            const dependencyUrl = `${key}.html.js`;
            const source = `System.register([], ${templateRegisterTemplateParts[0]}${compiledTemplate.code}${templateRegisterTemplateParts[1]});`;
            runtime.inject(dependencyUrl, {
                source,
            });
            dependencies.push(dependencyUrl);
            setters.push(function (importedTemplate) {
                options.render = importedTemplate.render;
                options.staticRenderFns = importedTemplate.staticRenderFns;
            });
        }
        const compiledStyleResults = parsedComponent.styles.map((style, idx) => {
            const dependencyUrl = `${key}.${idx}.css`;
            const preprocessStyleResult = preprocessStyle(runtime, key, style);
            return Promise.resolve(preprocessStyleResult).then(preprocessedStyleRecord => {
                return vueComponentCompilerUtils
                    .compileStyleAsync({
                    filename: key,
                    id,
                    map: preprocessedStyleRecord.sourceMap,
                    scoped: !!style.scoped,
                    source: preprocessedStyleRecord.source,
                })
                    .then(compiledStyle => {
                    runtime.inject(dependencyUrl, {
                        source: compiledStyle.code,
                        sourceMap: compiledStyle.map,
                    });
                    dependencies.push(dependencyUrl);
                    setters.push(function () { });
                });
            });
        });
        const stylesResult = ((compiledStyleResults.length
            ? Promise.all(compiledStyleResults)
            : Promise.resolve()));
        return stylesResult.then(() => {
            const constructedScript = `System.register(${JSON.stringify(dependencies)}, function ($__export) {
                ${registerBody}
                return {
                    setters: [${setters
                .map(setter => setter.toString())
                .join(',\n')}],
                    execute: function() {
                        ${executeBody}
                    },
                };ß
            });`;
            return {
                source: constructedScript,
            };
        });
    });
}
function preprocessStyle(runtime, key, style) {
    const record = {
        source: style.content,
        sourceMap: style.map,
    };
    if (style.lang === 'less') {
        return transpileLess(runtime, key, record);
    }
    return record;
}
const templateRegisterTemplate = function ($__export) {
    return {
        execute: function () {
            var render, staticRenderFns;
            $__export({ render, staticRenderFns });
        },
    };
};
const templateRegisterTemplateParts = templateRegisterTemplate
    .toString()
    .split('var render, staticRenderFns;');

const CDN_ESM_URL = 'https://dev.jspm.io';
const CDN_SYSTEM_URL = 'https://system-dev.jspm.io';
const DEFAULT_DEPENDENCY_VERSIONS = {
    less: '2.7',
    'source-map': '0.7.3',
    typescript: '2.9',
};
const EMPTY_MODULE = new ModuleNamespace({});
const NPM_MODULE_RX = /^((?:@[^/]+\/)?[^/]+)(\/.*)?$/;
// From SystemJS: https://github.com/systemjs/systemjs/blob/501d1a0b9e32e00d54c9cd747e3236a9df88a1a3/src/instantiate.js#L418
const LEADING_COMMENT_AND_META_RX = /^(\s*\/\*[^*]*(\*(?!\/)[^*]*)*\*\/|\s*\/\/[^\n]*|\s*"[^"]+"\s*;?|\s*'[^']+'\s*;?)*\s*/;
function detectRegisterFormat(source) {
    const leadingCommentAndMeta = source.match(LEADING_COMMENT_AND_META_RX);
    if (!leadingCommentAndMeta)
        return false;
    var codeStart = leadingCommentAndMeta[0].length;
    return (source.startsWith('System.register', codeStart) ||
        source.startsWith('SystemJS.register', codeStart));
}
class RuntimeModuleNamespace extends ModuleNamespace {
    constructor(baseObject) {
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
            Object.keys(baseObject.default).forEach(key => {
                Object.defineProperty(baseObject, key, {
                    enumerable: true,
                    get: function () {
                        return baseObject.default[key];
                    },
                });
            });
        }
        super(baseObject);
    }
}
if (toStringTag) {
    Object.defineProperty(RuntimeModuleNamespace.prototype, toStringTag, {
        value: 'Module',
    });
}
class Runtime extends RegisterLoader {
    constructor({ defaultDependencyVersions = {}, host, useSystem = !!(window || global)['PLNKR_RUNTIME_USE_SYSTEM'], }) {
        super(document.baseURI);
        this.baseUri = document.baseURI.endsWith('/')
            ? document.baseURI
            : `${document.baseURI}/`;
        this.injectedFiles = new Map();
        this.useSystem = useSystem;
        if (!host) {
            throw new TypeError('The options.host property is required');
        }
        if (host.getCanonicalPath &&
            typeof host.getCanonicalPath !== 'function') {
            throw new TypeError('The options.host.getCanonicalPath property, if specified, must be a function');
        }
        this[RegisterLoader.moduleNamespace] = RuntimeModuleNamespace;
        this.host = host;
        this.queue = Promise.resolve();
        this.defaultDependencyVersions = Object.assign({}, DEFAULT_DEPENDENCY_VERSIONS, defaultDependencyVersions);
        this.dependencies = new Map();
        this.dependents = new Map();
        this.inject('@empty', {
            source: 'System.register([], function(e) { return { execute: function() { e("exports", {}) } } })',
        });
    }
    [(RegisterLoader.traceLoad)](load) {
        const instance = this.registry.get(load.key);
        const previousInstance = this.registry.get(`${load.key}@prev`);
        if (instance &&
            previousInstance &&
            typeof previousInstance.__onReplace === 'function') {
            const event = {
                previousInstance,
            };
            previousInstance.__onReplace(event);
        }
    }
    [RegisterLoader.traceResolvedStaticDependency](parentKey, _, key) {
        this.registerDependency(parentKey, key);
    }
    [RegisterLoader.resolve](key, parentKey) {
        if (this.injectedFiles.has(key)) {
            return key;
        }
        const urlResult = super[RegisterLoader.resolve](key, parentKey);
        return Promise.resolve(urlResult).then(url => {
            if (url) {
                if (this.injectedFiles.has(url)) {
                    return url;
                }
                if (!url.startsWith(this.baseUri)) {
                    return url;
                }
                const hostRequest = url.slice(this.baseUri.length);
                const hostResolveResult = hostResolve(this.host, hostRequest);
                return Promise.resolve(hostResolveResult).then((hostResolution) => {
                    if (typeof hostResolution !== 'string') {
                        return (Promise.reject(new Error(`Failed to resolve host module '${hostRequest}'`)));
                    }
                    return `${this.baseUri}${hostResolution}`;
                });
            }
            if (typeof this.host.resolveBareDependency === 'function') {
                const resolveResult = this.host.resolveBareDependency(key);
                return Promise.resolve(resolveResult).then(result => {
                    return result;
                });
            }
            const matches = key.match(NPM_MODULE_RX);
            const moduleName = (matches && matches[1]) || key;
            const modulePath = (matches && matches[2]) || '';
            return this.resolve('./package.json')
                .catch(() => null)
                .then(resolvedPackageJsonKey => {
                const packageJsonResult = typeof resolvedPackageJsonKey === 'string'
                    ? this.import(resolvedPackageJsonKey).catch(error => typeof this.host.getCanonicalPath ===
                        'function'
                        ? Promise.reject(new Error(`Error loading '${key}' because 'package.json' is invalid: ${error.message}`))
                        : {})
                    : Promise.resolve({});
                return packageJsonResult
                    .then((packageJson) => {
                    const devDependencies = (packageJson &&
                        packageJson['devDependencies']) ||
                        {};
                    const dependencies = (packageJson && packageJson['dependencies']) ||
                        {};
                    const range = dependencies[moduleName] ||
                        devDependencies[moduleName] ||
                        this.defaultDependencyVersions[moduleName];
                    const spec = range ? createJspmRange(range) : '';
                    return dynamicImport && !this.useSystem
                        ? `${CDN_ESM_URL}/${moduleName}${spec}${modulePath}`
                        : `${CDN_SYSTEM_URL}/${moduleName}${spec}${modulePath}`;
                })
                    .then(resolvedKey => {
                    if (resolvedPackageJsonKey) {
                        this.registerDependency(resolvedKey, resolvedPackageJsonKey);
                    }
                    return resolvedKey;
                });
            });
        });
    }
    [RegisterLoader.instantiate](key, processAnonRegister) {
        if (this.injectedFiles.has(key)) {
            const injectedFile = this.injectedFiles.get(key);
            const instantiateResult = instantiate$1(this, key, injectedFile.source, processAnonRegister);
            return Promise.resolve(instantiateResult);
        }
        if (key.startsWith(this.baseUri)) {
            const loadHostResult = loadHostModule(this, key, processAnonRegister);
            return Promise.resolve(loadHostResult);
        }
        const loadRemoteResult = loadRemoteModule(this, key, processAnonRegister);
        return Promise.resolve(loadRemoteResult);
    }
    inject(key, file) {
        this.injectedFiles.set(key, file);
    }
    invalidate(...pathnames) {
        const getDependents = (normalizedPath) => {
            if (this.dependents.has(normalizedPath)) {
                return Array.from(this.dependents.get(normalizedPath));
            }
            return [];
        };
        const seen = new Set();
        const invalidationPromise = this.queue.then(() => {
            const invalidations = [...pathnames];
            const handleNextInvalidation = () => {
                if (!invalidations.length)
                    return Promise.resolve();
                const pathname = invalidations.shift();
                return this.resolve(pathname).then(resolvedPathname => {
                    if (!seen.has(resolvedPathname)) {
                        seen.add(resolvedPathname);
                        const dependents = getDependents(resolvedPathname);
                        const instance = this.registry.get(resolvedPathname);
                        const event = {
                            propagationStopped: false,
                            stopPropagation() {
                                this.defaultPrevented = true;
                            },
                        };
                        if (instance &&
                            typeof instance.__onAfterUnload === 'function') {
                            instance.__onAfterUnload(event);
                        }
                        this.registry.delete(resolvedPathname);
                        this.dependencies.delete(resolvedPathname);
                        this.dependents.delete(resolvedPathname);
                        if (!event.propagationStopped) {
                            for (const dependent of dependents) {
                                invalidations.push(dependent);
                            }
                        }
                    }
                    return handleNextInvalidation();
                });
            };
            return handleNextInvalidation();
        });
        this.queue = invalidationPromise.catch(() => undefined);
        return invalidationPromise;
    }
    registerDependency(parentKey, key) {
        if (!this.dependencies.has(parentKey)) {
            this.dependencies.set(parentKey, new Set());
        }
        this.dependencies.get(parentKey).add(key);
        if (!this.dependents.has(key)) {
            this.dependents.set(key, new Set());
        }
        this.dependents.get(key).add(parentKey);
    }
}
const dynamicImport = (() => {
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
const EXT_RX = /(\.[^./]+)$/;
function getExt(filename) {
    const matches = filename.match(EXT_RX);
    return matches ? matches[1] : '';
}
function instantiate$1(runtime, key, code, processAnonRegister) {
    const ext = getExt(key);
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
    const transpileResult = transpileCssToSystemRegister(runtime, key, code);
    return Promise.resolve(transpileResult).then(transpiledCode => {
        return instantiateJavascript(runtime, key, transpiledCode, processAnonRegister);
    });
}
function instantiateJson(runtime, _, code) {
    return new runtime[RegisterLoader.moduleNamespace](JSON.parse(code));
}
function instantiateJavascript(runtime, key, codeOrRecord, processAnonRegister) {
    const code = typeof codeOrRecord === 'string' ? codeOrRecord : codeOrRecord.source;
    const systemRegisterCodeResult = detectRegisterFormat(code)
        ? codeOrRecord
        : transpileJs(runtime, key, code);
    return Promise.resolve(systemRegisterCodeResult).then(transpiledCodeOrRecord => {
        const code = typeof transpiledCodeOrRecord === 'string'
            ? annotateCodeSource(transpiledCodeOrRecord, key)
            : annotateCodeSource(transpiledCodeOrRecord.source, key, transpiledCodeOrRecord.sourceMap);
        const moduleFactory = new Function('System', 'SystemJS', code);
        moduleFactory(runtime, runtime);
        if (!processAnonRegister()) {
            return EMPTY_MODULE;
        }
    });
}
function instantiateVue(runtime, key, code, processAnonRegister) {
    const transpileResult = transpileVue(runtime, key, code);
    return Promise.resolve(transpileResult).then(sourceFileRecord => {
        return instantiateJavascript(runtime, key, sourceFileRecord, processAnonRegister);
    });
}
const SOURCE_MAP_PREFIX = '\n//# sourceMapping' + 'URL=data:application/json;base64,';
function inlineSourceMap(sourceMap) {
    let sourceMapString;
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
    const suffix = (sourceMap && inlineSourceMap(sourceMap)) ||
        `\n//# sourceURL=${filename}`;
    return `${code}${suffix}`;
}
function loadRemoteModule(runtime, key, processAnonRegister) {
    if (typeof dynamicImport === 'function' && !runtime.useSystem) {
        const dynamicImportResult = dynamicImport(key);
        return Promise.resolve(dynamicImportResult).then(esModule => {
            const moduleNamespaceConstructor = runtime[RegisterLoader.moduleNamespace];
            // const baseObject =
            //     Object.keys(moduleExports).length <= 1 &&
            //     'default' in moduleExports
            //         ? moduleExports.default
            //         : moduleExports;
            if (esModule.default) {
                const baseObject = esModule.default;
                const descriptors = Object.getOwnPropertyDescriptors(esModule.default);
                Object.defineProperty(baseObject, '__esModule', {
                    value: true,
                });
                Object.defineProperty(baseObject, '__useDefault', {
                    value: esModule.default,
                });
                Object.defineProperty(baseObject, 'default', {
                    enumerable: true,
                    get() {
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
        .then(res => res.text())
        .then(code => instantiate$1(runtime, key, code, processAnonRegister));
}
function loadHostModule(runtime, key, processAnonRegister) {
    const hostKey = key.slice(runtime.baseUri.length);
    const codeResult = runtime.host.getFileContents(hostKey);
    return Promise.resolve(codeResult).then(code => {
        if (typeof code !== 'string') {
            return Promise.reject(new Error(`The runtime host returned non-string file contents for '${key}'`));
        }
        return instantiate$1(runtime, key, code, processAnonRegister);
    });
}
function createJspmRange(semverRange) {
    const range = convertRange(semverRange);
    let versionString = '';
    if (range.isExact)
        versionString = '@' + range.version.toString();
    else if (range.isStable)
        versionString = '@' + range.version.major + '.' + range.version.minor;
    else if (range.isMajor)
        versionString = '@' + range.version.major;
    return versionString;
}

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

const intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
var encode = function(number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

var base64 = {
	encode: encode
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */



// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

const VLQ_BASE_SHIFT = 5;

// binary: 100000
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
const VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
const VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
var encode$1 = function base64VLQ_encode(aValue) {
  let encoded = "";
  let digit;

  let vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

var base64Vlq = {
	encode: encode$1
};

var util = createCommonjsModule(function (module, exports) {
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  }
    throw new Error('"' + aName + '" is a required argument.');

}
exports.getArg = getArg;

const urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
const dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  const match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  let url = "";
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ":";
  }
  url += "//";
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + "@";
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port;
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

const MAX_CACHED_INPUTS = 32;

/**
 * Takes some function `f(input) -> result` and returns a memoized version of
 * `f`.
 *
 * We keep at most `MAX_CACHED_INPUTS` memoized results of `f` alive. The
 * memoization is a dumb-simple, linear least-recently-used cache.
 */
function lruMemoize(f) {
  const cache = [];

  return function(input) {
    for (let i = 0; i < cache.length; i++) {
      if (cache[i].input === input) {
        const temp = cache[0];
        cache[0] = cache[i];
        cache[i] = temp;
        return cache[0].result;
      }
    }

    const result = f(input);

    cache.unshift({
      input,
      result,
    });

    if (cache.length > MAX_CACHED_INPUTS) {
      cache.pop();
    }

    return result;
  };
}

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
const normalize = lruMemoize(function normalize(aPath) {
  let path = aPath;
  const url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  const isAbsolute = exports.isAbsolute(path);

  // Split the path into parts between `/` characters. This is much faster than
  // using `.split(/\/+/g)`.
  const parts = [];
  let start = 0;
  let i = 0;
  while (true) {
    start = i;
    i = path.indexOf("/", start);
    if (i === -1) {
      parts.push(path.slice(start));
      break;
    } else {
      parts.push(path.slice(start, i));
      while (i < path.length && path[i] === "/") {
        i++;
      }
    }
  }

  let up = 0;
  for (i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part === ".") {
      parts.splice(i, 1);
    } else if (part === "..") {
      up++;
    } else if (up > 0) {
      if (part === "") {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join("/");

  if (path === "") {
    path = isAbsolute ? "/" : ".";
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
});
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  const aPathUrl = urlParse(aPath);
  const aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || "/";
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  const joined = aPath.charAt(0) === "/"
    ? aPath
    : normalize(aRoot.replace(/\/+$/, "") + "/" + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function(aPath) {
  return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, "");

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  let level = 0;
  while (aPath.indexOf(aRoot + "/") !== 0) {
    const index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

const supportsNullProto = (function() {
  const obj = Object.create(null);
  return !("__proto__" in obj);
}());

function identity(s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return "$" + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  const length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  /* eslint-disable no-multi-spaces */
  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }
  /* eslint-enable no-multi-spaces */

  for (let i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  let cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  let cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  let cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
}
exports.parseSourceMapInput = parseSourceMapInput;

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  sourceURL = sourceURL || "";

  if (sourceRoot) {
    // This follows what Chrome does.
    if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") {
      sourceRoot += "/";
    }
    // The spec says:
    //   Line 4: An optional source root, useful for relocating source
    //   files on a server or removing repeated values in the
    //   “sources” entry.  This value is prepended to the individual
    //   entries in the “source” field.
    sourceURL = sourceRoot + sourceURL;
  }

  // Historically, SourceMapConsumer did not take the sourceMapURL as
  // a parameter.  This mode is still somewhat supported, which is why
  // this code block is conditional.  However, it's preferable to pass
  // the source map URL to SourceMapConsumer, so that this function
  // can implement the source URL resolution algorithm as outlined in
  // the spec.  This block is basically the equivalent of:
  //    new URL(sourceURL, sourceMapURL).toString()
  // ... except it avoids using URL, which wasn't available in the
  // older releases of node still supported by this library.
  //
  // The spec says:
  //   If the sources are not absolute URLs after prepending of the
  //   “sourceRoot”, the sources are resolved relative to the
  //   SourceMap (like resolving script src in a html document).
  if (sourceMapURL) {
    const parsed = urlParse(sourceMapURL);
    if (!parsed) {
      throw new Error("sourceMapURL could not be parsed");
    }
    if (parsed.path) {
      // Strip the last path component, but keep the "/".
      const index = parsed.path.lastIndexOf("/");
      if (index >= 0) {
        parsed.path = parsed.path.substring(0, index + 1);
      }
    }
    sourceURL = join(urlGenerate(parsed), sourceURL);
  }

  return normalize(sourceURL);
}
exports.computeSourceURL = computeSourceURL;
});
var util_1 = util.getArg;
var util_2 = util.urlParse;
var util_3 = util.urlGenerate;
var util_4 = util.normalize;
var util_5 = util.join;
var util_6 = util.isAbsolute;
var util_7 = util.relative;
var util_8 = util.toSetString;
var util_9 = util.fromSetString;
var util_10 = util.compareByOriginalPositions;
var util_11 = util.compareByGeneratedPositionsDeflated;
var util_12 = util.compareByGeneratedPositionsInflated;
var util_13 = util.parseSourceMapInput;
var util_14 = util.computeSourceURL;

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
class ArraySet {
  constructor() {
    this._array = [];
    this._set = new Map();
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  static fromArray(aArray, aAllowDuplicates) {
    const set = new ArraySet();
    for (let i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  }

  /**
   * Return how many unique items are in this ArraySet. If duplicates have been
   * added, than those do not count towards the size.
   *
   * @returns Number
   */
  size() {
    return this._set.size;
  }

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  add(aStr, aAllowDuplicates) {
    const isDuplicate = this.has(aStr);
    const idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set.set(aStr, idx);
    }
  }

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  has(aStr) {
      return this._set.has(aStr);
  }

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  indexOf(aStr) {
    const idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
    throw new Error('"' + aStr + '" is not in the set.');
  }

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error("No element indexed by " + aIdx);
  }

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  toArray() {
    return this._array.slice();
  }
}
var ArraySet_1 = ArraySet;

var arraySet = {
	ArraySet: ArraySet_1
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */



/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  const lineA = mappingA.generatedLine;
  const lineB = mappingB.generatedLine;
  const columnA = mappingA.generatedColumn;
  const columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a negligible overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
class MappingList {
  constructor() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = {generatedLine: -1, generatedColumn: 0};
  }

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  unsortedForEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  }

  /**
   * Add the given source mapping.
   *
   * @param Object aMapping
   */
  add(aMapping) {
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  }

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  toArray() {
    if (!this._sorted) {
      this._array.sort(util.compareByGeneratedPositionsInflated);
      this._sorted = true;
    }
    return this._array;
  }
}

var MappingList_1 = MappingList;

var mappingList = {
	MappingList: MappingList_1
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */



const ArraySet$1 = arraySet.ArraySet;
const MappingList$1 = mappingList.MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
class SourceMapGenerator {
  constructor(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util.getArg(aArgs, "file", null);
    this._sourceRoot = util.getArg(aArgs, "sourceRoot", null);
    this._skipValidation = util.getArg(aArgs, "skipValidation", false);
    this._sources = new ArraySet$1();
    this._names = new ArraySet$1();
    this._mappings = new MappingList$1();
    this._sourcesContents = null;
  }

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  static fromSourceMap(aSourceMapConsumer) {
    const sourceRoot = aSourceMapConsumer.sourceRoot;
    const generator = new SourceMapGenerator({
      file: aSourceMapConsumer.file,
      sourceRoot
    });
    aSourceMapConsumer.eachMapping(function(mapping) {
      const newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function(sourceFile) {
      let sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      const content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  }

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  addMapping(aArgs) {
    const generated = util.getArg(aArgs, "generated");
    const original = util.getArg(aArgs, "original", null);
    let source = util.getArg(aArgs, "source", null);
    let name = util.getArg(aArgs, "name", null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source,
      name
    });
  }

  /**
   * Set the source content for a source file.
   */
  setSourceContent(aSourceFile, aSourceContent) {
    let source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  }

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    let sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          "SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, " +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    const sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    const newSources = this._mappings.toArray().length > 0
      ? new ArraySet$1()
      : this._sources;
    const newNames = new ArraySet$1();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function(mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        const original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util.join(aSourceMapPath, mapping.source);
          }
          if (sourceRoot != null) {
            mapping.source = util.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      const source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      const name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function(srcFile) {
      const content = aSourceMapConsumer.sourceContentFor(srcFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          srcFile = util.join(aSourceMapPath, srcFile);
        }
        if (sourceRoot != null) {
          srcFile = util.relative(sourceRoot, srcFile);
        }
        this.setSourceContent(srcFile, content);
      }
    }, this);
  }

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  _validateMapping(aGenerated, aOriginal, aSource, aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
        throw new Error(
            "original.line and original.column are not numbers -- you probably meant to omit " +
            "the original mapping entirely and only map the generated position. If so, pass " +
            "null for the original mapping instead of an object with empty or null values."
        );
    }

    if (aGenerated && "line" in aGenerated && "column" in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) ; else if (aGenerated && "line" in aGenerated && "column" in aGenerated
             && aOriginal && "line" in aOriginal && "column" in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) ; else {
      throw new Error("Invalid mapping: " + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  }

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  _serializeMappings() {
    let previousGeneratedColumn = 0;
    let previousGeneratedLine = 1;
    let previousOriginalColumn = 0;
    let previousOriginalLine = 0;
    let previousName = 0;
    let previousSource = 0;
    let result = "";
    let next;
    let mapping;
    let nameIdx;
    let sourceIdx;

    const mappings = this._mappings.toArray();
    for (let i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = "";

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ";";
          previousGeneratedLine++;
        }
      } else if (i > 0) {
        if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
          continue;
        }
        next += ",";
      }

      next += base64Vlq.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64Vlq.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64Vlq.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64Vlq.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64Vlq.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  }

  _generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function(source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util.relative(aSourceRoot, source);
      }
      const key = util.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  }

  /**
   * Externalize the source map.
   */
  toJSON() {
    const map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  }

  /**
   * Render the source map being generated to a string.
   */
  toString() {
    return JSON.stringify(this.toJSON());
  }
}

SourceMapGenerator.prototype._version = 3;
var SourceMapGenerator_1 = SourceMapGenerator;

var sourceMapGenerator = {
	SourceMapGenerator: SourceMapGenerator_1
};

var binarySearch = createCommonjsModule(function (module, exports) {
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  const mid = Math.floor((aHigh - aLow) / 2) + aLow;
  const cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  } else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    }
    return mid;
  }

  // Our needle is less than aHaystack[mid].
  if (mid - aLow > 1) {
    // The element is in the lower half.
    return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
  }

  // we are in termination case (3) or (2) and return the appropriate thing.
  if (aBias == exports.LEAST_UPPER_BOUND) {
    return mid;
  }
  return aLow < 0 ? -1 : aLow;
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  let index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};
});
var binarySearch_1 = binarySearch.GREATEST_LOWER_BOUND;
var binarySearch_2 = binarySearch.LEAST_UPPER_BOUND;
var binarySearch_3 = binarySearch.search;

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
function resolve() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : '/';

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
}
// path.normalize(path)
// posix version
function normalize(path) {
  var isPathAbsolute = isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isPathAbsolute).join('/');

  if (!path && !isPathAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isPathAbsolute ? '/' : '') + path;
}
// posix version
function isAbsolute(path) {
  return path.charAt(0) === '/';
}

// posix version
function join() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
}


// path.relative(from, to)
// posix version
function relative(from, to) {
  from = resolve(from).substr(1);
  to = resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
}

var sep = '/';
var delimiter = ':';

function dirname(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
}

function basename(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
}


function extname(path) {
  return splitPath(path)[3];
}
var path = {
  extname: extname,
  basename: basename,
  dirname: dirname,
  sep: sep,
  delimiter: delimiter,
  relative: relative,
  join: join,
  isAbsolute: isAbsolute,
  normalize: normalize,
  resolve: resolve
};
function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b' ?
    function (str, start, len) { return str.substr(start, len) } :
    function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

var path$1 = /*#__PURE__*/Object.freeze({
  resolve: resolve,
  normalize: normalize,
  isAbsolute: isAbsolute,
  join: join,
  relative: relative,
  sep: sep,
  delimiter: delimiter,
  dirname: dirname,
  basename: basename,
  extname: extname,
  default: path
});

var require$$0 = ( path$1 && path ) || path$1;

var readWasm = createCommonjsModule(function (module) {
if (typeof fetch === "function") {
  // Web version of reading a wasm file into an array buffer.

  let mappingsWasmUrl = null;

  module.exports = function readWasm() {
    if (typeof mappingsWasmUrl !== "string") {
      throw new Error("You must provide the URL of lib/mappings.wasm by calling " +
                      "SourceMapConsumer.initialize({ 'lib/mappings.wasm': ... }) " +
                      "before using SourceMapConsumer");
    }

    return fetch(mappingsWasmUrl)
      .then(response => response.arrayBuffer());
  };

  module.exports.initialize = url => mappingsWasmUrl = url;
} else {
  // Node version of reading a wasm file into an array buffer.
  const fs = require("fs");
  const path = require$$0;

  module.exports = function readWasm() {
    return new Promise((resolve, reject) => {
      const wasmPath = path.join(__dirname, "mappings.wasm");
      fs.readFile(wasmPath, null, (error, data) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(data.buffer);
      });
    });
  };

  module.exports.initialize = _ => {
    console.debug("SourceMapConsumer.initialize is a no-op when running in node.js");
  };
}
});
var readWasm_1 = readWasm.initialize;

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.lastGeneratedColumn = null;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

let cachedWasm = null;

var wasm = function wasm() {
  if (cachedWasm) {
    return cachedWasm;
  }

  const callbackStack = [];

  cachedWasm = readWasm().then(buffer => {
      return WebAssembly.instantiate(buffer, {
        env: {
          mapping_callback(
            generatedLine,
            generatedColumn,

            hasLastGeneratedColumn,
            lastGeneratedColumn,

            hasOriginal,
            source,
            originalLine,
            originalColumn,

            hasName,
            name
          ) {
            const mapping = new Mapping();
            // JS uses 1-based line numbers, wasm uses 0-based.
            mapping.generatedLine = generatedLine + 1;
            mapping.generatedColumn = generatedColumn;

            if (hasLastGeneratedColumn) {
              // JS uses inclusive last generated column, wasm uses exclusive.
              mapping.lastGeneratedColumn = lastGeneratedColumn - 1;
            }

            if (hasOriginal) {
              mapping.source = source;
              // JS uses 1-based line numbers, wasm uses 0-based.
              mapping.originalLine = originalLine + 1;
              mapping.originalColumn = originalColumn;

              if (hasName) {
                mapping.name = name;
              }
            }

            callbackStack[callbackStack.length - 1](mapping);
          },

          start_all_generated_locations_for() { console.time("all_generated_locations_for"); },
          end_all_generated_locations_for() { console.timeEnd("all_generated_locations_for"); },

          start_compute_column_spans() { console.time("compute_column_spans"); },
          end_compute_column_spans() { console.timeEnd("compute_column_spans"); },

          start_generated_location_for() { console.time("generated_location_for"); },
          end_generated_location_for() { console.timeEnd("generated_location_for"); },

          start_original_location_for() { console.time("original_location_for"); },
          end_original_location_for() { console.timeEnd("original_location_for"); },

          start_parse_mappings() { console.time("parse_mappings"); },
          end_parse_mappings() { console.timeEnd("parse_mappings"); },

          start_sort_by_generated_location() { console.time("sort_by_generated_location"); },
          end_sort_by_generated_location() { console.timeEnd("sort_by_generated_location"); },

          start_sort_by_original_location() { console.time("sort_by_original_location"); },
          end_sort_by_original_location() { console.timeEnd("sort_by_original_location"); },
        }
      });
  }).then(Wasm => {
    return {
      exports: Wasm.instance.exports,
      withMappingCallback: (mappingCallback, f) => {
        callbackStack.push(mappingCallback);
        try {
          f();
        } finally {
          callbackStack.pop();
        }
      }
    };
  }).then(null, e => {
    cachedWasm = null;
    throw e;
  });

  return cachedWasm;
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */



const ArraySet$2 = arraySet.ArraySet;
 // eslint-disable-line no-unused-vars



const INTERNAL = Symbol("smcInternal");

class SourceMapConsumer {
  constructor(aSourceMap, aSourceMapURL) {
    // If the constructor was called by super(), just return Promise<this>.
    // Yes, this is a hack to retain the pre-existing API of the base-class
    // constructor also being an async factory function.
    if (aSourceMap == INTERNAL) {
      return Promise.resolve(this);
    }

    return _factory(aSourceMap, aSourceMapURL);
  }

  static initialize(opts) {
    readWasm.initialize(opts["lib/mappings.wasm"]);
  }

  static fromSourceMap(aSourceMap, aSourceMapURL) {
    return _factoryBSM(aSourceMap, aSourceMapURL);
  }

  /**
   * Construct a new `SourceMapConsumer` from `rawSourceMap` and `sourceMapUrl`
   * (see the `SourceMapConsumer` constructor for details. Then, invoke the `async
   * function f(SourceMapConsumer) -> T` with the newly constructed consumer, wait
   * for `f` to complete, call `destroy` on the consumer, and return `f`'s return
   * value.
   *
   * You must not use the consumer after `f` completes!
   *
   * By using `with`, you do not have to remember to manually call `destroy` on
   * the consumer, since it will be called automatically once `f` completes.
   *
   * ```js
   * const xSquared = await SourceMapConsumer.with(
   *   myRawSourceMap,
   *   null,
   *   async function (consumer) {
   *     // Use `consumer` inside here and don't worry about remembering
   *     // to call `destroy`.
   *
   *     const x = await whatever(consumer);
   *     return x * x;
   *   }
   * );
   *
   * // You may not use that `consumer` anymore out here; it has
   * // been destroyed. But you can use `xSquared`.
   * console.log(xSquared);
   * ```
   */
  static with(rawSourceMap, sourceMapUrl, f) {
    // Note: The `acorn` version that `webpack` currently depends on doesn't
    // support `async` functions, and the nodes that we support don't all have
    // `.finally`. Therefore, this is written a bit more convolutedly than it
    // should really be.

    let consumer = null;
    const promise = new SourceMapConsumer(rawSourceMap, sourceMapUrl);
    return promise
      .then(c => {
        consumer = c;
        return f(c);
      })
      .then(x => {
        if (consumer) {
          consumer.destroy();
        }
        return x;
      }, e => {
        if (consumer) {
          consumer.destroy();
        }
        throw e;
      });
  }

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  _parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  }

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *        The function that is called with each mapping.
   * @param Object aContext
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `aCallback` is called.
   * @param aOrder
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  eachMapping(aCallback, aContext, aOrder) {
    throw new Error("Subclasses must implement eachMapping");
  }

  /**
   * Returns all generated line and column information for the original source,
   * line, and column provided. If no column is provided, returns all mappings
   * corresponding to a either the line we are searching for or the next
   * closest line that has any mappings. Otherwise, returns all mappings
   * corresponding to the given line and either the column we are searching for
   * or the next closest column that has any offsets.
   *
   * The only argument is an object with the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.  The line number is 1-based.
   *   - column: Optional. the column number in the original source.
   *    The column number is 0-based.
   *
   * and an array of objects is returned, each with the following properties:
   *
   *   - line: The line number in the generated source, or null.  The
   *    line number is 1-based.
   *   - column: The column number in the generated source, or null.
   *    The column number is 0-based.
   */
  allGeneratedPositionsFor(aArgs) {
    throw new Error("Subclasses must implement allGeneratedPositionsFor");
  }

  destroy() {
    throw new Error("Subclasses must implement destroy");
  }
}

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer.prototype._version = 3;
SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

var SourceMapConsumer_1 = SourceMapConsumer;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
class BasicSourceMapConsumer extends SourceMapConsumer {
  constructor(aSourceMap, aSourceMapURL) {
    return super(INTERNAL).then(that => {
      let sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }

      const version = util.getArg(sourceMap, "version");
      let sources = util.getArg(sourceMap, "sources");
      // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
      // requires the array) to play nice here.
      const names = util.getArg(sourceMap, "names", []);
      let sourceRoot = util.getArg(sourceMap, "sourceRoot", null);
      const sourcesContent = util.getArg(sourceMap, "sourcesContent", null);
      const mappings = util.getArg(sourceMap, "mappings");
      const file = util.getArg(sourceMap, "file", null);

      // Once again, Sass deviates from the spec and supplies the version as a
      // string rather than a number, so we use loose equality checking here.
      if (version != that._version) {
        throw new Error("Unsupported version: " + version);
      }

      if (sourceRoot) {
        sourceRoot = util.normalize(sourceRoot);
      }

      sources = sources
        .map(String)
        // Some source maps produce relative source paths like "./foo.js" instead of
        // "foo.js".  Normalize these first so that future comparisons will succeed.
        // See bugzil.la/1090768.
        .map(util.normalize)
        // Always ensure that absolute sources are internally stored relative to
        // the source root, if the source root is absolute. Not doing this would
        // be particularly problematic when the source root is a prefix of the
        // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
        .map(function(source) {
          return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
            ? util.relative(sourceRoot, source)
            : source;
        });

      // Pass `true` below to allow duplicate names and sources. While source maps
      // are intended to be compressed and deduplicated, the TypeScript compiler
      // sometimes generates source maps with duplicates in them. See Github issue
      // #72 and bugzil.la/889492.
      that._names = ArraySet$2.fromArray(names.map(String), true);
      that._sources = ArraySet$2.fromArray(sources, true);

      that._absoluteSources = that._sources.toArray().map(function(s) {
        return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
      });

      that.sourceRoot = sourceRoot;
      that.sourcesContent = sourcesContent;
      that._mappings = mappings;
      that._sourceMapURL = aSourceMapURL;
      that.file = file;

      that._computedColumnSpans = false;
      that._mappingsPtr = 0;
      that._wasm = null;

      return wasm().then(w => {
        that._wasm = w;
        return that;
      });
    });
  }

  /**
   * Utility function to find the index of a source.  Returns -1 if not
   * found.
   */
  _findSourceIndex(aSource) {
    let relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util.relative(this.sourceRoot, relativeSource);
    }

    if (this._sources.has(relativeSource)) {
      return this._sources.indexOf(relativeSource);
    }

    // Maybe aSource is an absolute URL as returned by |sources|.  In
    // this case we can't simply undo the transform.
    for (let i = 0; i < this._absoluteSources.length; ++i) {
      if (this._absoluteSources[i] == aSource) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Create a BasicSourceMapConsumer from a SourceMapGenerator.
   *
   * @param SourceMapGenerator aSourceMap
   *        The source map that will be consumed.
   * @param String aSourceMapURL
   *        The URL at which the source map can be found (optional)
   * @returns BasicSourceMapConsumer
   */
  static fromSourceMap(aSourceMap, aSourceMapURL) {
    return new BasicSourceMapConsumer(aSourceMap.toString());
  }

  get sources() {
    return this._absoluteSources.slice();
  }

  _getMappingsPtr() {
    if (this._mappingsPtr === 0) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this._mappingsPtr;
  }

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  _parseMappings(aStr, aSourceRoot) {
    const size = aStr.length;

    const mappingsBufPtr = this._wasm.exports.allocate_mappings(size);
    const mappingsBuf = new Uint8Array(this._wasm.exports.memory.buffer, mappingsBufPtr, size);
    for (let i = 0; i < size; i++) {
      mappingsBuf[i] = aStr.charCodeAt(i);
    }

    const mappingsPtr = this._wasm.exports.parse_mappings(mappingsBufPtr);

    if (!mappingsPtr) {
      const error = this._wasm.exports.get_last_error();
      let msg = `Error parsing mappings (code ${error}): `;

      // XXX: keep these error codes in sync with `fitzgen/source-map-mappings`.
      switch (error) {
        case 1:
          msg += "the mappings contained a negative line, column, source index, or name index";
          break;
        case 2:
          msg += "the mappings contained a number larger than 2**32";
          break;
        case 3:
          msg += "reached EOF while in the middle of parsing a VLQ";
          break;
        case 4:
          msg += "invalid base 64 character while parsing a VLQ";
          break;
        default:
          msg += "unknown error code";
          break;
      }

      throw new Error(msg);
    }

    this._mappingsPtr = mappingsPtr;
  }

  eachMapping(aCallback, aContext, aOrder) {
    const context = aContext || null;
    const order = aOrder || SourceMapConsumer.GENERATED_ORDER;
    const sourceRoot = this.sourceRoot;

    this._wasm.withMappingCallback(
      mapping => {
        if (mapping.source !== null) {
          mapping.source = this._sources.at(mapping.source);
          mapping.source = util.computeSourceURL(sourceRoot, mapping.source, this._sourceMapURL);

          if (mapping.name !== null) {
            mapping.name = this._names.at(mapping.name);
          }
        }

        aCallback.call(context, mapping);
      },
      () => {
        switch (order) {
        case SourceMapConsumer.GENERATED_ORDER:
          this._wasm.exports.by_generated_location(this._getMappingsPtr());
          break;
        case SourceMapConsumer.ORIGINAL_ORDER:
          this._wasm.exports.by_original_location(this._getMappingsPtr());
          break;
        default:
          throw new Error("Unknown order of iteration.");
        }
      }
    );
  }

  allGeneratedPositionsFor(aArgs) {
    let source = util.getArg(aArgs, "source");
    const originalLine = util.getArg(aArgs, "line");
    const originalColumn = aArgs.column || 0;

    source = this._findSourceIndex(source);
    if (source < 0) {
      return [];
    }

    if (originalLine < 1) {
      throw new Error("Line numbers must be >= 1");
    }

    if (originalColumn < 0) {
      throw new Error("Column numbers must be >= 0");
    }

    const mappings = [];

    this._wasm.withMappingCallback(
      m => {
        let lastColumn = m.lastGeneratedColumn;
        if (this._computedColumnSpans && lastColumn === null) {
          lastColumn = Infinity;
        }
        mappings.push({
          line: m.generatedLine,
          column: m.generatedColumn,
          lastColumn,
        });
      }, () => {
        this._wasm.exports.all_generated_locations_for(
          this._getMappingsPtr(),
          source,
          originalLine - 1,
          "column" in aArgs,
          originalColumn
        );
      }
    );

    return mappings;
  }

  destroy() {
    if (this._mappingsPtr !== 0) {
      this._wasm.exports.free_mappings(this._mappingsPtr);
      this._mappingsPtr = 0;
    }
  }

  /**
   * Compute the last column for each generated mapping. The last column is
   * inclusive.
   */
  computeColumnSpans() {
    if (this._computedColumnSpans) {
      return;
    }

    this._wasm.exports.compute_column_spans(this._getMappingsPtr());
    this._computedColumnSpans = true;
  }

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.  The line number
   *     is 1-based.
   *   - column: The column number in the generated source.  The column
   *     number is 0-based.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.  The
   *     line number is 1-based.
   *   - column: The column number in the original source, or null.  The
   *     column number is 0-based.
   *   - name: The original identifier, or null.
   */
  originalPositionFor(aArgs) {
    const needle = {
      generatedLine: util.getArg(aArgs, "line"),
      generatedColumn: util.getArg(aArgs, "column")
    };

    if (needle.generatedLine < 1) {
      throw new Error("Line numbers must be >= 1");
    }

    if (needle.generatedColumn < 0) {
      throw new Error("Column numbers must be >= 0");
    }

    let bias = util.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND);
    if (bias == null) {
      bias = SourceMapConsumer.GREATEST_LOWER_BOUND;
    }

    let mapping;
    this._wasm.withMappingCallback(m => mapping = m, () => {
      this._wasm.exports.original_location_for(
        this._getMappingsPtr(),
        needle.generatedLine - 1,
        needle.generatedColumn,
        bias
      );
    });

    if (mapping) {
      if (mapping.generatedLine === needle.generatedLine) {
        let source = util.getArg(mapping, "source", null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }

        let name = util.getArg(mapping, "name", null);
        if (name !== null) {
          name = this._names.at(name);
        }

        return {
          source,
          line: util.getArg(mapping, "originalLine", null),
          column: util.getArg(mapping, "originalColumn", null),
          name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  }

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function(sc) { return sc == null; });
  }

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * available.
   */
  sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    const index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    let relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util.relative(this.sourceRoot, relativeSource);
    }

    let url;
    if (this.sourceRoot != null
        && (url = util.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      const fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }

    throw new Error('"' + relativeSource + '" is not in the SourceMap.');
  }

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.  The line number
   *     is 1-based.
   *   - column: The column number in the original source.  The column
   *     number is 0-based.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.  The
   *     line number is 1-based.
   *   - column: The column number in the generated source, or null.
   *     The column number is 0-based.
   */
  generatedPositionFor(aArgs) {
    let source = util.getArg(aArgs, "source");
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    const needle = {
      source,
      originalLine: util.getArg(aArgs, "line"),
      originalColumn: util.getArg(aArgs, "column")
    };

    if (needle.originalLine < 1) {
      throw new Error("Line numbers must be >= 1");
    }

    if (needle.originalColumn < 0) {
      throw new Error("Column numbers must be >= 0");
    }

    let bias = util.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND);
    if (bias == null) {
      bias = SourceMapConsumer.GREATEST_LOWER_BOUND;
    }

    let mapping;
    this._wasm.withMappingCallback(m => mapping = m, () => {
      this._wasm.exports.generated_location_for(
        this._getMappingsPtr(),
        needle.source,
        needle.originalLine - 1,
        needle.originalColumn,
        bias
      );
    });

    if (mapping) {
      if (mapping.source === needle.source) {
        let lastColumn = mapping.lastGeneratedColumn;
        if (this._computedColumnSpans && lastColumn === null) {
          lastColumn = Infinity;
        }
        return {
          line: util.getArg(mapping, "generatedLine", null),
          column: util.getArg(mapping, "generatedColumn", null),
          lastColumn,
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  }
}

BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
var BasicSourceMapConsumer_1 = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
class IndexedSourceMapConsumer extends SourceMapConsumer {
  constructor(aSourceMap, aSourceMapURL) {
    return super(INTERNAL).then(that => {
      let sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }

      const version = util.getArg(sourceMap, "version");
      const sections = util.getArg(sourceMap, "sections");

      if (version != that._version) {
        throw new Error("Unsupported version: " + version);
      }

      that._sources = new ArraySet$2();
      that._names = new ArraySet$2();
      that.__generatedMappings = null;
      that.__originalMappings = null;
      that.__generatedMappingsUnsorted = null;
      that.__originalMappingsUnsorted = null;

      let lastOffset = {
        line: -1,
        column: 0
      };
      return Promise.all(sections.map(s => {
        if (s.url) {
          // The url field will require support for asynchronicity.
          // See https://github.com/mozilla/source-map/issues/16
          throw new Error("Support for url field in sections not implemented.");
        }
        const offset = util.getArg(s, "offset");
        const offsetLine = util.getArg(offset, "line");
        const offsetColumn = util.getArg(offset, "column");

        if (offsetLine < lastOffset.line ||
            (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
          throw new Error("Section offsets must be ordered and non-overlapping.");
        }
        lastOffset = offset;

        const cons = new SourceMapConsumer(util.getArg(s, "map"), aSourceMapURL);
        return cons.then(consumer => {
          return {
            generatedOffset: {
              // The offset fields are 0-based, but we use 1-based indices when
              // encoding/decoding from VLQ.
              generatedLine: offsetLine + 1,
              generatedColumn: offsetColumn + 1
            },
            consumer
          };
        });
      })).then(s => {
        that._sections = s;
        return that;
      });
    });
  }

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.
  get _generatedMappings() {
    if (!this.__generatedMappings) {
      this._sortGeneratedMappings();
    }

    return this.__generatedMappings;
  }

  get _originalMappings() {
    if (!this.__originalMappings) {
      this._sortOriginalMappings();
    }

    return this.__originalMappings;
  }

  get _generatedMappingsUnsorted() {
    if (!this.__generatedMappingsUnsorted) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappingsUnsorted;
  }

  get _originalMappingsUnsorted() {
    if (!this.__originalMappingsUnsorted) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappingsUnsorted;
  }

  _sortGeneratedMappings() {
    const mappings = this._generatedMappingsUnsorted;
    mappings.sort(util.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = mappings;
  }

  _sortOriginalMappings() {
    const mappings = this._originalMappingsUnsorted;
    mappings.sort(util.compareByOriginalPositions);
    this.__originalMappings = mappings;
  }

  /**
   * The list of original sources.
   */
  get sources() {
    const sources = [];
    for (let i = 0; i < this._sections.length; i++) {
      for (let j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.  The line number
   *     is 1-based.
   *   - column: The column number in the generated source.  The column
   *     number is 0-based.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.  The
   *     line number is 1-based.
   *   - column: The column number in the original source, or null.  The
   *     column number is 0-based.
   *   - name: The original identifier, or null.
   */
  originalPositionFor(aArgs) {
    const needle = {
      generatedLine: util.getArg(aArgs, "line"),
      generatedColumn: util.getArg(aArgs, "column")
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    const sectionIndex = binarySearch.search(needle, this._sections,
      function(aNeedle, section) {
        const cmp = aNeedle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (aNeedle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    const section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  }

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  hasContentsOfAllSources() {
    return this._sections.every(function(s) {
      return s.consumer.hasContentsOfAllSources();
    });
  }

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * available.
   */
  sourceContentFor(aSource, nullOnMissing) {
    for (let i = 0; i < this._sections.length; i++) {
      const section = this._sections[i];

      const content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    throw new Error('"' + aSource + '" is not in the SourceMap.');
  }

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.  The line number
   *     is 1-based.
   *   - column: The column number in the original source.  The column
   *     number is 0-based.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.  The
   *     line number is 1-based.
   *   - column: The column number in the generated source, or null.
   *     The column number is 0-based.
   */
  generatedPositionFor(aArgs) {
    for (let i = 0; i < this._sections.length; i++) {
      const section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(util.getArg(aArgs, "source")) === -1) {
        continue;
      }
      const generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        const ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  }

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  _parseMappings(aStr, aSourceRoot) {
    const generatedMappings = this.__generatedMappingsUnsorted = [];
    const originalMappings = this.__originalMappingsUnsorted = [];
    for (let i = 0; i < this._sections.length; i++) {
      const section = this._sections[i];

      const sectionMappings = [];
      section.consumer.eachMapping(m => sectionMappings.push(m));

      for (let j = 0; j < sectionMappings.length; j++) {
        const mapping = sectionMappings[j];

        // TODO: test if null is correct here.  The original code used
        // `source`, which would actually have gotten used as null because
        // var's get hoisted.
        // See: https://github.com/mozilla/source-map/issues/333
        let source = util.computeSourceURL(section.consumer.sourceRoot, null, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        let name = null;
        if (mapping.name) {
          this._names.add(mapping.name);
          name = this._names.indexOf(mapping.name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        const adjustedMapping = {
          source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name
        };

        generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === "number") {
          originalMappings.push(adjustedMapping);
        }
      }
    }
  }

  eachMapping(aCallback, aContext, aOrder) {
    const context = aContext || null;
    const order = aOrder || SourceMapConsumer.GENERATED_ORDER;

    let mappings;
    switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    const sourceRoot = this.sourceRoot;
    mappings.map(function(mapping) {
      let source = null;
      if (mapping.source !== null) {
        source = this._sources.at(mapping.source);
        source = util.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      }
      return {
        source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  }

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  _findMapping(aNeedle, aMappings, aLineName,
              aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError("Line must be greater than or equal to 1, got "
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError("Column must be greater than or equal to 0, got "
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  }

  allGeneratedPositionsFor(aArgs) {
    const line = util.getArg(aArgs, "line");

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    const needle = {
      source: util.getArg(aArgs, "source"),
      originalLine: line,
      originalColumn: util.getArg(aArgs, "column", 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    if (needle.originalLine < 1) {
      throw new Error("Line numbers must be >= 1");
    }

    if (needle.originalColumn < 0) {
      throw new Error("Column numbers must be >= 0");
    }

    const mappings = [];

    let index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      let mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        const originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          let lastColumn = mapping.lastGeneratedColumn;
          if (this._computedColumnSpans && lastColumn === null) {
            lastColumn = Infinity;
          }
          mappings.push({
            line: util.getArg(mapping, "generatedLine", null),
            column: util.getArg(mapping, "generatedColumn", null),
            lastColumn,
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        const originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          let lastColumn = mapping.lastGeneratedColumn;
          if (this._computedColumnSpans && lastColumn === null) {
            lastColumn = Infinity;
          }
          mappings.push({
            line: util.getArg(mapping, "generatedLine", null),
            column: util.getArg(mapping, "generatedColumn", null),
            lastColumn,
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  }

  destroy() {
    for (let i = 0; i < this._sections.length; i++) {
      this._sections[i].consumer.destroy();
    }
  }
}
var IndexedSourceMapConsumer_1 = IndexedSourceMapConsumer;

/*
 * Cheat to get around inter-twingled classes.  `factory()` can be at the end
 * where it has access to non-hoisted classes, but it gets hoisted itself.
 */
function _factory(aSourceMap, aSourceMapURL) {
  let sourceMap = aSourceMap;
  if (typeof aSourceMap === "string") {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  const consumer = sourceMap.sections != null
      ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
      : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
  return Promise.resolve(consumer);
}

function _factoryBSM(aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
}

var sourceMapConsumer = {
	SourceMapConsumer: SourceMapConsumer_1,
	BasicSourceMapConsumer: BasicSourceMapConsumer_1,
	IndexedSourceMapConsumer: IndexedSourceMapConsumer_1
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

const SourceMapGenerator$1 = sourceMapGenerator.SourceMapGenerator;


// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
// operating systems these days (capturing the result).
const REGEX_NEWLINE = /(\r?\n)/;

// Newline character code for charCodeAt() comparisons
const NEWLINE_CODE = 10;

// Private symbol for identifying `SourceNode`s when multiple versions of
// the source-map library are loaded. This MUST NOT CHANGE across
// versions!
const isSourceNode = "$$$isSourceNode$$$";

/**
 * SourceNodes provide a way to abstract over interpolating/concatenating
 * snippets of generated JavaScript source code while maintaining the line and
 * column information associated with the original source code.
 *
 * @param aLine The original line number.
 * @param aColumn The original column number.
 * @param aSource The original source's filename.
 * @param aChunks Optional. An array of strings which are snippets of
 *        generated JS, or other SourceNodes.
 * @param aName The original identifier.
 */
class SourceNode {
  constructor(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine == null ? null : aLine;
    this.column = aColumn == null ? null : aColumn;
    this.source = aSource == null ? null : aSource;
    this.name = aName == null ? null : aName;
    this[isSourceNode] = true;
    if (aChunks != null) this.add(aChunks);
  }

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   * @param aRelativePath Optional. The path that relative sources in the
   *        SourceMapConsumer should be relative to.
   */
  static fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    const node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    const remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    let remainingLinesIndex = 0;
    const shiftNextLine = function() {
      const lineContents = getNextLine();
      // The last line of a file might not have a newline.
      const newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    let lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    let lastMapping = null;
    let nextLine;

    aSourceMapConsumer.eachMapping(function(mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          nextLine = remainingLines[remainingLinesIndex] || "";
          const code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        nextLine = remainingLines[remainingLinesIndex] || "";
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function(sourceFile) {
      const content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        const source = aRelativePath
          ? util.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  }

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function(chunk) {
        this.add(chunk);
      }, this);
    } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    } else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  }

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (let i = aChunk.length - 1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    } else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  }

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  walk(aFn) {
    let chunk;
    for (let i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk[isSourceNode]) {
        chunk.walk(aFn);
      } else if (chunk !== "") {
        aFn(chunk, { source: this.source,
                      line: this.line,
                      column: this.column,
                      name: this.name });
      }
    }
  }

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  join(aSep) {
    let newChildren;
    let i;
    const len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len - 1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  }

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  replaceRight(aPattern, aReplacement) {
    const lastChild = this.children[this.children.length - 1];
    if (lastChild[isSourceNode]) {
      lastChild.replaceRight(aPattern, aReplacement);
    } else if (typeof lastChild === "string") {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    } else {
      this.children.push("".replace(aPattern, aReplacement));
    }
    return this;
  }

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
  }

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  walkSourceContents(aFn) {
    for (let i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    const sources = Object.keys(this.sourceContents);
    for (let i = 0, len = sources.length; i < len; i++) {
      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  }

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  toString() {
    let str = "";
    this.walk(function(chunk) {
      str += chunk;
    });
    return str;
  }

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  toStringWithSourceMap(aArgs) {
    const generated = {
      code: "",
      line: 1,
      column: 0
    };
    const map = new SourceMapGenerator$1(aArgs);
    let sourceMappingActive = false;
    let lastOriginalSource = null;
    let lastOriginalLine = null;
    let lastOriginalColumn = null;
    let lastOriginalName = null;
    this.walk(function(chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if (lastOriginalSource !== original.source
          || lastOriginalLine !== original.line
          || lastOriginalColumn !== original.column
          || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      for (let idx = 0, length = chunk.length; idx < length; idx++) {
        if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      }
    });
    this.walkSourceContents(function(sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map };
  }
}

var SourceNode_1 = SourceNode;

var sourceNode = {
	SourceNode: SourceNode_1
};

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
var SourceMapGenerator$2 = sourceMapGenerator.SourceMapGenerator;
var SourceMapConsumer$1 = sourceMapConsumer.SourceMapConsumer;
var SourceNode$1 = sourceNode.SourceNode;

var sourceMap = {
	SourceMapGenerator: SourceMapGenerator$2,
	SourceMapConsumer: SourceMapConsumer$1,
	SourceNode: SourceNode$1
};

var sourceMap$1 = /*#__PURE__*/Object.freeze({
  default: sourceMap,
  __moduleExports: sourceMap,
  SourceMapGenerator: SourceMapGenerator$2,
  SourceMapConsumer: SourceMapConsumer$1,
  SourceNode: SourceNode$1
});

export { CDN_ESM_URL, CDN_SYSTEM_URL, RuntimeModuleNamespace, Runtime };
//# sourceMappingURL=runtime.esm.js.map
