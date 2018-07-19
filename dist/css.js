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
    var replace;
    var markup;
    function __onReplace(replaceEvent) {
        replace = replaceEvent.previousInstance.element;
    }
    $__export('__onReplace', __onReplace);
    return {
        execute: function () {
            markup = '<CSS>';
            $__export('markup', markup);
            element = document.createElement('style');
            element.type = 'text/css';
            element.innerHTML = markup;
            if (replace) {
                document.head.replaceChild(element, replace);
                replace = null;
            }
            else {
                document.head.appendChild(element);
            }
            $__export('element', element);
        },
    };
};
var registerTemplateParts = registerTemplate
    .toString()
    .split(/'<CSS>'|"<CSS>"/);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Nzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxZQUFZLE1BQU0sa0JBQWtCLENBQUM7QUFVNUMsZ0NBQWdDLElBQTBCO0lBQ3RELElBQU0sS0FBSyxHQUlMLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUMsS0FBSyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxHQUFBLEVBQUUsQ0FBQyxFQUFsQyxDQUFrQyxDQUFDLENBQUM7O1FBR2hFLElBQUEsa0JBQW1DLEVBQWpDLG9CQUFNLEVBQUUsZ0JBQUksRUFBRSxRQUFDLENBQW1CO1FBRTFDLElBQUksT0FBTyxNQUFJLEtBQUssUUFBUSxFQUFFO1lBQzFCLFFBQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQVEsWUFBWSxDQUFDLE1BQUksQ0FBQyxDQUFDOztTQUVoRDtRQUVELE1BQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFFLENBQUM7WUFDM0IsT0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBQSxFQUFFLENBQUM7UUFBNUMsQ0FBNEMsQ0FDL0MsQ0FBQztJQUNOLENBQUM7SUFYRCxPQUFPLEtBQUssQ0FBQyxNQUFNOztLQVdsQjtJQUVELElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXVCLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxPQUFHLENBQUMsQ0FBQztJQUNqRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLE9BQUksQ0FBQyxDQUFDO0lBRTNDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBRTVDLE9BQU87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