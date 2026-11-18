import { describe, expect, it } from 'vitest';
import { resolveMemoryOptions } from '@/domains/agents/context/agent-memory-preferences';

describe('Master memory preference', () => {
  describe('when memory is enabled', () => {
    it('uses the complete server policy instead of retired per-feature overrides', () => {
      expect(
        resolveMemoryOptions({ enabled: true, workingMemory: false, observationalMemory: false, lastMessages: 0 }),
      ).toBeUndefined();
      expect(resolveMemoryOptions({})).toBeUndefined();
    });
  });
  describe('when memory is disabled', () => {
    it('disables every recall channel for the next invocation', () => {
      expect(resolveMemoryOptions({ enabled: false })).toEqual({
        lastMessages: false,
        semanticRecall: false,
        workingMemory: { enabled: false },
        observationalMemory: false,
      });
    });
  });
});
