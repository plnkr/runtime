import * as SourceMap from 'source-map';
import * as VueTemplateCompiler from 'vue-template-compiler';
import * as VueComponentCompilerUtils from '@vue/component-compiler-utils';

import { Runtime, SourceFileRecord } from './';
import { transpileLess } from './css';

interface ExportFunction {
  (name: string, value: any): void;
  (exported: { [key: string]: any }): any;
}

interface VueOptions {
  render?: Function;
  staticRenderFns?: Function[];
  [key: string]: any;
}

let nextVueId = 0;

export function transpileVue(
  runtime: Runtime,
  key: string,
  code: string
): Promise<SourceFileRecord> {
  const componentCompilerUtilsResult = <
    Promise<typeof VueComponentCompilerUtils>
  >runtime.import('@vue/component-compiler-utils');
  const sourceMapResult = <Promise<typeof SourceMap>>(
    runtime.import('source-map')
  );
  const templateCompilerResult = <Promise<typeof VueTemplateCompiler>>(
    runtime.import('vue-template-compiler')
  );

  return Promise.all([
    templateCompilerResult,
    componentCompilerUtilsResult,
    sourceMapResult
  ]).then(([vueTemplateCompiler, vueComponentCompilerUtils, _]) => {
    const id = nextVueId++;
    const vueId = `data-v-${id}`;
    const dependencies: string[] = [];
    const options: VueOptions = {};
    const setters: Function[] = [];

    let executeBody = '$__export("default", options);';
    let registerBody = `var options = { _scopeId: "${vueId}" };`;

    const parsedComponent = vueComponentCompilerUtils.parse({
      source: code,
      filename: key,
      //@ts-ignore
      compiler: vueTemplateCompiler
    });

    if (parsedComponent.script) {
      const dependencyUrl = `${key}.${id}.js`;

      runtime.inject(dependencyUrl, {
        source: parsedComponent.script.content,
        sourceMap: <SourceMap.RawSourceMap>(<any>parsedComponent.script.map)
      });
      runtime.registerDependency(key, dependencyUrl);

      dependencies.push(dependencyUrl);
      setters.push(function(importedScript: any) {
        if (Object.keys(importedScript).length <= 1 && importedScript.default) {
          importedScript = importedScript.default;
        }

        for (var key in importedScript) {
          options[key] = importedScript[key];
        }
      });
    }

    if (parsedComponent.template) {
      const compiledTemplate = vueComponentCompilerUtils.compileTemplate({
        //@ts-ignore
        compiler: vueTemplateCompiler,
        filename: key,
        isProduction: true, // Needed to avoid running prettier
        source: parsedComponent.template.content
      });
      const dependencyUrl = `${key}.${id}.html.js`;
      const source = `System.register([], ${templateRegisterTemplateParts[0]}${
        compiledTemplate.code
      }${templateRegisterTemplateParts[1]});`;

      runtime.inject(dependencyUrl, {
        source
      });
      runtime.registerDependency(key, dependencyUrl);

      dependencies.push(dependencyUrl);
      setters.push(function(importedTemplate: any) {
        options.render = importedTemplate.render;
        options.staticRenderFns = importedTemplate.staticRenderFns;
      });
    }

    const compiledStyleResults = parsedComponent.styles.map((style, idx) => {
      const dependencyUrl = `${key}.${id}.${idx}.css`;
      const preprocessStyleResult = preprocessStyle(runtime, key, style);

      return Promise.resolve(preprocessStyleResult).then(
        preprocessedStyleRecord => {
          return vueComponentCompilerUtils
            .compileStyleAsync({
              filename: key,
              id: vueId,
              map: preprocessedStyleRecord.sourceMap,
              scoped: !!style.scoped,
              source: preprocessedStyleRecord.source
            })
            .then(compiledStyle => {
              runtime.inject(dependencyUrl, {
                source: compiledStyle.code,
                sourceMap: compiledStyle.map
              });
              runtime.registerDependency(key, dependencyUrl);

              dependencies.push(dependencyUrl);
              setters.push(function() {});
            });
        }
      );
    });

    const stylesResult = <Promise<any>>(
      (compiledStyleResults.length
        ? Promise.all(compiledStyleResults)
        : Promise.resolve())
    );

    return stylesResult.then(() => {
      const constructedScript = `System.register(${JSON.stringify(
        dependencies
      )}, function ($__export) {
                ${registerBody}
                return {
                    setters: [${setters
                      .map(setter => setter.toString())
                      .join(',\n')}],
                    execute: function() {
                        ${executeBody}
                    },
                };ß
            });`;

      return {
        source: constructedScript
      };
    });
  });
}

function preprocessStyle(
  runtime: Runtime,
  key: string,
  style: VueComponentCompilerUtils.SFCBlock
): SourceFileRecord | PromiseLike<SourceFileRecord> {
  const record: SourceFileRecord = {
    source: style.content,
    sourceMap: <any>style.map
  };

  if (style.lang === 'less') {
    return transpileLess(runtime, key, record);
  }

  return record;
}

const templateRegisterTemplate = function($__export: ExportFunction) {
  return {
    execute: function() {
      var render, staticRenderFns;

      $__export({ render, staticRenderFns });
    }
  };
};
const templateRegisterTemplateParts = templateRegisterTemplate
  .toString()
  .split('var render, staticRenderFns;');
