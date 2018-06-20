import { IRuntimeHost, IRuntimeOptions, ISystemPlugin, IRuntime } from './';
export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    runtime: IRuntime;
    runtimeHost: IRuntimeHost;
    typescriptVersion: string;
}
export declare function createTranspiler({runtime}: ITranspilerOptions): ISystemPlugin;
