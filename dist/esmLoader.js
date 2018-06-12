// import { supportsDynamicImport } from './featureDetection';
export function createEsmCdnLoader() {
    return {
        fetch() {
            return '';
        },
        instantiate(load) {
            return import(load.address).then(esModule => addSyntheticDefaultExports(esModule));
        },
    };
}
export function addSyntheticDefaultExports(esModule) {
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
    return module;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtTG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2VzbUxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSw4REFBOEQ7QUFFOUQsTUFBTTtJQUNGLE9BQU87UUFDSCxLQUFLO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsV0FBVyxDQUFDLElBQW1CO1lBQzNCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FDeEMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQ3ZDLENBQUM7UUFDTixDQUFDO0tBQ0osQ0FBQztBQUNOLENBQUM7QUFFRCxNQUFNLHFDQUFxQyxRQUUxQztJQUNHLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQztJQUV0QixpREFBaUQ7SUFDakQsSUFBSSxTQUFTLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN6RCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3Qix1REFBdUQ7UUFDdkQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVcsRUFBRTtZQUM5QyxLQUFLLEVBQUUsUUFBUTtTQUNsQixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFFbEMsS0FBSyxNQUFNLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNyRCxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7Z0JBQzNCLFNBQVM7YUFDWjtZQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztnQkFDZixPQUFPLEtBQUssS0FBSyxVQUFVO29CQUN2QixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUM5QixDQUFDLENBQUMsS0FBSyxDQUFDO1NBQ25CO0tBQ0o7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDIn0=