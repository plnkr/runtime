import { IRuntime, ISystemPlugin } from './';
export interface CssLoaderOptions {
    runtime: IRuntime;
}
export declare function createCssLoader({runtime}: CssLoaderOptions): ISystemPlugin;
