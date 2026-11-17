---
'@mastra/core': minor
---

Added optional gateway-declared input context capacities to custom provider catalogs, including capacities by reasoning level. Studio uses these limits with recorded input tokens to show context occupancy.

```ts
const provider = {
  name: 'AltFlow',
  gateway: 'altflow',
  apiKeyEnvVar: 'ALTFLOW_MODELHUB_API_KEY',
  models: ['deepseek-v4-pro'],
  modelContextWindows: { 'deepseek-v4-pro': 1048576 },
};
```
