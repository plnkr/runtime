import Less from 'less';
import MagicString from 'magic-string';

import { ReplaceEvent, Runtime } from '.';

interface ExportFunction {
    (name: string, value: any): void;
}

function createRegisterFunction(code: string): string {
    const ms = new MagicString(code);

    ms.overwrite(0, ms.length(), JSON.stringify(code));

    ms.prepend(`System.register([], ${registerTemplateParts[0]}`);
    ms.append(`${registerTemplateParts[1]});`);

    return ms.toString();
}

export function transpileCss(
    runtime: Runtime,
    key: string,
    code: string
): string | Promise<string> {
    if (key.endsWith('.less')) {
        return transpileLess(runtime, key, code);
    }

    return createRegisterFunction(code);
}

interface LessBrowserFactory {
    (window: Window, options: Less.Options): typeof Less;
}

function transpileLess(
    runtime: Runtime,
    key: string,
    code: string
): Promise<string> {
    return runtime
        .import('less/browser', key)
        .then((browser: LessBrowserFactory) => {
            const less = browser(window, {});
            const options: Less.Options = {
                filename: key,
            };
            return less.render(code, options).then(renderOutput => {
                return createRegisterFunction(renderOutput.css);
            });
        });
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
