import * as tslib_1 from "tslib";
export function createTranspiler(_a) {
    var createRuntime = _a.createRuntime, runtimeHost = _a.runtimeHost, typescriptVersion = _a.typescriptVersion;
    var transpilerRuntime = createRuntime({
        runtimeHost: {
            getFileContents: function (pathname) {
                var result = Promise.resolve(runtimeHost.getFileContents(pathname));
                if (pathname === 'package.json') {
                    return result
                        .then(function (packageJson) {
                        var json = JSON.parse(packageJson);
                        if (!json['devDependencies']) {
                            json['devDependencies'] = {};
                        }
                        if (!json['devDependencies']['typescript']) {
                            json['devDependencies']['typescript'] = typescriptVersion;
                        }
                        return JSON.stringify(json);
                    })
                        .catch(function () {
                        return JSON.stringify({
                            dependencies: {
                                typescript: typescriptVersion,
                            },
                        });
                    });
                }
                return result;
            },
        },
        transpiler: false,
    });
    var typescriptPromise;
    return {
        translate: function (load) {
            if (!typescriptPromise) {
                typescriptPromise = transpilerRuntime.import('typescript');
            }
            var tsconfigPromise = transpilerRuntime
                .import('tsconfig.json')
                .catch(function () { return null; })
                .then(function (tsconfig) { return tsconfig || {}; });
            return Promise.all([typescriptPromise, tsconfigPromise]).then(function (_a) {
                var _b = tslib_1.__read(_a, 2), typescript = _b[0], tsconfig = _b[1];
                var transpiled = typescript.transpileModule(load.source, {
                    compilerOptions: tslib_1.__assign({}, (tsconfig.compilerOptions || {}), { allowSyntheticDefaultImports: true, esModuleInterop: true, module: typescript.ModuleKind.System }),
                });
                return transpiled.outputText;
            });
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFnQkEsTUFBTSwyQkFBMkIsRUFJWjtRQUhqQixnQ0FBYSxFQUNiLDRCQUFXLEVBQ1gsd0NBQWlCO0lBRWpCLElBQU0saUJBQWlCLEdBQUcsYUFBYSxDQUFDO1FBQ3BDLFdBQVcsRUFBRTtZQUNULGVBQWUsWUFBQyxRQUFRO2dCQUNwQixJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUMxQixXQUFXLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUN4QyxDQUFDO2dCQUVGLElBQUksUUFBUSxLQUFLLGNBQWMsRUFBRTtvQkFDN0IsT0FBTyxNQUFNO3lCQUNSLElBQUksQ0FBQyxVQUFBLFdBQVc7d0JBQ2IsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFFckMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFOzRCQUMxQixJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUM7eUJBQ2hDO3dCQUVELElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRTs0QkFDeEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQ25CLFlBQVksQ0FDZixHQUFHLGlCQUFpQixDQUFDO3lCQUN6Qjt3QkFFRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2hDLENBQUMsQ0FBQzt5QkFDRCxLQUFLLENBQUM7d0JBQ0gsT0FBQSxJQUFJLENBQUMsU0FBUyxDQUFDOzRCQUNYLFlBQVksRUFBRTtnQ0FDVixVQUFVLEVBQUUsaUJBQWlCOzZCQUNoQzt5QkFDSixDQUFDO29CQUpGLENBSUUsQ0FDTCxDQUFDO2lCQUNUO2dCQUVELE9BQU8sTUFBTSxDQUFDO1lBQ2xCLENBQUM7U0FDSjtRQUNELFVBQVUsRUFBRSxLQUFLO0tBQ3BCLENBQUMsQ0FBQztJQUNILElBQUksaUJBQWlELENBQUM7SUFFdEQsT0FBTztRQUNILFNBQVMsWUFBQyxJQUFJO1lBQ1YsSUFBSSxDQUFDLGlCQUFpQixFQUFFO2dCQUNwQixpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDOUQ7WUFFRCxJQUFNLGVBQWUsR0FBRyxpQkFBaUI7aUJBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUM7aUJBQ3ZCLEtBQUssQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFKLENBQUksQ0FBQztpQkFDakIsSUFBSSxDQUFDLFVBQUEsUUFBUSxJQUFJLE9BQUEsUUFBUSxJQUFJLEVBQUUsRUFBZCxDQUFjLENBQUMsQ0FBQztZQUV0QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDekQsVUFBQyxFQUFzQjtvQkFBdEIsMEJBQXNCLEVBQXJCLGtCQUFVLEVBQUUsZ0JBQVE7Z0JBQ2xCLElBQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDdkQsZUFBZSx1QkFDUixDQUFDLFFBQVEsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLElBQ25DLDRCQUE0QixFQUFFLElBQUksRUFDbEMsZUFBZSxFQUFFLElBQUksRUFDckIsTUFBTSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUN2QztpQkFDSixDQUFDLENBQUM7Z0JBRUgsT0FBTyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQ2pDLENBQUMsQ0FDSixDQUFDO1FBQ04sQ0FBQztLQUNKLENBQUM7QUFDTixDQUFDIn0=