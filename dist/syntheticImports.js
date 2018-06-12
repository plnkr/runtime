import * as tslib_1 from "tslib";
export function addSyntheticDefaultExports(esModule) {
    var module = esModule;
    // only default export -> copy named exports down
    if ('default' in module && Object.keys(module).length === 1) {
        module = Object.create(null);
        // etc should aim to replicate Module object properties
        Object.defineProperty(module, Symbol.toStringTag, {
            value: 'module',
        });
        module.default = esModule.default;
        try {
            for (var _a = tslib_1.__values(Object.keys(esModule.default)), _b = _a.next(); !_b.done; _b = _a.next()) {
                var namedExport = _b.value;
                if (namedExport === 'default') {
                    continue;
                }
                var value = esModule.default[namedExport];
                module[namedExport] =
                    typeof value === 'function'
                        ? value.bind(esModule.default)
                        : value;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return module;
    var e_1, _c;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGhldGljSW1wb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zeW50aGV0aWNJbXBvcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFNLHFDQUFxQyxRQUUxQztJQUNHLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQztJQUV0QixpREFBaUQ7SUFDakQsSUFBSSxTQUFTLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN6RCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3Qix1REFBdUQ7UUFDdkQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVcsRUFBRTtZQUM5QyxLQUFLLEVBQUUsUUFBUTtTQUNsQixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7O1lBRWxDLEtBQTBCLElBQUEsS0FBQSxpQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQSxnQkFBQTtnQkFBbEQsSUFBTSxXQUFXLFdBQUE7Z0JBQ2xCLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtvQkFDM0IsU0FBUztpQkFDWjtnQkFFRCxJQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUU1QyxNQUFNLENBQUMsV0FBVyxDQUFDO29CQUNmLE9BQU8sS0FBSyxLQUFLLFVBQVU7d0JBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7d0JBQzlCLENBQUMsQ0FBQyxLQUFLLENBQUM7YUFDbkI7Ozs7Ozs7OztLQUNKO0lBRUQsT0FBTyxNQUFNLENBQUM7O0FBQ2xCLENBQUMifQ==