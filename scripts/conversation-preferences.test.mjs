import assert from "node:assert/strict";
import { test } from "node:test";
import { RequestContext } from "@mastra/core/request-context";
import { createAltFlowAuth } from "../src/mastra/altflow-auth.ts";

const origin = "http://localhost:5174";
const { auth } = createAltFlowAuth({
  backendUrl: "http://127.0.0.1:8080",
  origins: [origin],
  secureCookies: false,
});
const user = { id: "test-owner", username: "Test", role: "creator" };
async function authorized(body, endpoint = "send-message") {
  const requestContext = new RequestContext();
  return auth.authorize("/api/agents/creator-agent/" + endpoint, "POST", user, {
    req: {
      raw: new Request(origin + "/api", {
        method: "POST",
        headers: { Origin: origin },
        body: JSON.stringify(body),
      }),
    },
    get: () => requestContext,
  });
}
test("managed users can send bounded memory choices and teamwork through message admission", async () => {
  const memory = {
    thread: "owned-thread",
    resource: "altflow:test-owner",
    options: {
      lastMessages: 12,
      workingMemory: { enabled: false },
      observationalMemory: false,
    },
  };
  assert.equal(
    await authorized({
      threadId: "owned-thread",
      message: {},
      ifIdle: { streamOptions: { memory, disableSubAgents: true } },
    }),
    true,
  );
  assert.equal(
    await authorized(
      { messages: [], memory, disableSubAgents: false },
      "stream",
    ),
    true,
  );
});
test("managed users cannot smuggle agent configuration through conversation preferences", async () => {
  for (const override of [
    { model: "other/model" },
    { instructions: "replace" },
    { tools: {} },
    {
      memory: {
        options: { workingMemory: { enabled: true, template: "replace" } },
      },
    },
    { memory: { options: { observationalMemory: { model: "other/model" } } } },
    { memory: { options: { lastMessages: -1 } } },
  ]) {
    assert.equal(
      await authorized({
        threadId: "owned-thread",
        message: {},
        ifIdle: { streamOptions: override },
      }),
      false,
    );
  }
});
