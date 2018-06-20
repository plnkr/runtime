import * as tslib_1 from "tslib";
export function createTranspiler(_a) {
    // const transpilerRuntime = createRuntime({
    //     defaultDependencies: {
    //         typescript: typescriptVersion,
    //     },
    //     runtimeHost,
    //     transpiler: false,
    // });
    var runtime = _a.runtime;
    return {
        translate: function (load) {
            var typescriptPromise = runtime.import('typescript');
            var tsconfigPromise = runtime
                .import('tsconfig.json')
                .catch(function () { return null; })
                .then(function (tsconfig) { return tsconfig || {}; });
            return Promise.all([typescriptPromise, tsconfigPromise]).then(function (_a) {
                var _b = tslib_1.__read(_a, 2), typescript = _b[0], tsconfig = _b[1];
                var transpiled = typescript.transpileModule(load.source, {
                    compilerOptions: tslib_1.__assign({ jsx: typescript.JsxEmit.React }, (tsconfig.compilerOptions || {}), { allowSyntheticDefaultImports: true, esModuleInterop: true, module: typescript.ModuleKind.System }),
                });
                return transpiled.outputText;
            });
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFpQkEsTUFBTSwyQkFBMkIsRUFFWjtJQUNqQiw0Q0FBNEM7SUFDNUMsNkJBQTZCO0lBQzdCLHlDQUF5QztJQUN6QyxTQUFTO0lBQ1QsbUJBQW1CO0lBQ25CLHlCQUF5QjtJQUN6QixNQUFNO1FBUk4sb0JBQU87SUFVUCxPQUFPO1FBQ0gsU0FBUyxZQUFDLElBQUk7WUFDVixJQUFNLGlCQUFpQixHQUVuQixPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2pDLElBQU0sZUFBZSxHQUFHLE9BQU87aUJBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQUM7aUJBQ3ZCLEtBQUssQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFKLENBQUksQ0FBQztpQkFDakIsSUFBSSxDQUFDLFVBQUEsUUFBUSxJQUFJLE9BQUEsUUFBUSxJQUFJLEVBQUUsRUFBZCxDQUFjLENBQUMsQ0FBQztZQUV0QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDekQsVUFBQyxFQUFzQjtvQkFBdEIsMEJBQXNCLEVBQXJCLGtCQUFVLEVBQUUsZ0JBQVE7Z0JBQ2xCLElBQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDdkQsZUFBZSxxQkFDWCxHQUFHLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQzFCLENBQUMsUUFBUSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUMsSUFDbkMsNEJBQTRCLEVBQUUsSUFBSSxFQUNsQyxlQUFlLEVBQUUsSUFBSSxFQUNyQixNQUFNLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQ3ZDO2lCQUNKLENBQUMsQ0FBQztnQkFFSCxPQUFPLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDakMsQ0FBQyxDQUNKLENBQUM7UUFDTixDQUFDO0tBQ0osQ0FBQztBQUNOLENBQUMifQ==