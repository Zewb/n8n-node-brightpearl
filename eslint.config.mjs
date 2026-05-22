import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

// Cloud-support is disabled so we can use node:timers/promises sleep for
// rate-limit retry handling. The node is intended for self-hosted n8n.
// To re-enable cloud verification, switch back to the `config` export and
// remove the sleep-and-retry loop in GenericFunctions.ts.
export default configWithoutCloudSupport;
