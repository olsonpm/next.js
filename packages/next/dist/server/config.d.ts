import type { ExperimentalConfig, NextConfigComplete, NextConfig } from './config-shared';
export { normalizeConfig } from './config-shared';
export type { DomainLocale, NextConfig } from './config-shared';
export declare function warnOptionHasBeenDeprecated(config: NextConfig, nestedPropertyKey: string, reason: string, silent: boolean): void;
export declare function warnOptionHasBeenMovedOutOfExperimental(config: NextConfig, oldExperimentalKey: string, newKey: string, configFileName: string, silent: boolean): NextConfig;
export default function loadConfig(phase: string, dir: string, { customConfig, rawConfig, silent, onLoadUserConfig, reactProductionProfiling, }?: {
    customConfig?: object | null;
    rawConfig?: boolean;
    silent?: boolean;
    onLoadUserConfig?: (conf: NextConfig) => void;
    reactProductionProfiling?: boolean;
}): Promise<NextConfigComplete>;
export declare function getEnabledExperimentalFeatures(userNextConfigExperimental: NextConfig['experimental']): (keyof ExperimentalConfig)[];
