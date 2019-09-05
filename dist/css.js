import * as tslib_1 from "tslib";
import escapeString from "js-string-escape";
function createRegisterFunction(node) {
    var queue = node.children.map(function (child, i) { return ({ parent: node, node: child, i: i }); });
    var _loop_1 = function () {
        var _a = queue.shift(), parent_1 = _a.parent, node_1 = _a.node, i = _a.i;
        if (typeof node_1 === "string") {
            parent_1.children[i] = escapeString(node_1);
            return "continue";
        }
        node_1.children.forEach(function (child, i) {
            return queue.push({ parent: node_1, node: child, i: i });
        });
    };
    while (queue.length) {
        _loop_1();
    }
    node.prepend("System.register([], " + registerTemplateParts[0] + "\"");
    node.add("\"" + registerTemplateParts[1] + ");");
    var result = node.toStringWithSourceMap();
    return {
        source: result.code,
        sourceMap: result.map.toJSON()
    };
}
export function transpileCssToSystemRegister(runtime, key, code) {
    if (key.endsWith(".less")) {
        return transpileLessToSystemRegister(runtime, key, code);
    }
    return import("source-map").then(function (sourceMap) {
        var node = new sourceMap.SourceNode(1, 0, key, code);
        return createRegisterFunction(node);
    });
}
function transpileLessToSystemRegister(runtime, key, codeOrRecord) {
    var sourceMapMappingsResult = runtime.resolve("source-map/lib/mappings.wasm");
    var sourceMapResult = (runtime.import("source-map"));
    var transpileLessResult = transpileLess(runtime, key, codeOrRecord);
    return Promise.all([
        sourceMapMappingsResult,
        sourceMapResult,
        transpileLessResult
    ]).then(function (_a) {
        var _b = tslib_1.__read(_a, 3), sourceMapMappingsUrl = _b[0], sourceMap = _b[1], transpiled = _b[2];
        sourceMap.SourceMapConsumer.initialize({
            "lib/mappings.wasm": sourceMapMappingsUrl
        });
        return sourceMap.SourceMapConsumer.with(transpiled.sourceMap, null, function (consumer) {
            var node = sourceMap.SourceNode.fromStringWithSourceMap(transpiled.source, consumer);
            return createRegisterFunction(node);
        });
    });
}
export function transpileLess(runtime, key, codeOrRecord) {
    var lessFactoryResult = runtime.import("less/lib/less");
    var lessAbstractFileManagerResult = (runtime.import("less/lib/less/environment/abstract-file-manager"));
    var sourceMapMappingsResult = runtime.resolve("source-map/lib/mappings.wasm");
    var sourceMapResult = (runtime.import("source-map"));
    return Promise.all([
        lessFactoryResult,
        lessAbstractFileManagerResult,
        sourceMapMappingsResult,
        sourceMapResult
    ]).then(function (_a) {
        var _b = tslib_1.__read(_a, 4), lessFactory = _b[0], AbstractFileManager = _b[1], sourceMapMappingsUrl = _b[2], sourceMap = _b[3];
        sourceMap.SourceMapConsumer.initialize({
            "lib/mappings.wasm": sourceMapMappingsUrl
        });
        var environment = {
            encodeBase64: btoa,
            getSourceMapGenerator: function () { return sourceMap.SourceMapGenerator; }
        };
        var fileManager = /** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.loadFile = function (filename, currentDirectory) {
                var contentsResult = runtime.host.getFileContents(currentDirectory + "/" + filename);
                return Promise.resolve(contentsResult).then(function (contents) { return ({
                    filename: filename,
                    contents: contents
                }); });
            };
            return class_1;
        }(AbstractFileManager));
        var less = lessFactory(environment, [fileManager]);
        var options = {
            filename: key,
            sourceMap: {
                outputSourceFiles: true
            }
        };
        var code = typeof codeOrRecord === "string" ? codeOrRecord : codeOrRecord.source;
        return less.render(code, options).then(function (renderOutput) {
            return {
                source: renderOutput.css,
                sourceMap: typeof renderOutput.map === "string"
                    ? JSON.parse(renderOutput.map)
                    : undefined
            };
        });
    });
}
var registerTemplate = "function($__export) {\n    var element;\n    var markup;\n\n    function __onAfterUnload(event) {\n        event.preventDefault();\n    }\n\n    function __onReplace(event) {\n        event.previousInstance.element.remove();\n    }\n\n    $__export('__onAfterUnload', __onAfterUnload);\n    $__export('__onReplace', __onReplace);\n\n    return {\n        execute: function() {\n            markup = '<CSS>';\n\n            $__export('markup', markup);\n\n            element = document.createElement('style');\n            element.type = 'text/css';\n            element.innerHTML = markup;\n\n            document.head.appendChild(element);\n\n            $__export('element', element);\n        },\n    };\n}";
var registerTemplateParts = registerTemplate.split(/'<CSS>'|"<CSS>"/);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Nzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxZQUFZLE1BQU0sa0JBQWtCLENBQUM7QUFNNUMsZ0NBQWdDLElBQTBCO0lBQ3hELElBQU0sS0FBSyxHQUlMLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUMsS0FBSyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxHQUFBLEVBQUUsQ0FBQyxFQUFsQyxDQUFrQyxDQUFDLENBQUM7O1FBR2xFLElBQUEsa0JBQW1DLEVBQWpDLG9CQUFNLEVBQUUsZ0JBQUksRUFBRSxRQUFDLENBQW1CO1FBRTFDLElBQUksT0FBTyxNQUFJLEtBQUssUUFBUSxFQUFFO1lBQzVCLFFBQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQVEsWUFBWSxDQUFDLE1BQUksQ0FBQyxDQUFDOztTQUU5QztRQUVELE1BQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFFLENBQUM7WUFDN0IsT0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBQSxFQUFFLENBQUM7UUFBNUMsQ0FBNEMsQ0FDN0MsQ0FBQztJQUNKLENBQUM7SUFYRCxPQUFPLEtBQUssQ0FBQyxNQUFNOztLQVdsQjtJQUVELElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXVCLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxPQUFHLENBQUMsQ0FBQztJQUNqRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLE9BQUksQ0FBQyxDQUFDO0lBRTNDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBRTVDLE9BQU87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