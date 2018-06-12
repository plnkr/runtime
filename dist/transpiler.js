export function createTranspiler({ createRuntime, runtimeHost, typescriptVersion, }) {
    const transpilerRuntime = createRuntime({
        runtimeHost: {
            getFileContents(pathname) {
                const result = Promise.resolve(runtimeHost.getFileContents(pathname));
                if (pathname === 'package.json') {
                    return result
                        .then(packageJson => {
                        const json = JSON.parse(packageJson);
                        if (!json['devDependencies']) {
                            json['devDependencies'] = {};
                        }
                        if (!json['devDependencies']['typescript']) {
                            json['devDependencies']['typescript'] = typescriptVersion;
                        }
                        return JSON.stringify(json);
                    })
                        .catch(() => JSON.stringify({
                        dependencies: {
                            typescript: typescriptVersion,
                        },
                    }));
                }
                return result;
            },
        },
        transpiler: false,
    });
    let typescriptPromise;
    return {
        translate(load) {
            if (!typescriptPromise) {
                typescriptPromise = transpilerRuntime.import('typescript');
            }
            return typescriptPromise.then(typescript => {
                const transpiled = typescript.transpileModule(load.source, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWVBLE1BQU0sMkJBQTJCLEVBQzdCLGFBQWEsRUFDYixXQUFXLEVBQ1gsaUJBQWlCLEdBQ0E7SUFDakIsTUFBTSxpQkFBaUIsR0FBRyxhQUFhLENBQUM7UUFDcEMsV0FBVyxFQUFFO1lBQ1QsZUFBZSxDQUFDLFFBQVE7Z0JBQ3BCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQzFCLFdBQVcsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQ3hDLENBQUM7Z0JBRUYsSUFBSSxRQUFRLEtBQUssY0FBYyxFQUFFO29CQUM3QixPQUFPLE1BQU07eUJBQ1IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO3dCQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO3dCQUVyQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7NEJBQzFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt5QkFDaEM7d0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFOzRCQUN4QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FDbkIsWUFBWSxDQUNmLEdBQUcsaUJBQWlCLENBQUM7eUJBQ3pCO3dCQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEMsQ0FBQyxDQUFDO3lCQUNELEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FDUixJQUFJLENBQUMsU0FBUyxDQUFDO3dCQUNYLFlBQVksRUFBRTs0QkFDVixVQUFVLEVBQUUsaUJBQWlCO3lCQUNoQztxQkFDSixDQUFDLENBQ0wsQ0FBQztpQkFDVDtnQkFFRCxPQUFPLE1BQU0sQ0FBQztZQUNsQixDQUFDO1NBQ0o7UUFDRCxVQUFVLEVBQUUsS0FBSztLQUNwQixDQUFDLENBQUM7SUFDSCxJQUFJLGlCQUFpRCxDQUFDO0lBRXRELE9BQU87UUFDSCxTQUFTLENBQUMsSUFBSTtZQUNWLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDcEIsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQzlEO1lBRUQsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3ZDLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDdkQsZUFBZSxFQUFFO3dCQUNiLDRCQUE0QixFQUFFLElBQUk7d0JBQ2xDLGVBQWUsRUFBRSxJQUFJO3dCQUNyQixNQUFNLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNO3FCQUN2QztpQkFDSixDQUFDLENBQUM7Z0JBRUgsT0FBTyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQ2pDLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUNKLENBQUM7QUFDTixDQUFDIn0=