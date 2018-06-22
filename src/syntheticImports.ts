export function addSyntheticDefaultExports(esModule: {
    [key: string]: any;
    [Symbol.toStringTag]?: string;
}): { [key: string]: any } {
    let module;

    // only default export -> copy named exports down
    if (
        'default' in esModule &&
        (Object.keys(esModule).length === 1 ||
            esModule[Symbol.toStringTag].toLowerCase() === 'module')
    ) {
        module =
            typeof esModule.default === 'function'
                ? esModule.default
                : Object.create(null);

        // etc should aim to replicate Module object properties
        Object.defineProperty(module, Symbol.toStringTag, {
            value: 'module',
        });

        module.default = esModule.default;

        const propertyDescriptors = Object.getOwnPropertyDescriptors(
            esModule.default
        );

        for (const namedExport in propertyDescriptors) {
            if (namedExport === 'default') {
                continue;
            }

            Object.defineProperty(
                module,
                namedExport,
                propertyDescriptors[namedExport]
            );

            // const value = esModule.default[namedExport];

            // module[namedExport] = value;
            // typeof value === 'function' &&
            // value.prototype === Function.prototype
            //     ? value.bind(esModule.default)
            //     : value;
        }
    }

    if (!('default' in esModule)) {
        module = Object.assign(Object.create(null), esModule);
        module.default = esModule;
    }

    return module || esModule;
}
