import { addSyntheticDefaultExports } from './syntheticImports';
// import { supportsDynamicImport } from './featureDetection';
export function createEsmCdnLoader() {
    return {
        fetch: function () {
            return '';
        },
        instantiate: function (load) {
            return import(load.address).then(function (esModule) {
                return addSyntheticDefaultExports(esModule);
            });
        },
    };
}
export var supportsDynamicImport = true;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtTG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2VzbUxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVoRSw4REFBOEQ7QUFFOUQsTUFBTTtJQUNGLE9BQU87UUFDSCxLQUFLO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsV0FBVyxZQUFDLElBQW1CO1lBQzNCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxRQUFRO2dCQUNyQyxPQUFBLDBCQUEwQixDQUFDLFFBQVEsQ0FBQztZQUFwQyxDQUFvQyxDQUN2QyxDQUFDO1FBQ04sQ0FBQztLQUNKLENBQUM7QUFDTixDQUFDO0FBRUQsTUFBTSxDQUFDLElBQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDIn0=