declare module 'vue-template-compiler' {
    export interface StartOfSourceMap {
        file?: string;
        sourceRoot?: string;
    }
    export interface RawSourceMap extends StartOfSourceMap {
        version: string;
        sources: string[];
        names: string[];
        sourcesContent?: string[];
        mappings: string;
    }
    export interface SFCCustomBlock {
        type: string;
        content: string;
        attrs: {
            [key: string]: string;
        };
        start: number;
        end: number;
        map: RawSourceMap;
    }
    export interface SFCBlock extends SFCCustomBlock {
        lang?: string;
        src?: string;
        scoped?: boolean;
        module?: string | boolean;
    }
    export interface SFCDescriptor {
        template?: SFCBlock;
        script?: SFCBlock;
        styles: SFCBlock[];
        customBlocks: SFCCustomBlock[];
    }
    export interface VueTemplateCompilerOptions {
        modules?: Object[];
    }
    export interface VueTemplateCompilerParseOptions {
        pad?: 'line' | 'space';
    }
    export interface VueTemplateCompilerResults {
        ast: Object | void;
        render: string;
        staticRenderFns: string[];
        errors: string[];
        tips: string[];
    }

    export function parseComponent(
        source: string,
        options?: any
    ): SFCDescriptor;
    export function compile(
        template: string,
        options: VueTemplateCompilerOptions
    ): VueTemplateCompilerResults;
    export function ssrCompile(
        template: string,
        options: VueTemplateCompilerOptions
    ): VueTemplateCompilerResults;
}
