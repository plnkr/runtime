import { IRuntimeHost, IRuntimeOptions, ISystemPlugin, IRuntime } from './';
export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    runtimeHost: IRuntimeHost;
    typescriptVersion: string;
}
export declare function createTranspiler({createRuntime, runtimeHost, typescriptVersion}: ITranspilerOptions): ISystemPlugin;
