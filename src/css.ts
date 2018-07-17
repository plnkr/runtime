import escapeString from 'js-string-escape';
import Less from 'less';
import * as SourceMap from 'source-map';

import { ReplaceEvent, Runtime, SourceFileRecord } from '.';

interface ExportFunction {
    (name: string, value: any): void;
}

function createRegisterFunction(node: SourceMap.SourceNode): SourceFileRecord {
    const queue: {
        parent: SourceMap.SourceNode;
        node: string | SourceMap.SourceNode;
        i: number;
    }[] = node.children.map((child, i) => ({ parent: node, node: child, i }));

    while (queue.length) {
        const { parent, node, i } = queue.shift();

        if (typeof node === 'string') {
            parent.children[i] = <any>escapeString(node);
            continue;
        }

        node.children.forEach((child, i) =>
            queue.push({ parent: node, node: child, i })
        );
    }

    node.prepend(`System.register([], ${registerTemplateParts[0]}"`);
    node.add(`"${registerTemplateParts[1]});`);

    const result = node.toStringWithSourceMap();

    return {
        source: result.code,
        sourceMap: result.map.toJSON(),
    };
}

export function transpileCss(
    runtime: Runtime,
    key: string,
    code: string
): Promise<SourceFileRecord> {
    if (key.endsWith('.less')) {
        return transpileLess(runtime, key, code);
    }

    return import('source-map').then((sourceMap: typeof SourceMap) => {
        const node = new sourceMap.SourceNode(1, 0, key, code);

        return createRegisterFunction(node);
    });
}

function transpileLess(
    runtime: Runtime,
    key: string,
    code: string
): Promise<SourceFileRecord> {
    const lessFactoryResult = runtime.import('less/lib/less', key);
    const lessAbstractFileManagerResult = runtime.import(
        'less/lib/less/environment/abstract-file-manager'
    );
    const sourceMapMappingsResult = runtime.resolve(
        'source-map/lib/mappings.wasm'
    );
    const sourceMapResult = runtime.import('source-map');

    return Promise.all([
        lessFactoryResult,
        lessAbstractFileManagerResult,
        sourceMapMappingsResult,
        sourceMapResult,
    ]).then(
        ([lessFactory, AbstractFileManager, sourceMapMappingsUrl, sourceMap]: [
            any,
            any,
            string,
            typeof SourceMap
        ]) => {
            (<any>sourceMap.SourceMapConsumer).initialize({
                'lib/mappings.wasm': sourceMapMappingsUrl,
            });

            const environment: any = {
                encodeBase64: btoa,
                getSourceMapGenerator: () => sourceMap.SourceMapGenerator,
            };
            const fileManager: any = class extends AbstractFileManager {
                loadFile(filename: string, currentDirectory: string) {
                    const contentsResult = runtime.host.getFileContents(
                        `${currentDirectory}/${filename}`
                    );

                    return Promise.resolve(contentsResult).then(contents => ({
                        filename,
                        contents,
                    }));
                }
            };
            const less = <typeof Less>lessFactory(environment, [fileManager]);
            const options: Less.Options = {
                filename: key,
                sourceMap: {
                    outputSourceFiles: true,
                },
            };
            return less.render(code, options).then(renderOutput => {
                return sourceMap.SourceMapConsumer.with(
                    renderOutput.map,
                    null,
                    consumer => {
                        const node = sourceMap.SourceNode.fromStringWithSourceMap(
                            renderOutput.css,
                            consumer
                        );

                        return createRegisterFunction(node);
                    }
                );
            });
        }
    );
}

const registerTemplate = function($__export: ExportFunction) {
    var element: HTMLStyleElement;
    var replace: HTMLStyleElement;
    var markup: string;

    function __onReplace(replaceEvent: ReplaceEvent): void {
        replace = replaceEvent.previousInstance.element;
    }

    $__export('__onReplace', __onReplace);

    return {
        execute: function() {
            markup = '<CSS>';

            $__export('markup', markup);

            element = document.createElement('style');
            element.type = 'text/css';
            element.innerHTML = markup;

            if (replace) {
                document.head.replaceChild(element, replace);
                replace = null;
            } else {
                document.head.appendChild(element);
            }

            $__export('element', element);
        },
    };
};

const registerTemplateParts = registerTemplate
    .toString()
    .split(/'<CSS>'|"<CSS>"/);
