// DSH sources (MIT; THIRD_PARTY_NOTICES.md):
// subagent/subagent/src/index.ts: maxActiveSubagents=8, maxDepth=1.
// core/agent-loop/src/constants.ts: DEFAULT_MAX_PARALLEL_TOOL_CALLS=10.
// core/agent-loop/src/agent.ts runs until completion/cancellation, without a turn-step cap.
export function executionPolicy(
  env: Record<string, string | undefined> = process.env,
) {
  const positiveInteger = (name: string, fallback: number) => {
    const value = env[name] === undefined ? fallback : Number(env[name]);
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`${name} must be a positive safe integer.`);
    return value;
  };
  const maxActiveSubagents = positiveInteger("ALTFLOW_MAX_ACTIVE_SUBAGENTS", 8);
  const maxParallelToolCalls = positiveInteger(
    "ALTFLOW_MAX_PARALLEL_TOOL_CALLS",
    10,
  );
  // Mastra requires a numeric maxSteps. This sentinel preserves DSH's natural
  // completion/cancellation contract instead of adding a product step budget.
  const loop = {
    maxSteps: Number.MAX_SAFE_INTEGER,
    toolCallConcurrency: {
      limit: maxParallelToolCalls,
      strategy: "called" as const,
    },
  };
  return { loop, maxActiveSubagents, maxParallelToolCalls };
}
