import { t as studioT } from '@/lib/i18n';

export function getWorkflowIterationScopes(stepKeys: string[], workflowName: string) {
  const iterations = new Set<number>();
  for (const stepKey of stepKeys) {
    if (!stepKey.startsWith(`${workflowName}[`)) continue;
    const match = stepKey.slice(workflowName.length).match(/^\[(\d+)\]\./);
    if (match) iterations.add(Number(match[1]));
  }
  return [...iterations]
    .sort((first, second) => first - second)
    .map(index => ({
      label: studioT('Item {value0}', { value0: index + 1 }),
      value: `${workflowName}[${index}]`,
    }));
}
