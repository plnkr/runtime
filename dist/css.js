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
export function transpileCss(runtime, key, code) {
    if (key.endsWith('.less')) {
        return transpileLess(runtime, key, code);
    }
    return import('source-map').then(function (sourceMap) {
        var node = new sourceMap.SourceNode(1, 0, key, code);
        return createRegisterFunction(node);
    });
}
function transpileLess(runtime, key, code) {
    var lessFactoryResult = runtime.import('less/lib/less', key);
    var lessAbstractFileManagerResult = runtime.import('less/lib/less/environment/abstract-file-manager');
    var sourceMapMappingsResult = runtime.resolve('source-map/lib/mappings.wasm');
    var sourceMapResult = runtime.import('source-map');
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
        return less.render(code, options).then(function (renderOutput) {
            return sourceMap.SourceMapConsumer.with(renderOutput.map, null, function (consumer) {
                var node = sourceMap.SourceNode.fromStringWithSourceMap(renderOutput.css, consumer);
                return createRegisterFunction(node);
            });
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