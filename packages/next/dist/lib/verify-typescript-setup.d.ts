import type { TypeCheckResult } from './typescript/runTypeCheck';
export declare function verifyTypeScriptSetup({ dir, distDir, cacheDir, intentDirs, tsconfigPath, typeCheckPreflight, disableStaticImages, hasAppDir, hasPagesDir, usingTypeScript, }: {
    dir: string;
    distDir: string;
    cacheDir?: string;
    tsconfigPath: string;
    intentDirs: string[];
    typeCheckPreflight: boolean;
    disableStaticImages: boolean;
    hasAppDir: boolean;
    hasPagesDir: boolean;
    usingTypeScript: 'auto' | boolean;
}): Promise<{
    result?: TypeCheckResult;
    version: string | null;
}>;
