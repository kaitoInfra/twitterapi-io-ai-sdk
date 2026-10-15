// Offline tests: a fake fetch records each request and returns canned API bodies.
// Run after `npm run build`: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { twitterApiIoTools, getUserProfile, TwitterApiIoError } from "../dist/index.js";

const tweet = {
  id: "1", url: "https://x.com/a/status/1", text: "hello", createdAt: "Thu Oct 15 08:50:17 +0000 2026", lang: "en",
  likeCount: 3, retweetCount: 1, replyCount: 0, quoteCount: 0, viewCount: 10, isReply: false, inReplyToId: null,
  conversationId: "1", author: { userName: "a", name: "A", followers: 5, isBlueVerified: false }, entities: { big: true },
};

function fakeFetch(body, status = 200) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url: new URL(url), headers: init.headers });
    return new Response(JSON.stringify(body), { status });
  };
  return { f, calls };
}

const ctx = { toolCallId: "t", messages: [], abortSignal: undefined };

test("searchTweets sends query params and returns compact tweets", async () => {
  const { f, calls } = fakeFetch({ tweets: [tweet], has_next_page: true, next_cursor: "c2" });
  const tools = twitterApiIoTools({ apiKey: "k", fetch: f });
  const out = await tools.searchTweets.execute({ query: "from:a", queryType: "Latest" }, ctx);
  assert.equal(calls[0].url.pathname, "/twitter/tweet/advanced_search");
  assert.equal(calls[0].url.searchParams.get("query"), "from:a");
  assert.equal(calls[0].url.searchParams.get("queryType"), "Latest");
  assert.equal(calls[0].url.searchParams.has("cursor"), false);
  assert.equal(calls[0].headers["x-api-key"], "k");
  assert.deepEqual(out.tweets[0].author, { userName: "a", name: "A", followers: 5, isBlueVerified: false });
  assert.equal(out.tweets[0].entities, undefined);
  assert.equal(out.hasNextPage, true);
  assert.equal(out.nextCursor, "c2");
});

test("getUserTweets reads data.tweets and strips @", async () => {
  const { f, calls } = fakeFetch({ status: "success", data: { tweets: [tweet] }, has_next_page: false, next_cursor: "" });
  const out = await twitterApiIoTools({ apiKey: "k", fetch: f }).getUserTweets.execute({ userName: "@a", includeReplies: false }, ctx);
  assert.equal(calls[0].url.searchParams.get("userName"), "a");
  assert.equal(out.tweets.length, 1);
  assert.equal(out.nextCursor, undefined);
});

test("getTweetsByIds joins ids", async () => {
  const { f, calls } = fakeFetch({ tweets: [tweet] });
  await twitterApiIoTools({ apiKey: "k", fetch: f }).getTweetsByIds.execute({ tweetIds: ["1", "2"] }, ctx);
  assert.equal(calls[0].url.searchParams.get("tweet_ids"), "1,2");
});

test("getTrends flattens trend objects", async () => {
  const { f } = fakeFetch({ status: "success", trends: [{ trend: { name: "#x", target: { query: "#x" }, rank: 1 } }] });
  const out = await twitterApiIoTools({ apiKey: "k", fetch: f }).getTrends.execute({ woeid: 1 }, ctx);
  assert.deepEqual(out.trends, [{ rank: 1, name: "#x", query: "#x" }]);
});

test("API error body becomes TwitterApiIoError", async () => {
  const { f } = fakeFetch({ status: "error", msg: "user not found", data: null });
  await assert.rejects(getUserProfile({ apiKey: "k", fetch: f }).execute({ userName: "nobody" }, ctx), (e) => {
    assert.ok(e instanceof TwitterApiIoError);
    assert.match(e.message, /user not found/);
    return true;
  });
});

test("HTTP 401 becomes TwitterApiIoError with status", async () => {
  const { f } = fakeFetch({ error: "Unauthorized", message: "API key is invalid" }, 401);
  await assert.rejects(getUserProfile({ apiKey: "bad", fetch: f }).execute({ userName: "a" }, ctx), (e) => e.status === 401 && /invalid/.test(e.message));
});

test("missing API key is reported clearly", async () => {
  const saved = process.env.TWITTERAPI_IO_API_KEY;
  delete process.env.TWITTERAPI_IO_API_KEY;
  try {
    await assert.rejects(getUserProfile({ fetch: async () => new Response("{}") }).execute({ userName: "a" }, ctx), /TWITTERAPI_IO_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.TWITTERAPI_IO_API_KEY = saved;
  }
});
