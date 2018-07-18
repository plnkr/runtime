# `@plnkr/runtime`

No webpack, no parcel, no rollup, no npm, no friction. Just your code and your imagination.

A browser-native tool for running modern javascript code, using npm dependencies without any tooling. Supports hot module reloading and css / less imports (more to come).

This is not for production, this is for experimentation without boilerplate overload or for use in niche developer tools like [Plunker](https://next.plnkr.co/edit). Everything is loaded on the fly and, of course, this will impose certain performance limitations.

## Usage

To get a hold of an instance of this module, all you need to do is:

Using the amazing [jspm.io](https://jspm.io) cdn:

```js
import('https://dev.jspm.io/@plnkr/runtime')
    .then(esModule => esModule.default)
    .then(PlnkrRuntime => {
        // Let your imagination go wild
    });
```

or using a popular cdn that fronts npm releases like [unpkg](https://unpkg.com):

```html
<script src="https://unpkg.com/@plnkr/runtime"></script>
<script>
    const PlnkrRuntime = window.PlnkrRuntime;
    // Get weird
</script>
```

## Example

This example demonstrates an example where we define a custom [react](https://www.npmjs.com/package/react) `Component`, pull this into another file and render it to a string using [react-dom](https://www.npmjs.com/package/react-dom).

> _Note: No npm, no webpack, no parcel, no configuration, no friction. Just code and your imagination._

```js
// We define a mock 'host' filesystem that represents the project we will run
const files = {
    'package.json': JSON.stringify({
        dependencies: {
            react: '16.x',
            'react-dom': '16.x',
        },
    }),
    'index.js': `
        import React from 'react';
        import { renderToString } from 'react-dom/server';

        import Hello from './Hello';

        export const markup = renderToString(<Hello name="World"></Hello>);
    `,
    'Hello.js': `
        import React, { Component } from 'react';

        export default class Hello extends Component {
            render() {
                return <h1>Hello {this.props.name}</h1>;
            }
        }
    `,
};
// Next, we define a host that implements the RuntimeHost interface and resolves files from our mock filesystem
const host = {
    getCanonicalPath(path) {
        if (files[path]) return path;
        if (files[`${path}.js`]) return `${path}.js`;
        return Promise.reject(new Error(`File not found ${path}`));
    },
    getFileContents(canonicalPath) {
        return files[canonicalPath];
    }
};
// Now that we have a host, we can create a runtime instance
const runtime = new PlnkrRuntime.Runtime({ host });

// Now we run our example code that will pull in react and react-dom, will transpile our custom code and will
// then execute it in a context where bare modules are resolved for us.
const { markup } = await runtime.import('./index.js');
```

## API

### <a name="Runtime()" /> `new PlnkrRuntime.Runtime({ host })`

Creates a new `Runtime` instance where:

-   **host** is an object that implements the [RuntimeHost](#RuntimeHost) interface.

#### <a name="runtime.import()" /> `runtime.import(key: string, parentKey?: string): Promise<ModuleInstance>`

Import and run the the code from the canonical url determined by running [`runtime.resolve(key, parentKey)`](#runtime.resolve()).

Returns a `Promise` that will resolve to the module instance.

#### <a name="runtime.invalidate()" /> `runtime.invalidate(...keys: string[]): Promise<void>`

Invalidate the module instances, traversing up to all dependent modules and invalidating those as well where:

-   **`keys`** is one or more string arguments whose [`resolved`](#runtime.resolve()) paths will be invalidated.

Returns a `Promise` that will resolve when all requested modules and their dependents have been invalidated.

#### <a name="runtime.resolve()" /> `runtime.resolve(key: string, parentKey?: string): Promise<string>`

Resolve absolute and relative paths and urls as well as bare module specifiers to their canonical url where:

-   **`key`** is a pointer to the file whose code should be imported and executed. This could point to different things:
    -   `./relative/path` in which case the Runtime will attempt to resolve this to a canonical url via the [host.getCanonicalPath](#RuntimeHost.getCanonicalPath()) function. If that function is not present, the canonical url will be assumed to be the `key`.
    -   `npm-module` in which case the Runtime will attempt to resolve the bare module version by attempting to load `./package.json` and find its specifier in the `dependencies` or `devDependencies` mappings. If `./package.json` is absent or no specifier could be resolved, the version will be assumed to be the `latest` tag.
-   **`parentKey`** is an optional url relative to which the `key` will be resolved. For example a `key` of `./foo` and `parentKey` of `./folder/parent` would resolve to `./folder/foo`.

Returns a `Promise` that will resolve to the resolved, canonical url.

### <a name="RuntimeHost" /> `RuntimeHost`

This is the interface that must be implemented by the `host` object passed to [`new PlnkrRuntime.Runtime({ host })`](Runtime()).

#### <a name="RuntimeHost.getCanonicalPath()" /> `RuntimeHost.getCanonicalPath?(key: string): string | PromiseLike<string>`

> **Optional**

Return the canonical path or a `Promise` that resolves for a given 'local' resource. A 'local' resource is one that is neither a bare module nor a url whose prefix doesn't match `document.baseURI`. This method should be implemented if you want to support importing relative files without their extensions and these can't be determined _a priori_.

#### <a name="RuntimeHost.getFileContents()" /> `RuntimeHost.getFileContents(key: string): string | PromiseLike<string>`

Return the contents of the file (or a `Promise` thereof) whose canonical path is `key`.

> Note: This interface will be called to resolve bare module versions with `package.json` as the `key`. If you want to control the versions of bare modules (npm modules), then a mock `package.json` can be returned here that defined the `dependencies` for the bare modules whose versions are important to you.

## Thank you

This project was made possible by:

-   All the hard work by the collaborators of [`es-module-loader`](https://github.com/ModuleLoader/es-module-loader).
-   [Guy Bedford](https://twitter.com/GuyBedford) and his [jspm](https://jspm.io) project and its 'magic' ES Module and `System.register` CDNs, `dev.jspm.io` and `system-dev.jspm.io`, respectively.
