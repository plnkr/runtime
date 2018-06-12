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
            return typescriptPromise.then(function (typescript) {
                var transpiled = typescript.transpileModule(load.source, {
                    compilerOptions: {
                        allowSyntheticDefaultImports: true,
                        esModuleInterop: true,
                        module: typescript.ModuleKind.System,
                    },
                });
                return transpiled.outputText;
            });
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWVBLE1BQU0sMkJBQTJCLEVBSVo7UUFIakIsZ0NBQWEsRUFDYiw0QkFBVyxFQUNYLHdDQUFpQjtJQUVqQixJQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQztRQUNwQyxXQUFXLEVBQUU7WUFDVCxlQUFlLFlBQUMsUUFBUTtnQkFDcEIsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FDMUIsV0FBVyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FDeEMsQ0FBQztnQkFFRixJQUFJLFFBQVEsS0FBSyxjQUFjLEVBQUU7b0JBQzdCLE9BQU8sTUFBTTt5QkFDUixJQUFJLENBQUMsVUFBQSxXQUFXO3dCQUNiLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7d0JBRXJDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRTs0QkFDMUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDO3lCQUNoQzt3QkFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUU7NEJBQ3hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUNuQixZQUFZLENBQ2YsR0FBRyxpQkFBaUIsQ0FBQzt5QkFDekI7d0JBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNoQyxDQUFDLENBQUM7eUJBQ0QsS0FBSyxDQUFDO3dCQUNILE9BQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQzs0QkFDWCxZQUFZLEVBQUU7Z0NBQ1YsVUFBVSxFQUFFLGlCQUFpQjs2QkFDaEM7eUJBQ0osQ0FBQztvQkFKRixDQUlFLENBQ0wsQ0FBQztpQkFDVDtnQkFFRCxPQUFPLE1BQU0sQ0FBQztZQUNsQixDQUFDO1NBQ0o7UUFDRCxVQUFVLEVBQUUsS0FBSztLQUNwQixDQUFDLENBQUM7SUFDSCxJQUFJLGlCQUFpRCxDQUFDO0lBRXRELE9BQU87UUFDSCxTQUFTLFlBQUMsSUFBSTtZQUNWLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDcEIsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQzlEO1lBRUQsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBQSxVQUFVO2dCQUNwQyxJQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ3ZELGVBQWUsRUFBRTt3QkFDYiw0QkFBNEIsRUFBRSxJQUFJO3dCQUNsQyxlQUFlLEVBQUUsSUFBSTt3QkFDckIsTUFBTSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTTtxQkFDdkM7aUJBQ0osQ0FBQyxDQUFDO2dCQUVILE9BQU8sVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUNqQyxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7S0FDSixDQUFDO0FBQ04sQ0FBQyJ9