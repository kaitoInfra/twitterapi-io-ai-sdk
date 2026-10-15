// Live tests against the real API. Skipped unless TWITTERAPI_IO_API_KEY is set.
// The generateText test uses the AI SDK's mock model, so no LLM key is needed:
// the mock model calls a tool, the real tool hits TwitterAPI.io, and the mock model then answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateText, isStepCount } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { twitterApiIoTools } from "../dist/index.js";

const live = process.env.TWITTERAPI_IO_API_KEY ? test : test.skip;
const ctx = { toolCallId: "t", messages: [], abortSignal: undefined };

live("every tool returns real data", async () => {
  const t = twitterApiIoTools();
  const search = await t.searchTweets.execute({ query: "from:vercel", queryType: "Latest" }, ctx);
  assert.ok(search.tweets.length > 0 && search.tweets[0].url.startsWith("https://"));
  const profile = await t.getUserProfile.execute({ userName: "vercel" }, ctx);
  assert.equal(profile.userName.toLowerCase(), "vercel");
  assert.ok(profile.followers > 0);
  const timeline = await t.getUserTweets.execute({ userName: "vercel", includeReplies: false }, ctx);
  assert.ok(timeline.tweets.length > 0);
  const mentions = await t.getUserMentions.execute({ userName: "vercel" }, ctx);
  assert.ok(Array.isArray(mentions.tweets));
  const byId = await t.getTweetsByIds.execute({ tweetIds: [search.tweets[0].id] }, ctx);
  assert.equal(byId.tweets[0].id, search.tweets[0].id);
  const thread = await t.getTweetThread.execute({ tweetId: "1542800384250597382" }, ctx);
  assert.ok(thread.tweets.length >= 2);
  const trends = await t.getTrends.execute({ woeid: 1 }, ctx);
  assert.ok(trends.trends.length > 0 && trends.trends[0].name);
});

live("works inside generateText with the current AI SDK", async () => {
  let step = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async ({ prompt }) => {
      step += 1;
      if (step === 1) {
        return {
          content: [{ type: "tool-call", toolCallId: "c1", toolName: "getUserProfile", input: JSON.stringify({ userName: "vercel" }) }],
          finishReason: { unified: "tool-calls", raw: undefined },
          usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } },
          warnings: [],
        };
      }
      const toolMsg = prompt.find((m) => m.role === "tool");
      const part = toolMsg.content[0];
      const followers = part.output.value.followers;
      return {
        content: [{ type: "text", text: `vercel has ${followers} followers` }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } },
        warnings: [],
      };
    },
  });
  const { text, steps } = await generateText({
    model,
    prompt: "How many followers does @vercel have?",
    tools: twitterApiIoTools(),
    stopWhen: isStepCount(3),
  });
  assert.equal(steps.length, 2);
  assert.match(text, /^vercel has \d+ followers$/);
});
