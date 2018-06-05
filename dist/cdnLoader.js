import { supportsDynamicImport } from './featureDetection';
const ESM_CDN_URL = 'https://dev.jspm.io';
// const SYSTEM_CDN_URL = 'https://system-dev.jspm.io';
export const CDN_PREFIX = 'npm:';
// import { supportsDynamicImport } from './featureDetection';
function createEsmCdnLoader() {
    return {
        fetch() {
            return '';
        },
        instantiate(load) {
            const url = load.address.indexOf(CDN_PREFIX) !== 0
                ? load.address
                : `${ESM_CDN_URL}/${load.address.slice(CDN_PREFIX.length)}`;
            // @ts-ignore
            return import(url).then(esModule => {
                let module = esModule;
                // only default export -> copy named exports down
                if ('default' in module && Object.keys(module).length === 1) {
                    module = Object.create(null);
                    // etc should aim to replicate Module object properties
                    Object.defineProperty(module, Symbol.toStringTag, {
                        value: 'module',
                    });
                    module.default = esModule.default;
                    for (const namedExport of Object.keys(esModule.default)) {
                        if (namedExport === 'default') {
                            continue;
                        }
                        const value = esModule.default[namedExport];
                        module[namedExport] =
                            typeof value === 'function'
                                ? value.bind(esModule.default)
                                : value;
                    }
                }
                // this line shouldn't be necessary... let me post a SystemJS fix
                Object.defineProperty(module, '__esModule', {
                    value: true,
                });
                return module;
            });
        },
    };
}
function createSystemCdnLoader() {
    throw new Error('SystemJS-based cdn loader is not yet supported');
}
export function createCdnLoader() {
    return supportsDynamicImport()
        ? createEsmCdnLoader()
        : createSystemCdnLoader();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RuTG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NkbkxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUUzRCxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQztBQUMxQyx1REFBdUQ7QUFFdkQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQztBQUVqQyw4REFBOEQ7QUFFOUQ7SUFDSSxPQUFPO1FBQ0gsS0FBSztZQUNELE9BQU8sRUFBRSxDQUFDO1FBQ2QsQ0FBQztRQUVELFdBQVcsQ0FBQyxJQUFtQjtZQUMzQixNQUFNLEdBQUcsR0FDTCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO2dCQUNsQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU87Z0JBQ2QsQ0FBQyxDQUFDLEdBQUcsV0FBVyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBRXBFLGFBQWE7WUFDYixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQy9CLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQztnQkFFdEIsaURBQWlEO2dCQUNqRCxJQUFJLFNBQVMsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUN6RCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFFN0IsdURBQXVEO29CQUN2RCxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsV0FBVyxFQUFFO3dCQUM5QyxLQUFLLEVBQUUsUUFBUTtxQkFDbEIsQ0FBQyxDQUFDO29CQUVILE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztvQkFFbEMsS0FBSyxNQUFNLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTt3QkFDckQsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFOzRCQUMzQixTQUFTO3lCQUNaO3dCQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7d0JBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUM7NEJBQ2YsT0FBTyxLQUFLLEtBQUssVUFBVTtnQ0FDdkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQ0FDOUIsQ0FBQyxDQUFDLEtBQUssQ0FBQztxQkFDbkI7aUJBQ0o7Z0JBRUQsaUVBQWlFO2dCQUNqRSxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUU7b0JBQ3hDLEtBQUssRUFBRSxJQUFJO2lCQUNkLENBQUMsQ0FBQztnQkFFSCxPQUFPLE1BQU0sQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7S0FDSixDQUFDO0FBQ04sQ0FBQztBQUVEO0lBQ0ksTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO0FBQ3RFLENBQUM7QUFFRCxNQUFNO0lBQ0YsT0FBTyxxQkFBcUIsRUFBRTtRQUMxQixDQUFDLENBQUMsa0JBQWtCLEVBQUU7UUFDdEIsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUM7QUFDbEMsQ0FBQyJ9