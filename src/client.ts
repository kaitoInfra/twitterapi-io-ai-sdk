export type TwitterApiIoOptions = {
  /** TwitterAPI.io API key. Defaults to process.env.TWITTERAPI_IO_API_KEY. */
  apiKey?: string;
  /** API base URL. Defaults to https://api.twitterapi.io. */
  baseUrl?: string;
  /** Custom fetch implementation (for tests or proxies). Defaults to the global fetch. */
  fetch?: typeof fetch;
};

const DEFAULT_BASE_URL = "https://api.twitterapi.io";

export class TwitterApiIoError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TwitterApiIoError";
    this.status = status;
  }
}

function resolveApiKey(options: TwitterApiIoOptions): string {
  const key =
    options.apiKey ??
    (typeof process !== "undefined" ? process.env?.TWITTERAPI_IO_API_KEY : undefined);
  if (!key) {
    throw new TwitterApiIoError(
      "Missing TwitterAPI.io API key. Pass { apiKey } or set TWITTERAPI_IO_API_KEY. Get a key at https://twitterapi.io.",
      401,
    );
  }
  return key;
}

/** GET a TwitterAPI.io endpoint and return the parsed JSON body. */
export async function callApi(
  options: TwitterApiIoOptions,
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<any> {
  const url = new URL(path, options.baseUrl ?? DEFAULT_BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const doFetch = options.fetch ?? fetch;
  const res = await doFetch(url, {
    headers: { "x-api-key": resolveApiKey(options), accept: "application/json" },
    signal,
  });
  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new TwitterApiIoError(`TwitterAPI.io returned a non-JSON response (HTTP ${res.status})`, res.status);
  }
  if (!res.ok) {
    const msg = body?.message ?? body?.msg ?? body?.detail ?? body?.error ?? `HTTP ${res.status}`;
    throw new TwitterApiIoError(`TwitterAPI.io error: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`, res.status);
  }
  if (body?.status === "error") {
    throw new TwitterApiIoError(`TwitterAPI.io error: ${body.msg ?? body.message ?? "unknown error"}`, res.status);
  }
  return body;
}
