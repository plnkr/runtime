import { addSyntheticDefaultExports } from './syntheticImports';
// import { supportsDynamicImport } from './featureDetection';
export function createEsmCdnLoader() {
    return {
        fetch: function () {
            return '';
        },
        instantiate: function (load) {
            return dynamicImport(load.address).then(function (esModule) {
                return addSyntheticDefaultExports(esModule);
            });
        },
    };
}
export var dynamicImport = (function () {
    try {
        return new Function('spec', 'return import(spec)');
    }
    catch (__) {
        return null;
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtTG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2VzbUxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVoRSw4REFBOEQ7QUFFOUQsTUFBTTtJQUNGLE9BQU87UUFDSCxLQUFLO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsV0FBVyxZQUFDLElBQW1CO1lBQzNCLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxRQUFRO2dCQUM1QyxPQUFBLDBCQUEwQixDQUFDLFFBQVEsQ0FBQztZQUFwQyxDQUFvQyxDQUN2QyxDQUFDO1FBQ04sQ0FBQztLQUNKLENBQUM7QUFDTixDQUFDO0FBSUQsTUFBTSxDQUFDLElBQU0sYUFBYSxHQUFrQixDQUFDO0lBQ3pDLElBQUk7UUFDQSxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0tBQ3REO0lBQUMsT0FBTyxFQUFFLEVBQUU7UUFDVCxPQUFPLElBQUksQ0FBQztLQUNmO0FBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQyJ9