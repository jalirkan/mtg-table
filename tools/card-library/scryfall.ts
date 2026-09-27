/*
 * mtg-table — tools/card-library/scryfall.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The one door to Scryfall. Every request the card library makes goes through
 * {@link ScryfallClient.request}, which is where the API's terms become code
 * (report 03 §1.1, §1.2, NOTICE §2):
 *
 *   - **Both headers, always, set by us.** `User-Agent` from `config.json`'s
 *     `scryfallUserAgent`; `Accept: application/json` on the API. "Do not allow
 *     HTTP libraries to choose the header for you."
 *   - **Two pacing buckets**, the shape of Forge's own `ScryfallRateLimiter`:
 *     `/cards/search`, `/cards/named`, `/cards/random` and `/cards/collection`
 *     at 2 per second (>= 500 ms apart), every other API method at 10 per second
 *     (>= 100 ms apart), `/cards/manifest` at 10 per minute. The file origins
 *     (`data.scryfall.io`, `cards.scryfall.io`, `svgs.scryfall.io`) are not
 *     rate-limited and are not paced — but they are LOGGED, like everything else.
 *   - **429 is a global stop.** A 429 on any API bucket closes the whole API
 *     (not the file origins) for `Retry-After` seconds — an integer or an HTTP
 *     date — falling back to 30 s, the documented lockout. "It is not acceptable
 *     to ignore HTTP 429 responses."
 *   - **Slots are reserved synchronously**, before the first `await`, so two
 *     concurrent callers cannot both read "the bucket is free" and fire together.
 *
 * Every request is appended to {@link ScryfallClient.log}; {@link rateStats} turns
 * that into the numbers the evidence doc prints — per bucket, the count, the
 * smallest gap between two starts and the most starts in any one-second window.
 * The limiter is measured, not asserted from its source.
 *
 * `fetch`, the clock and `sleep` are injectable so the pacing is tested with a
 * fake clock (web/test/cards-lib.test.ts), never against the real service.
 */

export type Bucket = 'search' | 'api' | 'manifest' | 'file';

/** Minimum gap between two request STARTS in a bucket. A 2 ms margin absorbs timer jitter. */
export const BUCKET_INTERVAL_MS: Readonly<Record<Bucket, number>> = {
  search: 502,
  api: 102,
  manifest: 6_002,
  file: 0,
};

/** What Scryfall documents; the stats line compares against these, not against the margins above. */
export const BUCKET_LIMIT_PER_S: Readonly<Record<Bucket, number | null>> = {
  search: 2,
  api: 10,
  manifest: 10 / 60,
  file: null,
};

const SLOW_PATHS = ['/cards/search', '/cards/named', '/cards/random', '/cards/collection'];
const FALLBACK_RETRY_AFTER_S = 30;
const DEFAULT_MAX_RETRIES = 3;

export function bucketOf(url: string): Bucket {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'api';
  }
  if (parsed.hostname !== 'api.scryfall.com') return 'file';
  if (parsed.pathname.startsWith('/cards/manifest')) return 'manifest';
  for (const path of SLOW_PATHS) {
    if (parsed.pathname === path || parsed.pathname.startsWith(`${path}/`)) return 'search';
  }
  return 'api';
}

/** `Retry-After` is either delta-seconds or an HTTP-date. Anything else → the fallback. */
export function retryAfterMs(header: string | null, now: number): number {
  if (header !== null) {
    const trimmed = header.trim();
    if (/^\d+$/.test(trimmed)) {
      const s = Number.parseInt(trimmed, 10);
      if (s > 0) return s * 1000;
    } else {
      const date = Date.parse(trimmed);
      if (Number.isFinite(date) && date > now) return date - now;
    }
  }
  return FALLBACK_RETRY_AFTER_S * 1000;
}

export interface RequestLogEntry {
  /** When the request started, on the client's clock (ms). */
  t: number;
  bucket: Bucket;
  method: string;
  url: string;
  status: number;
  /** Wall time until the response headers arrived. */
  ms: number;
}

export interface ClientOptions {
  userAgent: string;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  /** One line per notable event (a 429, a retry). Defaults to stderr. */
  log?: (line: string) => void;
}

export class ScryfallError extends Error {
  readonly status: number;
  readonly url: string;
  /** Scryfall's error `type`, e.g. `ambiguous` on a vague fuzzy name. */
  readonly type: string | null;

  constructor(status: number, url: string, message: string, type: string | null) {
    super(message);
    this.name = 'ScryfallError';
    this.status = status;
    this.url = url;
    this.type = type;
  }
}

export interface ListPage<T> {
  object: 'list';
  data: T[];
  has_more?: boolean;
  next_page?: string;
  total_cards?: number;
}

const realSleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

export class ScryfallClient {
  readonly userAgent: string;
  readonly log: RequestLogEntry[] = [];
  readonly #fetch: typeof fetch;
  readonly #now: () => number;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #maxRetries: number;
  readonly #say: (line: string) => void;
  /** Earliest start time of the next request, per bucket. */
  readonly #nextSlot = new Map<Bucket, number>();
  /** While a 429's Retry-After runs, no API bucket may start. */
  #cooldownUntil = 0;

  constructor(options: ClientOptions) {
    if (options.userAgent.trim() === '') throw new Error('Scryfall requires a User-Agent; none configured');
    this.userAgent = options.userAgent;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#now = options.now ?? Date.now;
    this.#sleep = options.sleep ?? realSleep;
    this.#maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#say = options.log ?? ((line) => process.stderr.write(`${line}\n`));
  }

  /** Reserve the next start slot for `bucket` and wait for it. Returns the start time. */
  async #acquire(bucket: Bucket): Promise<number> {
    if (bucket === 'file') return this.#now();
    for (;;) {
      const now = this.#now();
      const slot = Math.max(now, this.#nextSlot.get(bucket) ?? 0, this.#cooldownUntil);
      // Reserve before awaiting: a concurrent caller sees the slot as taken.
      this.#nextSlot.set(bucket, slot + BUCKET_INTERVAL_MS[bucket]);
      if (slot > now) await this.#sleep(slot - now);
      // A 429 may have landed while we slept; its cooldown outranks our slot.
      if (this.#now() >= this.#cooldownUntil) return this.#now();
    }
  }

  /**
   * One HTTP request with the mandatory headers, paced by bucket, retried on 429
   * after `Retry-After`. Any other status is returned to the caller as-is.
   */
  async request(url: string, init: { method?: string; accept?: string; body?: string } = {}): Promise<Response> {
    const bucket = bucketOf(url);
    const method = init.method ?? 'GET';
    const accept = init.accept ?? (bucket === 'file' ? '*/*' : 'application/json');
    for (let attempt = 0; ; attempt++) {
      const t = await this.#acquire(bucket);
      const headers: Record<string, string> = { 'User-Agent': this.userAgent, Accept: accept };
      if (init.body !== undefined) headers['Content-Type'] = 'application/json';
      const request: RequestInit = { method, headers };
      if (init.body !== undefined) request.body = init.body;
      const response = await this.#fetch(url, request);
      this.log.push({ t, bucket, method, url, status: response.status, ms: this.#now() - t });
      if (response.status !== 429) return response;

      await response.body?.cancel().catch(() => undefined);
      const waitMs = retryAfterMs(response.headers.get('retry-after'), this.#now());
      if (bucket !== 'file') this.#cooldownUntil = Math.max(this.#cooldownUntil, this.#now() + waitMs);
      this.#say(`  429 from ${new URL(url).pathname} — honouring Retry-After: ${String(Math.ceil(waitMs / 1000))}s`);
      if (attempt >= this.#maxRetries) {
        throw new ScryfallError(429, url, `HTTP 429 after ${String(attempt + 1)} attempts`, 'rate_limited');
      }
      if (bucket === 'file') await this.#sleep(waitMs);
    }
  }

  /** GET + parse, or throw a {@link ScryfallError} carrying Scryfall's own `details` / `type`. */
  async json<T>(url: string): Promise<T> {
    const response = await this.request(url);
    const text = await response.text();
    if (!response.ok) {
      let details = text.slice(0, 200);
      let type: string | null = null;
      try {
        const body = JSON.parse(text) as { details?: unknown; type?: unknown };
        if (typeof body.details === 'string') details = body.details;
        if (typeof body.type === 'string') type = body.type;
      } catch {
        // not JSON; keep the raw prefix
      }
      throw new ScryfallError(response.status, url, `HTTP ${String(response.status)}: ${details}`, type);
    }
    return JSON.parse(text) as T;
  }

  /** Follow a paginated `List` (`has_more` / `next_page`), one page per yield. */
  async *pages<T>(firstUrl: string): AsyncGenerator<ListPage<T>> {
    let url: string | undefined = firstUrl;
    while (url !== undefined) {
      const page: ListPage<T> = await this.json<ListPage<T>>(url);
      yield page;
      url = page.has_more === true && typeof page.next_page === 'string' ? page.next_page : undefined;
    }
  }
}

export interface BucketStats {
  bucket: Bucket;
  requests: number;
  /** Smallest gap between two consecutive starts, ms (`null` with fewer than two). */
  minGapMs: number | null;
  /** (n − 1) / (last − first), requests per second (`null` with fewer than two). */
  meanRatePerS: number | null;
  /** Most starts inside any half-open one-second window. The number the limit is about. */
  maxInAnySecond: number;
  limitPerS: number | null;
  statuses: Record<string, number>;
}

/** The measured rate, per bucket. Pure over a log, so the test can feed it one. */
export function rateStats(log: readonly RequestLogEntry[]): BucketStats[] {
  const byBucket = new Map<Bucket, RequestLogEntry[]>();
  for (const entry of log) {
    const list = byBucket.get(entry.bucket) ?? [];
    list.push(entry);
    byBucket.set(entry.bucket, list);
  }
  const out: BucketStats[] = [];
  for (const bucket of ['search', 'api', 'manifest', 'file'] as const) {
    const entries = (byBucket.get(bucket) ?? []).slice().sort((a, b) => a.t - b.t);
    if (entries.length === 0) continue;
    let minGap: number | null = null;
    let maxInWindow = 0;
    let lo = 0;
    const statuses: Record<string, number> = {};
    for (let i = 0; i < entries.length; i++) {
      const cur = entries[i]!;
      statuses[String(cur.status)] = (statuses[String(cur.status)] ?? 0) + 1;
      if (i > 0) {
        const gap = cur.t - entries[i - 1]!.t;
        minGap = minGap === null ? gap : Math.min(minGap, gap);
      }
      while (cur.t - entries[lo]!.t >= 1000) lo++;
      maxInWindow = Math.max(maxInWindow, i - lo + 1);
    }
    const first = entries[0]!.t;
    const last = entries[entries.length - 1]!.t;
    out.push({
      bucket,
      requests: entries.length,
      minGapMs: minGap,
      meanRatePerS: entries.length > 1 && last > first ? ((entries.length - 1) * 1000) / (last - first) : null,
      maxInAnySecond: maxInWindow,
      limitPerS: BUCKET_LIMIT_PER_S[bucket],
      statuses,
    });
  }
  return out;
}

/** One human line per bucket, for the CLIs' closing summary. */
export function formatRateStats(stats: readonly BucketStats[]): string {
  const lines = ['requests (measured from the client log):'];
  for (const s of stats) {
    const limit = s.limitPerS === null ? 'no limit' : `limit ${s.limitPerS < 1 ? s.limitPerS.toFixed(2) : String(s.limitPerS)}/s`;
    const within = s.limitPerS === null ? '' : s.maxInAnySecond <= Math.max(1, Math.floor(s.limitPerS)) ? '  OK' : '  OVER LIMIT';
    const rate = s.meanRatePerS === null ? '—' : `${s.meanRatePerS.toFixed(2)}/s`;
    const gap = s.minGapMs === null ? '—' : `${String(s.minGapMs)} ms`;
    const statuses = Object.entries(s.statuses)
      .map(([k, v]) => `${k}×${String(v)}`)
      .join(' ');
    lines.push(
      `  ${s.bucket.padEnd(8)} ${String(s.requests).padStart(5)} req  mean ${rate.padStart(8)}  min gap ${gap.padStart(7)}  max in any 1 s: ${String(s.maxInAnySecond)} (${limit})${within}  [${statuses}]`,
    );
  }
  return lines.join('\n');
}
