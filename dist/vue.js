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
        var id = "data-v-" + nextVueId++;
        var dependencies = [];
        var options = {};
        var setters = [];
        var executeBody = '$__export("default", options);';
        var registerBody = "var options = { _scopeId: \"" + id + "\" };";
        var parsedComponent = vueComponentCompilerUtils.parse({
            source: code,
            filename: key,
            compiler: vueTemplateCompiler,
        });
        if (parsedComponent.script) {
            var dependencyUrl = key + ".js";
            runtime.inject(dependencyUrl, {
                source: parsedComponent.script.content,
                sourceMap: (parsedComponent.script.map),
            });
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
            var dependencyUrl = key + ".html.js";
            var source = "System.register([], " + templateRegisterTemplateParts[0] + compiledTemplate.code + templateRegisterTemplateParts[1] + ");";
            runtime.inject(dependencyUrl, {
                source: source,
            });
            dependencies.push(dependencyUrl);
            setters.push(function (importedTemplate) {
                options.render = importedTemplate.render;
                options.staticRenderFns = importedTemplate.staticRenderFns;
            });
        }
        var compiledStyleResults = parsedComponent.styles.map(function (style, idx) {
            var dependencyUrl = key + "." + idx + ".css";
            var preprocessStyleResult = preprocessStyle(runtime, key, style);
            return Promise.resolve(preprocessStyleResult).then(function (preprocessedStyleRecord) {
                return vueComponentCompilerUtils
                    .compileStyleAsync({
                    filename: key,
                    id: id,
                    map: preprocessedStyleRecord.sourceMap,
                    scoped: !!style.scoped,
                    source: preprocessedStyleRecord.source,
                })
                    .then(function (compiledStyle) {
                    runtime.inject(dependencyUrl, {
                        source: compiledStyle.code,
                        sourceMap: compiledStyle.map,
                    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Z1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBS0EsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQWF0QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFFbEIsTUFBTSx1QkFDRixPQUFnQixFQUNoQixHQUFXLEVBQ1gsSUFBWTtJQUVaLElBQU0sNEJBQTRCLEdBRWpDLE9BQU8sQ0FBQyxNQUFNLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUNqRCxJQUFNLGVBQWUsR0FBOEIsQ0FDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FDL0IsQ0FBQztJQUNGLElBQU0sc0JBQXNCLEdBQXdDLENBQ2hFLE9BQU8sQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FDMUMsQ0FBQztJQUVGLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUNmLHNCQUFzQjtRQUN0Qiw0QkFBNEI7UUFDNUIsZUFBZTtLQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsRUFBbUQ7WUFBbkQsMEJBQW1ELEVBQWxELDJCQUFtQixFQUFFLGlDQUF5QixFQUFFLFNBQUM7UUFDdkQsSUFBTSxFQUFFLEdBQUcsWUFBVSxTQUFTLEVBQUksQ0FBQztRQUNuQyxJQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7UUFDbEMsSUFBTSxPQUFPLEdBQWUsRUFBRSxDQUFDO1FBQy9CLElBQU0sT0FBTyxHQUFlLEVBQUUsQ0FBQztRQUUvQixJQUFJLFdBQVcsR0FBRyxnQ0FBZ0MsQ0FBQztRQUNuRCxJQUFJLFlBQVksR0FBRyxpQ0FBOEIsRUFBRSxVQUFNLENBQUM7UUFFMUQsSUFBTSxlQUFlLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDO1lBQ3BELE1BQU0sRUFBRSxJQUFJO1lBQ1osUUFBUSxFQUFFLEdBQUc7WUFDYixRQUFRLEVBQUUsbUJBQW1CO1NBQ2hDLENBQUMsQ0FBQztRQUVI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