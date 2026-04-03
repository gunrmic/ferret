export { ConfigSchema, loadConfig, type Config } from './config.js';
export { ScanJobPayloadSchema, type ScanJobPayload } from './scan-job.js';
export {
  STATIC_FLAG_RULES,
  type StaticFlagRule,
  type Severity,
  type StaticFlag,
} from './static-flags.js';
export {
  RULE_WEIGHTS,
  MAX_RISK_SCORE,
  DIMINISHING_FACTOR,
  ALERT_RISK_THRESHOLD,
} from './risk.js';
export {
  AlertJobPayloadSchema,
  type AlertJobPayload,
} from './alert-job.js';
