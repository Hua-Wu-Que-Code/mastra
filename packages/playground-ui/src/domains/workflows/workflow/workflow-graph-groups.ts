import type { WorkflowGraphEdge, WorkflowGraphNode } from './utils';
import { WORKFLOW_STEP_NODE_TYPE } from './workflow-step-node-utils';
import type { WorkflowStepNode } from './workflow-step-node-utils';
import type { WorkflowGraphGroup } from '@/ds/components/Workflow';
import { t as studioT } from '@/lib/i18n';

export function getWorkflowGraphGroups(nodes: WorkflowGraphNode[]): WorkflowGraphGroup[] {
  const groups = new Map<string, WorkflowGraphGroup>();
  for (const node of nodes) {
    if (node.type !== WORKFLOW_STEP_NODE_TYPE || !node.data.parallelGroup) continue;
    const { id, pathCount } = node.data.parallelGroup;
    const group = groups.get(id);
    if (group) group.nodeIds.push(node.id);
    else
      groups.set(id, {
        id,
        get label() {
          return studioT('Parallel');
        },
        description: studioT('{value0} paths run together', { value0: pathCount }),
        nodeIds: [node.id],
      });
  }
  return [...groups.values()];
}

export function getWorkflowMapContext(node: WorkflowStepNode, nodes: WorkflowGraphNode[], edges: WorkflowGraphEdge[]) {
  if (node.data.workflowStep.kind !== 'map-step') return undefined;
  const hasGeneratedName = node.data.workflowStep.id.startsWith('mapping_');
  const predecessors = new Set(edges.filter(edge => edge.target === node.id).map(edge => edge.source));
  const inputs = nodes.filter(input => predecessors.has(input.id));
  if (inputs.length > 1) {
    const hasParallelInputs = inputs.every(input => input.type === WORKFLOW_STEP_NODE_TYPE && input.data.parallelGroup);
    if (hasParallelInputs) {
      return {
        label: hasGeneratedName ? studioT('Map parallel results') : node.data.label,
        get description() {
          return studioT('Transform the outputs after all parallel paths finish.');
        },
      };
    }
    return {
      label: hasGeneratedName ? studioT('Map branch results') : node.data.label,
      get description() {
        return studioT('Transform the outputs of the matching branches.');
      },
    };
  }
  return {
    label: hasGeneratedName ? studioT('Map data') : node.data.label,
    get description() {
      return studioT('Transform the previous output into the next input.');
    },
  };
}
