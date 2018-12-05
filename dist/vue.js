import * as tslib_1 from "tslib";
import { transpileLess } from './css';
var nextVueId = 0;
export function transpileVue(runtime, key, code) {
    var componentCompilerUtilsResult = runtime.import('@vue/component-compiler-utils');
    var sourceMapResult = (runtime.import('source-map'));
    var templateCompilerResult = (runtime.import('vue-template-compiler'));
    return Promise.all([
        templateCompilerResult,
        componentCompilerUtilsResult,
        sourceMapResult,
    ]).then(function (_a) {
        var _b = tslib_1.__read(_a, 3), vueTemplateCompiler = _b[0], vueComponentCompilerUtils = _b[1], _ = _b[2];
        var id = nextVueId++;
        var vueId = "data-v-" + id;
        var dependencies = [];
        var options = {};
        var setters = [];
        var executeBody = '$__export("default", options);';
        var registerBody = "var options = { _scopeId: \"" + vueId + "\" };";
        var parsedComponent = vueComponentCompilerUtils.parse({
            source: code,
            filename: key,
            compiler: vueTemplateCompiler,
        });
        if (parsedComponent.script) {
            var dependencyUrl = key + "." + id + ".js";
            runtime.inject(dependencyUrl, {
                source: parsedComponent.script.content,
                sourceMap: (parsedComponent.script.map),
            });
            runtime.registerDependency(key, dependencyUrl);
            dependencies.push(dependencyUrl);
            setters.push(function (importedScript) {
                if (Object.keys(importedScript).length <= 1 &&
                    importedScript.default) {
                    importedScript = importedScript.default;
                }
                for (var key in importedScript) {
                    options[key] = importedScript[key];
                }
            });
        }
        if (parsedComponent.template) {
            var compiledTemplate = vueComponentCompilerUtils.compileTemplate({
                compiler: vueTemplateCompiler,
                filename: key,
                isProduction: true,
                source: parsedComponent.template.content,
            });
            var dependencyUrl = key + "." + id + ".html.js";
            var source = "System.register([], " + templateRegisterTemplateParts[0] + compiledTemplate.code + templateRegisterTemplateParts[1] + ");";
            runtime.inject(dependencyUrl, {
                source: source,
            });
            runtime.registerDependency(key, dependencyUrl);
            dependencies.push(dependencyUrl);
            setters.push(function (importedTemplate) {
                options.render = importedTemplate.render;
                options.staticRenderFns = importedTemplate.staticRenderFns;
            });
        }
        var compiledStyleResults = parsedComponent.styles.map(function (style, idx) {
            var dependencyUrl = key + "." + id + "." + idx + ".css";
            var preprocessStyleResult = preprocessStyle(runtime, key, style);
            return Promise.resolve(preprocessStyleResult).then(function (preprocessedStyleRecord) {
                return vueComponentCompilerUtils
                    .compileStyleAsync({
                    filename: key,
                    id: vueId,
                    map: preprocessedStyleRecord.sourceMap,
                    scoped: !!style.scoped,
                    source: preprocessedStyleRecord.source,
                })
                    .then(function (compiledStyle) {
                    runtime.inject(dependencyUrl, {
                        source: compiledStyle.code,
                        sourceMap: compiledStyle.map,
                    });
                    runtime.registerDependency(key, dependencyUrl);
                    dependencies.push(dependencyUrl);
                    setters.push(function () { });
                });
            });
        });
        var stylesResult = ((compiledStyleResults.length
            ? Promise.all(compiledStyleResults)
            : Promise.resolve()));
        return stylesResult.then(function () {
            var constructedScript = "System.register(" + JSON.stringify(dependencies) + ", function ($__export) {\n                " + registerBody + "\n                return {\n                    setters: [" + setters
                .map(function (setter) { return setter.toString(); })
                .join(',\n') + "],\n                    execute: function() {\n                        " + executeBody + "\n                    },\n                };\u00DF\n            });";
            return {
                source: constructedScript,
            };
        });
    });
}
function preprocessStyle(runtime, key, style) {
    var record = {
        source: style.content,
        sourceMap: style.map,
    };
    if (style.lang === 'less') {
        return transpileLess(runtime, key, record);
    }
    return record;
}
var templateRegisterTemplate = function ($__export) {
    return {
        execute: function () {
            var render, staticRenderFns;
            $__export({ render: render, staticRenderFns: staticRenderFns });
        },
    };
};
var templateRegisterTemplateParts = templateRegisterTemplate
    .toString()
    .split('var render, staticRenderFns;');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Z1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBS0EsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQWF0QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFFbEIsTUFBTSx1QkFDRixPQUFnQixFQUNoQixHQUFXLEVBQ1gsSUFBWTtJQUVaLElBQU0sNEJBQTRCLEdBRWpDLE9BQU8sQ0FBQyxNQUFNLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUNqRCxJQUFNLGVBQWUsR0FBOEIsQ0FDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FDL0IsQ0FBQztJQUNGLElBQU0sc0JBQXNCLEdBQXdDLENBQ2hFLE9BQU8sQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FDMUMsQ0FBQztJQUVGLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUNmLHNCQUFzQjtRQUN0Qiw0QkFBNEI7UUFDNUIsZUFBZTtLQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsRUFBbUQ7WUFBbkQsMEJBQW1ELEVBQWxELDJCQUFtQixFQUFFLGlDQUF5QixFQUFFLFNBQUM7UUFDdkQsSUFBTSxFQUFFLEdBQUcsU0FBUyxFQUFFLENBQUM7UUFDdkIsSUFBTSxLQUFLLEdBQUcsWUFBVSxFQUFJLENBQUM7UUFDN0IsSUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFDO1FBQ2xDLElBQU0sT0FBTyxHQUFlLEVBQUUsQ0FBQztRQUMvQixJQUFNLE9BQU8sR0FBZSxFQUFFLENBQUM7UUFFL0IsSUFBSSxXQUFXLEdBQUcsZ0NBQWdDLENBQUM7UUFDbkQsSUFBSSxZQUFZLEdBQUcsaUNBQThCLEtBQUssVUFBTSxDQUFDO1FBRTdELElBQU0sZUFBZSxHQUFHLHlCQUF5QixDQUFDLEtBQUssQ0FBQztZQUNwRCxNQUFNLEVBQUUsSUFBSTtZQUNaLFFBQVEsRUFBRSxHQUFHO1lBQ2IsUUFBUSxFQUFFLG1CQUFtQjtTQUNoQyxDQUFDLENBQUM7UUFFSCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDeEIsSUFBTSxhQUFhLEdBQU0sR0FBRyxTQUFJLEVBQUUsUUFBSyxDQUFDO1lBRXhDLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFO2dCQUMxQixNQUFNLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPO2dCQUN0QyxTQUFTLEVBQTBCLENBQ3pCLGVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBSSxDQUNwQzthQUNKLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFL0MsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVMsY0FBbUI7Z0JBQ3JDLElBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQztvQkFDdkMsY0FBYyxDQUFDLE9BQU8sRUFDeEI7b0JBQ0UsY0FBYyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUM7aUJBQzNDO2dCQUVELEtBQUssSUFBSSxHQUFHLElBQUksY0FBYyxFQUFFO29CQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUN0QztZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxJQUFJLGVBQWUsQ0FBQyxRQUFRLEVBQUU7WUFDMUIsSUFBTSxnQkFBZ0IsR0FBRyx5QkFBeUIsQ0FBQyxlQUFlLENBQUM7Z0JBQy9ELFFBQVEsRUFBRSxtQkFBbUI7Z0JBQzdCLFFBQVEsRUFBRSxHQUFHO2dCQUNiLFlBQVksRUFBRSxJQUFJO2dCQUNsQixNQUFNLEVBQUUsZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPO2FBQzNDLENBQUMsQ0FBQztZQUNILElBQU0sYUFBYSxHQUFNLEdBQUcsU0FBSSxFQUFFLGFBQVUsQ0FBQztZQUM3QyxJQUFNLE1BQU0sR0FBRyx5QkFDWCw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsR0FDakMsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxPQUFJLENBQUM7WUFFaEUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUU7Z0JBQzFCLE1BQU0sUUFBQTthQUNULENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFL0MsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVMsZ0JBQXFCO2dCQUN2QyxPQUFPLENBQUMsTUFBTSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztnQkFDekMsT0FBTyxDQUFDLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7WUFDL0QsQ0FBQyxDQUFDLENBQUM7U0FDTjtRQUVELElBQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ25ELFVBQUMsS0FBSyxFQUFFLEdBQUc7WUFDUCxJQUFNLGFBQWEsR0FBTSxHQUFHLFNBQUksRUFBRSxTQUFJLEdBQUcsU0FBTSxDQUFDO1lBQ2hELElBQU0scUJBQXFCLEdBQUcsZUFBZSxDQUN6QyxPQUFPLEVBQ1AsR0FBRyxFQUNILEtBQUssQ0FDUixDQUFDO1lBRUYsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsSUFBSSxDQUM5QyxVQUFBLHVCQUF1QjtnQkFDbkIsT0FBTyx5QkFBeUI7cUJBQzNCLGlCQUFpQixDQUFDO29CQUNmLFFBQVEsRUFBRSxHQUFHO29CQUNiLEVBQUUsRUFBRSxLQUFLO29CQUNULEdBQUcsRUFBRSx1QkFBdUIsQ0FBQyxTQUFTO29CQUN0QyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNO29CQUN0QixNQUFNLEVBQUUsdUJBQXVCLENBQUMsTUFBTTtpQkFDekMsQ0FBQztxQkFDRCxJQUFJLENBQUMsVUFBQSxhQUFhO29CQUNmLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFO3dCQUMxQixNQUFNLEVBQUUsYUFBYSxDQUFDLElBQUk7d0JBQzFCLFNBQVMsRUFBRSxhQUFhLENBQUMsR0FBRztxQkFDL0IsQ0FBQyxDQUFDO29CQUNILE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBRS9DLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBWSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDLENBQ0osQ0FBQztRQUNOLENBQUMsQ0FDSixDQUFDO1FBRUYsSUFBTSxZQUFZLEdBQWlCLENBQy9CLENBQUMsb0JBQW9CLENBQUMsTUFBTTtZQUN4QixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQztZQUNuQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQzNCLENBQUM7UUFFRixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDckIsSUFBTSxpQkFBaUIsR0FBRyxxQkFBbUIsSUFBSSxDQUFDLFNBQVMsQ0FDdkQsWUFBWSxDQUNmLGtEQUNLLFlBQVksa0VBRUUsT0FBTztpQkFDZCxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQWpCLENBQWlCLENBQUM7aUJBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsK0VBRVYsV0FBVyx3RUFHckIsQ0FBQztZQUVMLE9BQU87Z0JBQ0gsTUFBTSxFQUFFLGlCQUFpQjthQUM1QixDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFFRCx5QkFDSSxPQUFnQixFQUNoQixHQUFXLEVBQ1gsS0FBeUM7SUFFekMsSUFBTSxNQUFNLEdBQXFCO1FBQzdCLE1BQU0sRUFBRSxLQUFLLENBQUMsT0FBTztRQUNyQixTQUFTLEVBQU8sS0FBSyxDQUFDLEdBQUc7S0FDNUIsQ0FBQztJQUVGLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7UUFDdkIsT0FBTyxhQUFhLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUM5QztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxJQUFNLHdCQUF3QixHQUFHLFVBQVMsU0FBeUI7SUFDL0QsT0FBTztRQUNILE9BQU8sRUFBRTtZQUNMLElBQUksTUFBTSxFQUFFLGVBQWUsQ0FBQztZQUU1QixTQUFTLENBQUMsRUFBRSxNQUFNLFFBQUEsRUFBRSxlQUFlLGlCQUFBLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLENBQUM7S0FDSixDQUFDO0FBQ04sQ0FBQyxDQUFDO0FBQ0YsSUFBTSw2QkFBNkIsR0FBRyx3QkFBd0I7S0FDekQsUUFBUSxFQUFFO0tBQ1YsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUMifQ==