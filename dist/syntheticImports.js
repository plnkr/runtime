export function addSyntheticDefaultExports(esModule) {
    var module;
    // only default export -> copy named exports down
    if ('default' in esModule &&
        (Object.keys(esModule).length === 1 ||
            esModule[Symbol.toStringTag].toLowerCase() === 'module')) {
        module =
            typeof esModule.default === 'function'
                ? esModule.default
                : Object.create(null);
        // etc should aim to replicate Module object properties
        Object.defineProperty(module, Symbol.toStringTag, {
            value: 'module',
        });
        module.default = esModule.default;
        var propertyDescriptors = Object.getOwnPropertyDescriptors(esModule.default);
        for (var namedExport in propertyDescriptors) {
            if (namedExport === 'default') {
                continue;
            }
            Object.defineProperty(module, namedExport, propertyDescriptors[namedExport]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGhldGljSW1wb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zeW50aGV0aWNJbXBvcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0scUNBQXFDLFFBRzFDO0lBQ0csSUFBSSxNQUFNLENBQUM7SUFFWCxpREFBaUQ7SUFDakQsSUFDSSxTQUFTLElBQUksUUFBUTtRQUNyQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDL0IsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxRQUFRLENBQUMsRUFDOUQ7UUFDRSxNQUFNO1lBQ0YsT0FBTyxRQUFRLENBQUMsT0FBTyxLQUFLLFVBQVU7Z0JBQ2xDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTztnQkFDbEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFOUIsdURBQXVEO1FBQ3ZELE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUU7WUFDOUMsS0FBSyxFQUFFLFFBQVE7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBRWxDLElBQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLHlCQUF5QixDQUN4RCxRQUFRLENBQUMsT0FBTyxDQUNuQixDQUFDO1FBRUYsS0FBSyxJQUFNLFdBQVcsSUFBSSxtQkFBbUIsRUFBRTtZQUMzQyxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7Z0JBQzNCLFNBQVM7YUFDWjtZQUVELE1BQU0sQ0FBQyxjQUFjLENBQ2pCLE1BQU0sRUFDTixXQUFXLEVBQ1gsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQ25DLENBQUM7WUFFRiwrQ0FBK0M7WUFFL0MsK0JBQStCO1lBQy9CLGlDQUFpQztZQUNqQyx5Q0FBeUM7WUFDekMscUNBQXFDO1lBQ3JDLGVBQWU7U0FDbEI7S0FDSjtJQUVELElBQUksQ0FBQyxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsRUFBRTtRQUMxQixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDO0tBQzdCO0lBRUQsT0FBTyxNQUFNLElBQUksUUFBUSxDQUFDO0FBQzlCLENBQUMifQ==