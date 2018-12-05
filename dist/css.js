import * as tslib_1 from "tslib";
import escapeString from 'js-string-escape';
function createRegisterFunction(node) {
    var queue = node.children.map(function (child, i) { return ({ parent: node, node: child, i: i }); });
    var _loop_1 = function () {
        var _a = queue.shift(), parent_1 = _a.parent, node_1 = _a.node, i = _a.i;
        if (typeof node_1 === 'string') {
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
        sourceMap: result.map.toJSON(),
    };
}
export function transpileCssToSystemRegister(runtime, key, code) {
    if (key.endsWith('.less')) {
        return transpileLessToSystemRegister(runtime, key, code);
    }
    return import('source-map').then(function (sourceMap) {
        var node = new sourceMap.SourceNode(1, 0, key, code);
        return createRegisterFunction(node);
    });
}
function transpileLessToSystemRegister(runtime, key, codeOrRecord) {
    var sourceMapMappingsResult = runtime.resolve('source-map/lib/mappings.wasm');
    var sourceMapResult = (runtime.import('source-map'));
    var transpileLessResult = transpileLess(runtime, key, codeOrRecord);
    return Promise.all([
        sourceMapMappingsResult,
        sourceMapResult,
        transpileLessResult,
    ]).then(function (_a) {
        var _b = tslib_1.__read(_a, 3), sourceMapMappingsUrl = _b[0], sourceMap = _b[1], transpiled = _b[2];
        sourceMap.SourceMapConsumer.initialize({
            'lib/mappings.wasm': sourceMapMappingsUrl,
        });
        return sourceMap.SourceMapConsumer.with(transpiled.sourceMap, null, function (consumer) {
            var node = sourceMap.SourceNode.fromStringWithSourceMap(transpiled.source, consumer);
            return createRegisterFunction(node);
        });
    });
}
export function transpileLess(runtime, key, codeOrRecord) {
    var lessFactoryResult = runtime.import('less/lib/less');
    var lessAbstractFileManagerResult = (runtime.import('less/lib/less/environment/abstract-file-manager'));
    var sourceMapMappingsResult = runtime.resolve('source-map/lib/mappings.wasm');
    var sourceMapResult = (runtime.import('source-map'));
    return Promise.all([
        lessFactoryResult,
        lessAbstractFileManagerResult,
        sourceMapMappingsResult,
        sourceMapResult,
    ]).then(function (_a) {
        var _b = tslib_1.__read(_a, 4), lessFactory = _b[0], AbstractFileManager = _b[1], sourceMapMappingsUrl = _b[2], sourceMap = _b[3];
        sourceMap.SourceMapConsumer.initialize({
            'lib/mappings.wasm': sourceMapMappingsUrl,
        });
        var environment = {
            encodeBase64: btoa,
            getSourceMapGenerator: function () { return sourceMap.SourceMapGenerator; },
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
                    contents: contents,
                }); });
            };
            return class_1;
        }(AbstractFileManager));
        var less = lessFactory(environment, [fileManager]);
        var options = {
            filename: key,
            sourceMap: {
                outputSourceFiles: true,
            },
        };
        var code = typeof codeOrRecord === 'string'
            ? codeOrRecord
            : codeOrRecord.source;
        return less.render(code, options).then(function (renderOutput) {
            return {
                source: renderOutput.css,
                sourceMap: typeof renderOutput.map === 'string'
                    ? JSON.parse(renderOutput.map)
                    : undefined,
            };
        });
    });
}
var registerTemplate = function ($__export) {
    var element;
    var markup;
    function __onAfterUnload(event) {
        event.preventDefault();
    }
    function __onReplace(event) {
        event.previousInstance.element.remove();
    }
    $__export('__onAfterUnload', __onAfterUnload);
    $__export('__onReplace', __onReplace);
    return {
        execute: function () {
            markup = '<CSS>';
            $__export('markup', markup);
            element = document.createElement('style');
            element.type = 'text/css';
            element.innerHTML = markup;
            document.head.appendChild(element);
            $__export('element', element);
        },
    };
};
var registerTemplateParts = registerTemplate
    .toString()
    .split(/'<CSS>'|"<CSS>"/);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Nzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxZQUFZLE1BQU0sa0JBQWtCLENBQUM7QUFnQjVDLGdDQUFnQyxJQUEwQjtJQUN0RCxJQUFNLEtBQUssR0FJTCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFDLEtBQUssRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBQSxFQUFFLENBQUMsRUFBbEMsQ0FBa0MsQ0FBQyxDQUFDOztRQUdoRSxJQUFBLGtCQUFtQyxFQUFqQyxvQkFBTSxFQUFFLGdCQUFJLEVBQUUsUUFBQyxDQUFtQjtRQUUxQyxJQUFJLE9BQU8sTUFBSSxLQUFLLFFBQVEsRUFBRTtZQUMxQixRQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFRLFlBQVksQ0FBQyxNQUFJLENBQUMsQ0FBQzs7U0FFaEQ7UUFFRCxNQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBRSxDQUFDO1lBQzNCLE9BQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUEsRUFBRSxDQUFDO1FBQTVDLENBQTRDLENBQy9DLENBQUM7SUFDTixDQUFDO0lBWEQsT0FBTyxLQUFLLENBQUMsTUFBTTs7S0FXbEI7SUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF1QixxQkFBcUIsQ0FBQyxDQUFDLENBQUMsT0FBRyxDQUFDLENBQUM7SUFDakUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxPQUFJLENBQUMsQ0FBQztJQUUzQyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUU1QyxPQUFP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