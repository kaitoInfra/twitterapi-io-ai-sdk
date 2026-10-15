// Compact shapes returned to the model. The raw API objects carry entities, media and
// card metadata that cost tokens without helping most agent tasks.

export type CompactUser = {
  id: string;
  userName: string;
  name: string;
  description?: string;
  location?: string;
  followers?: number;
  following?: number;
  tweets?: number;
  isBlueVerified?: boolean;
  verifiedType?: string;
  createdAt?: string;
  url: string;
};

export type CompactTweet = {
  id: string;
  url: string;
  text: string;
  createdAt: string;
  lang?: string;
  author: { userName: string; name: string; followers?: number; isBlueVerified?: boolean };
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  viewCount?: number;
  isReply?: boolean;
  inReplyToId?: string | null;
  inReplyToUsername?: string | null;
  conversationId?: string;
  quotedTweetId?: string;
};

export type TweetPage = {
  tweets: CompactTweet[];
  hasNextPage: boolean;
  nextCursor?: string;
};

export function compactUser(u: any): CompactUser {
  return {
    id: String(u.id),
    userName: u.userName,
    name: u.name,
    description: u.description || undefined,
    location: u.location || undefined,
    followers: u.followers,
    following: u.following,
    tweets: u.statusesCount,
    isBlueVerified: u.isBlueVerified,
    verifiedType: u.verifiedType || undefined,
    createdAt: u.createdAt,
    url: `https://x.com/${u.userName}`,
  };
}

export function compactTweet(t: any): CompactTweet {
  const a = t.author ?? {};
  return {
    id: String(t.id),
    url: t.url ?? `https://x.com/i/status/${t.id}`,
    text: t.text,
    createdAt: t.createdAt,
    lang: t.lang,
    author: { userName: a.userName, name: a.name, followers: a.followers, isBlueVerified: a.isBlueVerified },
    likeCount: t.likeCount,
    retweetCount: t.retweetCount,
    replyCount: t.replyCount,
    quoteCount: t.quoteCount,
    viewCount: t.viewCount,
    isReply: t.isReply,
    inReplyToId: t.inReplyToId ?? null,
    inReplyToUsername: t.inReplyToUsername ?? null,
    conversationId: t.conversationId,
    quotedTweetId: t.quoted_tweet?.id ? String(t.quoted_tweet.id) : undefined,
  };
}

export function tweetPage(tweets: any[] | undefined, body: any): TweetPage {
  const hasNextPage = Boolean(body?.has_next_page);
  return {
    tweets: (tweets ?? []).map(compactTweet),
    hasNextPage,
    nextCursor: hasNextPage && body?.next_cursor ? body.next_cursor : undefined,
  };
}
