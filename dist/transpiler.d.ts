import { IRuntimeOptions, ISystemPlugin, IRuntime } from './';
export interface ITranspilerOptions {
    createRuntime: (options: IRuntimeOptions) => IRuntime;
    typescriptVersion: string;
}
export declare function createTranspiler({createRuntime, typescriptVersion}: ITranspilerOptions): ISystemPlugin;
