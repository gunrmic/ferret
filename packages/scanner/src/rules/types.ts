import type { StaticFlag, StaticFlagRule } from '@ferret/types';

export interface AnalysisRule {
  name: StaticFlagRule;
  run(code: string, filename: string): StaticFlag[];
}
