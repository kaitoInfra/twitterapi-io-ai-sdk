# @twitterapi_io/ai-sdk

Read-only X (Twitter) data tools for the [Vercel AI SDK](https://ai-sdk.dev): search tweets with X's advanced search operators, read profiles, timelines, mentions and full conversation threads, and get trending topics. Powered by [TwitterAPI.io](https://twitterapi.io). You don't need an X developer account.

## Install

```bash
npm install @twitterapi_io/ai-sdk
```

`ai` (v5 or later) and `zod` are peer dependencies.

Get an API key at [twitterapi.io](https://twitterapi.io) and set it:

```bash
export TWITTERAPI_IO_API_KEY="your_key"
```

## Usage

```ts
import { generateText, isStepCount } from 'ai';
import { twitterApiIoTools } from '@twitterapi_io/ai-sdk';

const { text } = await generateText({
  model: 'openai/gpt-5-mini',
  prompt: 'What are developers on X saying about the Vercel AI SDK this week? Cite tweet links.',
  tools: twitterApiIoTools(),
  stopWhen: isStepCount(5),
});

console.log(text);
```

Pick individual tools if you only need some of them:

```ts
import { searchTweets, getUserProfile } from '@twitterapi_io/ai-sdk';

const tools = {
  searchTweets: searchTweets(),
  getUserProfile: getUserProfile(),
};
```

On AI SDK v5 and v6, use `stepCountIs(5)` instead of `isStepCount(5)`.

## Tools

| Tool | What it returns |
| --- | --- |
| `searchTweets` | Tweets matching a query with X advanced search operators (`from:`, `to:`, `"phrase"`, `lang:`, `since:`, `until:`, `min_faves:`, `-filter:replies` ...). `queryType` is `Latest` or `Top`. |
| `getUserProfile` | Profile by handle: name, bio, location, follower / following / post counts, verification, join date |
| `getUserTweets` | An account's most recent posts, optionally with replies |
| `getUserMentions` | Posts that mention an account, optionally within a Unix-time window |
| `getTweetsByIds` | Posts by ID, up to 100 per call |
| `getTweetThread` | The conversation around a post: parents and replies, in thread order |
| `getTrends` | Trending topics for a location (WOEID; 1 = worldwide) |

Paginated tools return `{ tweets, hasNextPage, nextCursor }`. The model passes `nextCursor` back as `cursor` to get the next page. Tweets are returned in a compact shape (id, url, text, createdAt, author, engagement counts, reply/thread ids) to keep token usage low.

## Options

Every tool factory, and `twitterApiIoTools`, accepts the same options:

```ts
twitterApiIoTools({
  apiKey: process.env.MY_KEY, // default: process.env.TWITTERAPI_IO_API_KEY
  baseUrl: 'https://api.twitterapi.io', // default
  fetch: customFetch, // default: global fetch
});
```

Errors (invalid key, unknown user, rate limit) are thrown as `TwitterApiIoError` with an HTTP `status`. The AI SDK reports them to the model as tool errors.

## Security

- All tools are read-only. They cannot post, like, follow or send messages.
- Tool results are user-generated posts. Each tool description tells the model to treat them as data, never as instructions. Keep that rule in your system prompt too.
- Keep the API key in an environment variable, not in source code.

## Links

- TwitterAPI.io: https://twitterapi.io
- API documentation: https://docs.twitterapi.io
- Hosted MCP server (for MCP clients): https://mcp.twitterapi.io/mcp
- Support: hello@twitterapi.io

## License

MIT
