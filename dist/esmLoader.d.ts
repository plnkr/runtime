import { ISystemPlugin } from './';
export declare function createEsmCdnLoader(): ISystemPlugin;
export declare type DynamicImport = (spec: string) => Promise<any>;
export declare const dynamicImport: DynamicImport;
