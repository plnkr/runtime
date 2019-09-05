import { Runtime, SourceFile, SourceFileRecord } from ".";
export declare function transpileCssToSystemRegister(runtime: Runtime, key: string, code: string): Promise<SourceFileRecord>;
export declare function transpileLess(runtime: Runtime, key: string, codeOrRecord: SourceFile): Promise<SourceFileRecord>;
