declare module 'sver/convert-range' {
  export type RangeType = 'wildard' | 'major' | 'stable' | 'exact';

  export interface ISver {
    readonly major: string;
    readonly minor: string;
    readonly patch: string;
    readonly pre: string;
    readonly build: string;
    readonly tag: string;
  }

  export interface ISverRange {
    readonly isExact: boolean;
    readonly isExactSemver: boolean;
    readonly isExactTag: boolean;
    readonly isStable: boolean;
    readonly isMajor: boolean;
    readonly isWildcard: boolean;
    readonly type: RangeType;
    readonly version: ISver;
  }

  export default function convertRange(range: string): ISverRange;
}
