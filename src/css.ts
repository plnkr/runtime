import escapeString from 'js-string-escape';
import Less from 'less';
import * as SourceMap from 'source-map';

import { ReplaceEvent, Runtime, SourceFile, SourceFileRecord } from '.';

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

export function transpileCssToSystemRegister(
    runtime: Runtime,
    key: string,
    code: string
): Promise<SourceFileRecord> {
    if (key.endsWith('.less')) {
        return transpileLessToSystemRegister(runtime, key, code);
    }

    return import('source-map').then((sourceMap: typeof SourceMap) => {
        const node = new sourceMap.SourceNode(1, 0, key, code);

        return createRegisterFunction(node);
    });
}

function transpileLessToSystemRegister(
    runtime: Runtime,
    key: string,
    codeOrRecord: SourceFile
): Promise<SourceFileRecord> {
    const sourceMapMappingsResult = runtime.resolve(
        'source-map/lib/mappings.wasm'
    );
    const sourceMapResult = <Promise<typeof SourceMap>>(
        runtime.import('source-map')
    );
    const transpileLessResult = transpileLess(runtime, key, codeOrRecord);

    return Promise.all([
        sourceMapMappingsResult,
        sourceMapResult,
        transpileLessResult,
    ]).then(([sourceMapMappingsUrl, sourceMap, transpiled]) => {
        (<any>sourceMap.SourceMapConsumer).initialize({
            'lib/mappings.wasm': sourceMapMappingsUrl,
        });
        return sourceMap.SourceMapConsumer.with(
            transpiled.sourceMap,
            null,
            consumer => {
                const node = sourceMap.SourceNode.fromStringWithSourceMap(
                    transpiled.source,
                    consumer
                );

                return createRegisterFunction(node);
            }
        );
    });
}

export function transpileLess(
    runtime: Runtime,
    key: string,
    codeOrRecord: SourceFile
): Promise<SourceFileRecord> {
    const lessFactoryResult = <Promise<any>>runtime.import('less/lib/less');
    const lessAbstractFileManagerResult = <Promise<any>>(
        runtime.import('less/lib/less/environment/abstract-file-manager')
    );
    const sourceMapMappingsResult = runtime.resolve(
        'source-map/lib/mappings.wasm'
    );
    const sourceMapResult = <Promise<typeof SourceMap>>(
        runtime.import('source-map')
    );

    return Promise.all([
        lessFactoryResult,
        lessAbstractFileManagerResult,
        sourceMapMappingsResult,
        sourceMapResult,
    ]).then(
        ([
            lessFactory,
            AbstractFileManager,
            sourceMapMappingsUrl,
            sourceMap,
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
            const code =
                typeof codeOrRecord === 'string'
                    ? codeOrRecord
                    : codeOrRecord.source;
            return less.render(code, options).then(renderOutput => {
                return {
                    source: renderOutput.css,
                    sourceMap:
                        typeof renderOutput.map === 'string'
                            ? JSON.parse(renderOutput.map)
                            : undefined,
                };
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
