export function createTranspiler({ createRuntime, typescriptVersion, }) {
    const transpilerRuntime = createRuntime({
        runtimeHost: {
            async getFileContents(pathname) {
                if (pathname === 'package.json') {
                    return JSON.stringify({
                        dependencies: {
                            typescript: typescriptVersion,
                        },
                    });
                }
            },
        },
        transpiler: false,
    });
    let typescriptPromise;
    return {
        async translate(load) {
            if (!typescriptPromise) {
                typescriptPromise = transpilerRuntime.import('typescript');
            }
            const typescript = (await typescriptPromise).default;
            const transpiled = typescript.transpileModule(load.source, {
                compilerOptions: {
                    allowSyntheticDefaultImports: true,
                    esModuleInterop: true,
                    module: typescript.ModuleKind.System,
                },
            });
            return transpiled.outputText;
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWNBLE1BQU0sMkJBQTJCLEVBQzdCLGFBQWEsRUFDYixpQkFBaUIsR0FDQTtJQUNqQixNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQztRQUNwQyxXQUFXLEVBQUU7WUFDVCxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQVE7Z0JBQzFCLElBQUksUUFBUSxLQUFLLGNBQWMsRUFBRTtvQkFDN0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO3dCQUNsQixZQUFZLEVBQUU7NEJBQ1YsVUFBVSxFQUFFLGlCQUFpQjt5QkFDaEM7cUJBQ0osQ0FBQyxDQUFDO2lCQUNOO1lBQ0wsQ0FBQztTQUNKO1FBQ0QsVUFBVSxFQUFFLEtBQUs7S0FDcEIsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxpQkFBOEQsQ0FBQztJQUVuRSxPQUFPO1FBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJO1lBQ2hCLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDcEIsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQzlEO1lBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFNLGlCQUFpQixDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3JELE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDdkQsZUFBZSxFQUFFO29CQUNiLDRCQUE0QixFQUFFLElBQUk7b0JBQ2xDLGVBQWUsRUFBRSxJQUFJO29CQUNyQixNQUFNLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNO2lCQUN2QzthQUNKLENBQUMsQ0FBQztZQUVILE9BQU8sVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUNqQyxDQUFDO0tBQ0osQ0FBQztBQUNOLENBQUMifQ==