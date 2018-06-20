export function addSyntheticDefaultExports(esModule) {
    var module;
    // only default export -> copy named exports down
    if ('default' in esModule && Object.keys(esModule).length === 1) {
        module = Object.create(null);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGhldGljSW1wb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zeW50aGV0aWNJbXBvcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0scUNBQXFDLFFBRTFDO0lBQ0csSUFBSSxNQUFNLENBQUM7SUFFWCxpREFBaUQ7SUFDakQsSUFBSSxTQUFTLElBQUksUUFBUSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUM3RCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3Qix1REFBdUQ7UUFDdkQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVcsRUFBRTtZQUM5QyxLQUFLLEVBQUUsUUFBUTtTQUNsQixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFFbEMsSUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMseUJBQXlCLENBQ3hELFFBQVEsQ0FBQyxPQUFPLENBQ25CLENBQUM7UUFFRixLQUFLLElBQU0sV0FBVyxJQUFJLG1CQUFtQixFQUFFO1lBQzNDLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtnQkFDM0IsU0FBUzthQUNaO1lBRUQsTUFBTSxDQUFDLGNBQWMsQ0FDakIsTUFBTSxFQUNOLFdBQVcsRUFDWCxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FDbkMsQ0FBQztZQUVGLCtDQUErQztZQUUvQywrQkFBK0I7WUFDL0IsaUNBQWlDO1lBQ2pDLHlDQUF5QztZQUN6QyxxQ0FBcUM7WUFDckMsZUFBZTtTQUNsQjtLQUNKO0lBRUQsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxFQUFFO1FBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7S0FDN0I7SUFFRCxPQUFPLE1BQU0sSUFBSSxRQUFRLENBQUM7QUFDOUIsQ0FBQyJ9