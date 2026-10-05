#!/usr/bin/env node
// mtg-table — tools/coach-helper.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE COACH HELPER (D292): AI coaching for ForgeCoach with no API key, through
// the Claude Code CLI already logged in on this machine.  ForgeCoach
// (https://jalirkan.github.io/ForgeCoach/) calls it over HTTP; it runs
// `claude -p` (headless Claude Code) with every tool off and streams the answer
// back as NDJSON.  Plain Node 22+, no dependencies.  scripts/play.sh starts it
// beside the engine when `claude` is on PATH (--no-coach skips it).
//
//   node tools/coach-helper.mjs                      # http://127.0.0.1:8643
//   node tools/coach-helper.mjs --port 8700          # config.json `coachPort` otherwise
//   node tools/coach-helper.mjs --queue-max 2        # questions that may wait (default 4; 0 = refuse, D325)
//   COACH_HELPER_TOKEN=<T> node tools/coach-helper.mjs --lan [--ws-port 8642]
//   node tools/coach-helper.mjs --lan --token <T>    # the same; the env keeps <T> off `ps`
//   node tools/coach-helper.mjs --match-dir var/match --supervisor <play.sh's pid>   # D303, play.sh does this
//   node tools/coach-helper.mjs --eval-model var/ml/models/night-1-eval.json        # D361 (that path is the default
//                                                    when the file exists; --no-eval turns /eval off)
//   node tools/coach-helper.mjs --eval-model a.json,b.json,c.json                   # D368: an ensemble (or a
//                                                    directory, or an ensemble.json manifest): mean, sd, n
//
// THE CONTRACT (ForgeCoach is built against exactly this):
//
//   GET  /health  -> 200 {"ok":true,"helper":1,"claude":"<claude --version>","models":["opus","sonnet","haiku"],
//                          "thinking":["off","low","default"],"vision":1}   ("thinking": D346, "vision": D362)
//                 (+ "match": 0|1 and, with the launcher, "engine": "running"|"idle", D303/D308)
//                    or 200 {"ok":false,"helper":1,"error":"<plain words>"} when `claude`
//                    is missing or `claude --version` fails.  It does not prove a login:
//                    only a real call can, and a logged-out CLI answers /coach with the
//                    error line below.
//   POST /coach   {"system": string, "user": string, "model"?: "opus"|"sonnet"|"haiku",
//                  "supersedes"?: string, "thinking"?: "off"|"low"|"default"}
//                 (default "sonnet"; body at most 512 KB, else 413)
//                 -> 200 Content-Type: application/x-ndjson, one JSON object a line:
//                    {"type":"text","text":"<delta>"}            ... the answer, as it streams
//                    {"type":"thinking","text":"<delta>"}        ... only when the CLI shows any
//                    then EXACTLY ONE of
//                    {"type":"done","stopReason":<string|null>,"model":"<model that answered>"}
//                    {"type":"error","message":"<plain words>"}
//                 400 / 403 / 404 / 405 / 413 / 429 carry one {"type":"error","message":...}
//                 JSON body.  A client that disconnects kills the `claude` process
//                 and its whole process group.
//
//   POST /vision  {"system": string, "user": string, "images": [{"mediaType": "image/jpeg"|"image/png"
//                  |"image/webp"|"image/gif", "data": "<base64>"}, ...1-8], "model"?, "supersedes"?,
//                  "thinking"?}   -- PHOTOS (D362): the same question as /coach with images
//                 beside the text (ForgeCoach's photo-to-pool reads a drafted pool off a photo).
//                 Each image's data at most 5 MB of base64, the body at most 24 MB, else 413;
//                 anything else wrong with "images" is 400.  The same queue, the same stream,
//                 the same terminal line as /coach.  The images reach the CLI on STDIN, as
//                 one stream-json user message (`--input-format stream-json`) of image
//                 blocks and the text: never a file, never argv, and still no tool, so the
//                 model sees the pictures and nothing else.  /health carries "vision": 1.
//
//   GET  /review, POST /review, GET /review/<id>  -- THE POST-GAME REVIEW (D353):
//                 run tools/coach-grade.sh review on a game the engine wrote
//                 (var/games/<gameId>/frames.jsonl), one at a time, and fetch its
//                 report.  tools/review-runner.mjs's header is that contract
//                 (docs/game-review.md the copyable form); /health carries
//                 "review": 1 when the bridge is built (else 0), --no-review
//                 turns it off, --review-jobs N (default: cores - 1, at most 7).
//
//   POST /eval    -- THE WIN CHANCE (D361): the learned position evaluator's
//                 P(the viewing seat wins) for one state ForgeCoach shows, from a model
//                 on this machine (--eval-model; default var/ml/models/night-1-eval.json
//                 when it exists).  tools/eval-runner.mjs's header is that contract;
//                 /health carries "eval": 1 (and "evalModel", "evalSchema") only once
//                 the model has loaded and passed its schema checks, else "eval": 0.
//                 D368: --eval-model may name an ensemble (a,b,c / a directory / a
//                 manifest; the default prefers var/ml/models/night-1-ensemble.json),
//                 answers then carry "sd" and "n"; "explain": true (or ?explain=1)
//                 adds the attributions; /health says "evalEnsemble" and "evalExplain".
//                 --no-eval turns it off; --eval-python, --eval-schema <schemaId> (refuse
//                 another), --eval-cube <cube.md> (refuse another card list).
//
//   GET  /match, POST /match  -- THE MATCH LAUNCHER (D303): start a match with two
//                 decks the browser built.  tools/match-launcher.mjs's header is that
//                 contract; /health then carries "match": 1 (else "match": 0).  Only
//                 when scripts/play.sh started this helper (--match-dir, --supervisor):
//                 play.sh owns the engine and restarts it.
//
//   ONE QUESTION AT A TIME, THE REST IN A QUEUE (D325).  Claude Code runs one
//   question at a time.  A /coach that arrives while one runs is QUEUED, first in
//   first out, up to --queue-max (default 4) waiting; past that it is answered
//   429 {"type":"error","message":"the coach is busy ..."} with Retry-After: 2.
//   A queued question gets its 200 at once and, before anything else,
//                    {"type":"queued","position":<n>}   n = questions ahead of it
//                                                       (sent again when n drops)
//                    {"type":"running"}                 when its turn comes
//   then the stream above.  A question that never waited gets neither line (an
//   older client ignores both: they are not text, done or error).  A queued
//   question whose client disconnects leaves the queue; a running one is
//   cancelled, its `claude` killed.
//
//   SUPERSEDING.  /coach also takes "supersedes": "<key>" (a string of 1-200
//   characters, e.g. ForgeCoach's "live coach of this tab").  A new question with
//   a key ends every QUEUED question with the same key at once with
//                    {"type":"error","code":"superseded","message":"superseded by a newer question"}
//   (its one terminal line) and takes its place at the back of the queue.  A
//   RUNNING question is never superseded: the client cancels it by disconnecting.
//
//   THINKING (D346).  /coach also takes "thinking": "off" | "low" | "default"
//   (absent = "default"; anything else, null included, is 400).  It caps the
//   model's extended thinking through the two environment variables Claude Code
//   documents for it (code.claude.com/docs/en/env-vars, model-config "Extended
//   thinking" and "Adjust effort level"), set on the child's env and nowhere else:
//                    default  the env as it is (exactly the run before D346)
//                    low      MAX_THINKING_TOKENS=1024 CLAUDE_CODE_EFFORT_LEVEL=low
//                    off      MAX_THINKING_TOKENS=0    CLAUDE_CODE_EFFORT_LEVEL=low
//   MAX_THINKING_TOKENS is the fixed budget of a model with no effort levels
//   (Haiku: 0 turns thinking off, 1024 is the CLI's floor); the effort level is
//   what a model with adaptive reasoning reads instead (Sonnet, Opus), whose
//   thinking cannot be turned off, so "off" is "as little as it allows" there.
//   /health advertises "thinking": ["off","low","default"]; an older helper has
//   no such key and would ignore the field.
//
//   /health then also carries "concurrency": 1, "queue": {"max": <n>, "length":
//   <waiting now>}, "running": 0|1 and "supersedes": 1.  An older helper has none
//   of these: a client that finds no "queue" must expect 429 to a second question.
//
// WHO MAY CALL IT (amendments M50 and M51's rules, applied to this port):
//
//   - It binds 127.0.0.1, and (D386) refuses 403 any request whose socket's
//     remote address is not loopback, whatever the bind; with --lan it binds
//     0.0.0.0, and then every request from a non-loopback peer must carry the
//     pairing token -- `?token=<T>` or the header `X-ForgeCoach-Token` -- or is
//     403.  Compared as SHA-256 digests with crypto.timingSafeEqual; never logged
//     (a logged path is cut at its `?`).  A loopback peer never needs it.  An
//     OPTIONS preflight needs no token (a browser cannot add one to it), only an
//     allowed Origin.
//   - Host (D386): a loopback peer's Host must be localhost (or *.localhost) or a
//     loopback IP literal (127.0.0.0/8, [::1], [::ffff:127.x.x.x]), any valid
//     port; anything else is 403 -- a page that rebound its name to 127.0.0.1,
//     whose same-origin GETs carry no Origin, a tunnel's hostname, or a port
//     relay (socat, ssh -L) that kept its client's Host.  admit() is the whole
//     door as one decision.  Both refusals' messages start "origin refused:" so a
//     client that sorts refusals by the word "origin" (ForgeCoach's
//     refusedMessage) does not call them a token problem.
//   - Origin: allowed if it matches config.json's `wsAllowedOrigins` (the bridge's
//     M50 list, read the same way: MTG_TABLE_CONFIG, else the repo's config.json;
//     default http://127.0.0.1:*, http://localhost:*, https://jalirkan.github.io).
//     With --lan, a NON-LOOPBACK peer is also allowed the origin of the page the
//     bridge served it: http://<the request's Host> as M51 says, and -- because that
//     page lives on the bridge's port, not this one -- http://<Host's name>:<wsPort>
//     (config.json `wsPort`, --ws-port).  A loopback peer gets the list alone, so a
//     name that rebinds to 127.0.0.1 is still refused.  No Origin at all is allowed
//     from loopback only (curl, Node).  Anything else: 403.
//   - CORS: an allowed Origin is echoed in Access-Control-Allow-Origin (with Vary:
//     Origin); a preflight is 204 with Allow-Methods GET, POST, OPTIONS, Allow-Headers
//     Content-Type, X-ForgeCoach-Token, and Access-Control-Allow-Private-Network: true
//     (Chrome's private network access, an https github.io page calling 127.0.0.1).
//
// HOW IT RUNS CLAUDE (each flag checked against Claude Code 2.1.287's own --help
// and a real call; D292 says why each one is there):
//
//   claude -p --output-format stream-json --include-partial-messages --verbose
//          --model <alias> --system-prompt <system>      (--system-prompt-file <tmp>
//                                                          when it is over 100 KB:
//                                                          Linux caps one argv string
//                                                          at 128 KB)
//          --tools "" --strict-mcp-config --no-session-persistence
//          --permission-mode dontAsk --max-turns 1
//          [--safe-mode] [--disable-slash-commands]       (when this CLI's --help has them)
//          [--input-format stream-json]                   (/vision only, D362: stdin is one
//                                                          {"type":"user","message":{...}} line)
//
//   with the user text on STDIN (never argv), in a fresh empty temp directory
//   (removed afterwards), as the leader of its own process group.  NEVER
//   --dangerously-skip-permissions: with no tools there is nothing to permit, and
//   dontAsk denies whatever is not pre-approved instead of asking.
//
// Run from the repo root (hard rule 9), like every tool here.  Its self-test is
// tools/coach-helper-selftest.mjs (a fake `claude` on PATH; gate step 12f, CI).

import { execFile, spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { BlockList, isIP } from 'node:net';
import { availableParallelism, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_MATCH_BODY, createMatchLauncher } from './match-launcher.mjs';
import { MAX_REVIEW_BODY, createReviewRunner, cleanOld } from './review-runner.mjs';
import { MAX_EVAL_BODY, createEvalRunner, resolveEvalModel, resolveEvalPython } from './eval-runner.mjs';

export const HELPER_VERSION = 1;
export const MODELS = ['opus', 'sonnet', 'haiku'];
export const DEFAULT_MODEL = 'sonnet';
export const DEFAULT_PORT = 8643;
export const THINKING = ['off', 'low', 'default'];   // D346
/** The child's extra environment for a "thinking" value (D346); {} for "default". */
export function thinkingEnv(thinking) {
  if (thinking === 'off') return { MAX_THINKING_TOKENS: '0', CLAUDE_CODE_EFFORT_LEVEL: 'low' };
  if (thinking === 'low') return { MAX_THINKING_TOKENS: '1024', CLAUDE_CODE_EFFORT_LEVEL: 'low' };
  return {};
}
export const MAX_BODY = 512 * 1024;
// D362: /vision.  The API takes at most 5 MB an image; ForgeCoach sends JPEGs of about 0.3-0.6 MB.
export const MAX_VISION_BODY = 24 * 1024 * 1024;
export const MAX_VISION_IMAGES = 8;
export const MAX_IMAGE_BASE64 = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const DEFAULT_QUEUE_MAX = 4;
export const MAX_SUPERSEDE_KEY = 200;
export const DEFAULT_ALLOWED_ORIGINS = ['http://127.0.0.1:*', 'http://localhost:*', 'https://jalirkan.github.io'];
const ORIGIN_ENTRY = /^(http|https):\/\/[a-z0-9.-]+(:([0-9]{1,5}|\*))?$/;
const ARGV_SYSTEM_MAX = 100 * 1024;
const NOT_INSTALLED = 'the claude CLI is not installed or not on PATH — install Claude Code, then run `claude` once in a terminal to log in';
const NOT_LOGGED_IN = 'not logged in — run `claude` once in a terminal to log in';

// ---------------------------------------------------------------------------
// The pieces the self-test checks directly.
// ---------------------------------------------------------------------------

/** M50's originAllowed, the bridge's WsTransport.originAllowed in JS: exact, or a `:*` entry with any port or none. */
export function originAllowed(origin, allow) {
  const o = String(origin).trim().toLowerCase();
  for (const a of allow) {
    if (a.endsWith(':*')) {
      const base = a.slice(0, -2);
      if (o === base) return true;
      if (o.startsWith(base + ':') && /^[0-9]{1,5}$/.test(o.slice(base.length + 1))) return true;
    } else if (o === a) {
      return true;
    }
  }
  return false;
}

/** `name[:port]` of a Host header or an http origin, lowercased; null if it is neither. */
function hostPort(s, defaultPort) {
  const m = /^([a-z0-9.-]+)(?::([0-9]{1,5}))?$/.exec(String(s).trim().toLowerCase());
  return m ? { host: m[1], port: m[2] ? Number(m[2]) : defaultPort } : null;
}

/**
 * M51's own-page rule, for this port: an `http://` origin whose host is the
 * request's Host name and whose port is the Host's own (http://<Host>, M51
 * verbatim) or the bridge's ws port (where the LAN page really lives).
 */
export function lanOwnOrigin(origin, hostHeader, wsPort) {
  if (!origin || !hostHeader) return false;
  const o = String(origin).trim().toLowerCase();
  if (!o.startsWith('http://')) return false;
  const oh = hostPort(o.slice('http://'.length), 80);
  const hh = hostPort(hostHeader, 80);
  if (!oh || !hh || oh.host !== hh.host) return false;
  return oh.port === hh.port || oh.port === Number(wsPort);
}

export function isLoopback(addr) {
  if (!addr) return false;
  const a = addr.startsWith('::ffff:') ? addr.slice(7) : addr;
  return a === '::1' || /^127\./.test(a);
}

export function tokenMatches(given, token) {
  if (typeof given !== 'string' || typeof token !== 'string' || token === '') return false;
  const d = (s) => createHash('sha256').update(s, 'utf8').digest();
  return timingSafeEqual(d(given), d(token));
}

/**
 * D386: a Host header a LOOPBACK peer may send -- `localhost` (or a name under
 * `.localhost`, which browsers resolve to loopback themselves), or a LOOPBACK
 * IP literal (`127.0.0.0/8`, `[::1]`, `[::ffff:127.x.x.x]`), with an optional
 * port of at most 65535.  A DNS name is refused: from a loopback peer it is
 * either a page that rebound its own name to 127.0.0.1 (a same-origin GET
 * carries no Origin, so the Origin rule alone let it read /health, /match and
 * /review) or a tunnel's public hostname, and neither may reach this port.  Any
 * other IP literal (`192.168.1.5:9000`, `0.0.0.0`) is refused too: a port relay
 * (socat, `ssh -L`) also arrives from loopback, and keeps the Host its client
 * typed.  A missing Host is refused.
 */
const LOOPBACK_IPS = new BlockList();
LOOPBACK_IPS.addSubnet('127.0.0.0', 8, 'ipv4');
LOOPBACK_IPS.addAddress('::1', 'ipv6');   // also matches ::ffff:127.x.x.x

export function loopbackHostOk(hostHeader) {
  if (typeof hostHeader !== 'string') return false;
  const h = hostHeader.trim().toLowerCase();
  const m = /^(?:\[([0-9a-f:.]+)\]|([a-z0-9.-]+))(?::([0-9]{1,5}))?$/.exec(h);
  if (!m || (m[3] !== undefined && Number(m[3]) > 65535)) return false;
  if (m[1] !== undefined) return isIP(m[1]) === 6 && LOOPBACK_IPS.check(m[1], 'ipv6');
  const name = m[2];
  if (name === 'localhost' || name.endsWith('.localhost')) return true;
  return isIP(name) === 4 && LOOPBACK_IPS.check(name, 'ipv4');
}

/**
 * D386: the whole door of this port as one pure decision, in order -- the peer,
 * its Host, then (M51's order) the Origin for a preflight, the token, the Origin
 * for the rest.  Returns { ok: true, cors, preflight } or { ok: false, status,
 * why, message }.  `given` is the token the request presented (query or header).
 *
 *   - a non-loopback peer is refused unless this is a --lan helper (the bind is
 *     127.0.0.1 then, so this only matters if the bind ever changes -- or for a
 *     proxy in front of it -- and it is checked on the socket's REMOTE address);
 *   - a loopback peer must name the host as localhost or a loopback IP literal
 *     (loopbackHostOk: DNS rebinding, and a tunnel's hostname);
 *   - Origin: the allowlist; with --lan, a non-loopback peer also the bridge's own
 *     LAN page (lanOwnOrigin); no Origin from loopback only;
 *   - an OPTIONS preflight needs only the Origin (a browser cannot add a token);
 *   - with --lan, every other request from a non-loopback peer needs the token.
 */
export function admit({ loop, lan, host, origin, origins, wsPort, method, given, token }) {
  if (!loop && !lan) return { ok: false, status: 403, why: 'peer', message: 'origin refused: this coach helper answers this machine only (play.sh --lan for a phone)' };
  if (loop && !loopbackHostOk(host)) return { ok: false, status: 403, why: 'host', message: 'origin refused: Host is not a loopback name (call http://127.0.0.1 or http://localhost)' };
  const originOk = origin === undefined ? loop
    : originAllowed(origin, origins) || (lan && !loop && lanOwnOrigin(origin, host, wsPort));
  const cors = originOk && origin !== undefined ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  if (method === 'OPTIONS') {
    return originOk ? { ok: true, cors, preflight: true } : { ok: false, status: 403, why: 'origin', message: 'origin not allowed' };
  }
  if (lan && !loop && !tokenMatches(given, token)) return { ok: false, status: 403, why: 'token', message: 'pairing token missing or wrong' };
  if (!originOk) return { ok: false, status: 403, why: 'origin', message: 'origin not allowed' };
  return { ok: true, cors, preflight: false };
}

/** Plain words for a failed call, from whatever the CLI said. */
export function plainError({ code, status, text, stderr, model }) {
  const said = [text, stderr].filter(Boolean).join(' ').trim();
  const tail = said ? ` (${said.slice(0, 240)})` : '';
  if (code === 'authentication_failed' || status === 401 || status === 403
      || /not logged in|invalid api key|please run \/login|\/login|oauth token|authenticat/i.test(said)) {
    return NOT_LOGGED_IN;
  }
  if (code === 'rate_limit' || status === 429 || /rate.?limit|usage limit|limit reached|out of extra usage/i.test(said)) {
    return `Claude usage limit reached — try again later${tail}`;
  }
  if (code === 'billing_error' || /credit balance|billing/i.test(said)) return `Claude account billing problem${tail}`;
  if (code === 'model_not_found' || status === 404) return `the model "${model}" is not available to this Claude account${tail}`;
  if (/unknown option|unrecognized option|unknown argument/i.test(said)) {
    return `this claude CLI is too old for the coach helper — update Claude Code (claude update)${tail}`;
  }
  if (code === 'server_error' || status === 500 || status === 529 || /overloaded/i.test(said)) {
    return `Claude is overloaded or had a server error — try again in a moment${tail}`;
  }
  return said ? `Claude Code failed: ${said.slice(0, 300)}` : 'Claude Code failed with no message';
}

/**
 * Turns the CLI's stream-json lines into the contract's NDJSON events.
 * `push(line)` per stdout line; `end(exit)` when the process is gone.  `emit`
 * gets each event; exactly one terminal event is emitted, ever.
 */
export function makeTranslator(emit, requestedModel) {
  let model = null;
  let stopReason = null;
  let sawText = false;
  let apiError = null;
  let finished = false;
  const finish = (ev) => {
    if (finished) return;
    finished = true;
    emit(ev);
  };
  return {
    get finished() { return finished; },
    push(line) {
      if (finished || !line.trim()) return;
      let o;
      try { o = JSON.parse(line); } catch { return; }
      if (!o || typeof o !== 'object') return;
      if (o.type === 'system' && o.subtype === 'init' && typeof o.model === 'string' && !model) model = o.model;
      if (o.type === 'stream_event' && o.event) {
        const e = o.event;
        if (e.type === 'message_start' && e.message && typeof e.message.model === 'string') model = e.message.model;
        else if (e.type === 'content_block_delta' && e.delta) {
          if (e.delta.type === 'text_delta' && typeof e.delta.text === 'string' && e.delta.text !== '') {
            sawText = true;
            emit({ type: 'text', text: e.delta.text });
          } else if (e.delta.type === 'thinking_delta' && typeof e.delta.thinking === 'string' && e.delta.thinking !== '') {
            emit({ type: 'thinking', text: e.delta.thinking });
          }
        } else if (e.type === 'message_delta' && e.delta && 'stop_reason' in e.delta) {
          stopReason = e.delta.stop_reason ?? stopReason;
        }
      } else if (o.type === 'assistant' && (o.error || o.is_api_error_message)) {
        const blocks = (o.message && Array.isArray(o.message.content)) ? o.message.content : [];
        apiError = { code: o.error ?? null, text: blocks.filter((b) => b && b.type === 'text').map((b) => b.text).join(' ') };
      } else if (o.type === 'rate_limit_event' && o.rate_limit_info && o.rate_limit_info.status === 'rejected') {
        apiError = apiError ?? { code: 'rate_limit', text: '' };
      } else if (o.type === 'result') {
        if (o.is_error || apiError) {
          finish({
            type: 'error',
            message: plainError({
              code: apiError?.code, status: o.api_error_status ?? undefined,
              text: apiError?.text || (typeof o.result === 'string' ? o.result : '') || (Array.isArray(o.errors) ? o.errors.join('; ') : ''),
              model: requestedModel,
            }),
          });
          return;
        }
        if (!sawText && typeof o.result === 'string' && o.result !== '') emit({ type: 'text', text: o.result });
        if (!model && o.modelUsage && typeof o.modelUsage === 'object') model = Object.keys(o.modelUsage)[0] ?? null;
        finish({ type: 'done', stopReason: stopReason ?? o.stop_reason ?? null, model: model ?? requestedModel });
      }
    },
    end({ code, signal, spawnError, stderr, cancelled }) {
      if (finished) return;
      if (cancelled) { finished = true; return; }
      if (spawnError && spawnError.code === 'ENOENT') { finish({ type: 'error', message: NOT_INSTALLED }); return; }
      if (spawnError) { finish({ type: 'error', message: `could not start claude: ${spawnError.message}` }); return; }
      if (apiError) { finish({ type: 'error', message: plainError({ ...apiError, stderr, model: requestedModel }) }); return; }
      const how = signal ? `was stopped by ${signal}` : `exited with status ${code}`;
      const said = (stderr || '').trim().split('\n').filter(Boolean).slice(-3).join(' ');
      finish({ type: 'error', message: said ? plainError({ stderr: said, model: requestedModel }) : `Claude Code ${how} before it answered` });
    },
  };
}

// ---------------------------------------------------------------------------
// Configuration.
// ---------------------------------------------------------------------------

function readConfig() {
  const file = process.env.MTG_TABLE_CONFIG || fileURLToPath(new URL('../config.json', import.meta.url));
  let c = {};
  try { c = JSON.parse(readFileSync(file, 'utf8')); } catch (e) {
    if (e.code !== 'ENOENT') throw new Error(`cannot read ${file}: ${e.message}`);
  }
  const origins = c.wsAllowedOrigins ?? DEFAULT_ALLOWED_ORIGINS;
  if (!Array.isArray(origins)) throw new Error(`"wsAllowedOrigins" in ${file} is not an array of strings`);
  for (const o of origins) {
    if (typeof o !== 'string' || !ORIGIN_ENTRY.test(o)) throw new Error(`"wsAllowedOrigins" in ${file} holds a bad entry: ${JSON.stringify(o)}`);
  }
  return { file, coachPort: c.coachPort, wsPort: c.wsPort, origins, forgeHome: typeof c.forgeHome === 'string' ? c.forgeHome : 'forge-home', repoRoot: typeof c.repoRoot === 'string' ? c.repoRoot : fileURLToPath(new URL('..', import.meta.url)) };
}

function parseArgs(argv) {
  const a = { port: undefined, lan: false, token: process.env.COACH_HELPER_TOKEN || '', wsPort: undefined, queueMax: DEFAULT_QUEUE_MAX, timeoutS: 300,
    matchDir: undefined, supervisor: undefined, matchTimeoutS: 180, cardsZip: undefined,
    review: true, reviewJobs: undefined, reviewQueueMax: 2,
    eval: true, evalModel: undefined, evalPython: undefined, evalSchema: undefined, evalCube: undefined };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    const val = () => {
      if (i + 1 >= argv.length) throw new Error(`${f} needs a value`);
      return argv[++i];
    };
    if (f === '--port') a.port = Number(val());
    else if (f === '--lan') a.lan = true;
    else if (f === '--token') a.token = val();
    else if (f === '--ws-port') a.wsPort = Number(val());
    else if (f === '--queue-max') a.queueMax = Number(val());
    else if (f === '--busy-wait') val();   // before D325: the wait before a 429; the queue replaced it (accepted, ignored)
    else if (f === '--timeout') a.timeoutS = Number(val());
    else if (f === '--match-dir') a.matchDir = val();
    else if (f === '--supervisor') a.supervisor = Number(val());
    else if (f === '--match-timeout') a.matchTimeoutS = Number(val());
    else if (f === '--cards-zip') a.cardsZip = val();
    else if (f === '--no-review') a.review = false;
    else if (f === '--review-jobs') a.reviewJobs = Number(val());
    else if (f === '--review-queue-max') a.reviewQueueMax = Number(val());
    else if (f === '--no-eval') a.eval = false;
    else if (f === '--eval-model') a.evalModel = val();
    else if (f === '--eval-python') a.evalPython = val();
    else if (f === '--eval-schema') a.evalSchema = val();
    else if (f === '--eval-cube') a.evalCube = val();
    else if (f === '--help' || f === '-h') a.help = true;
    else throw new Error(`unknown flag ${f} (--help)`);
  }
  return a;
}

// ---------------------------------------------------------------------------
// The CLI.
// ---------------------------------------------------------------------------

let cliInfo = null;   // { at, ok, version, error, help }

function run(file, args, timeoutMs) {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: timeoutMs, maxBuffer: 4 << 20, cwd: tmpdir() }, (error, stdout, stderr) => {
      resolve({ error, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

async function claudeInfo(maxAgeMs = 60_000) {
  if (cliInfo && Date.now() - cliInfo.at < maxAgeMs) return cliInfo;
  const v = await run('claude', ['--version'], 15_000);
  if (v.error) {
    const error = v.error.code === 'ENOENT' ? NOT_INSTALLED
      : `\`claude --version\` failed${v.error.killed ? ' (timed out)' : ''}: ${(v.stderr || v.stdout || v.error.message).trim().slice(0, 200)}`;
    cliInfo = { at: Date.now(), ok: false, error, help: '' };
    return cliInfo;
  }
  const h = await run('claude', ['--help'], 15_000);
  cliInfo = { at: Date.now(), ok: true, version: v.stdout.trim(), help: h.error ? '' : h.stdout + h.stderr };
  return cliInfo;
}

/** Why `images` is not a /vision body's images (D362), or null when it is. */
export function imagesProblem(images) {
  if (!Array.isArray(images) || images.length < 1 || images.length > MAX_VISION_IMAGES) return `"images" must be an array of 1-${MAX_VISION_IMAGES} images`;
  for (const [i, im] of images.entries()) {
    const n = i + 1;
    if (!im || typeof im !== 'object' || Array.isArray(im)) return `image ${n} is not {"mediaType", "data"}`;
    for (const k of Object.keys(im)) if (k !== 'mediaType' && k !== 'data') return `image ${n} has an unknown field "${k}"`;
    if (!IMAGE_TYPES.includes(im.mediaType)) return `image ${n}: "mediaType" must be one of ${IMAGE_TYPES.join(', ')}`;
    if (typeof im.data !== 'string' || im.data.length < 16) return `image ${n}: "data" must be base64`;
    if (im.data.length > MAX_IMAGE_BASE64) return `image ${n} is too large (at most 5 MB of base64)`;
    if (im.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(im.data)) return `image ${n}: "data" must be base64`;
  }
  return null;
}

/** The one stream-json line a /vision question is on the CLI's stdin (D362): its images, then its text. */
export function visionInput(user, images) {
  const content = images.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } }));
  content.push({ type: 'text', text: user });
  return JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n';
}

export function claudeArgs({ model, systemArg, help, streamInput = false }) {
  const args = ['-p', ...(streamInput ? ['--input-format', 'stream-json'] : []), '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
    '--model', model, ...systemArg,
    '--tools', '', '--strict-mcp-config', '--no-session-persistence',
    '--permission-mode', 'dontAsk', '--max-turns', '1'];
  if (/--safe-mode\b/.test(help)) args.push('--safe-mode');
  if (/--disable-slash-commands\b/.test(help)) args.push('--disable-slash-commands');
  return args;
}

// ---------------------------------------------------------------------------
// The server.
// ---------------------------------------------------------------------------

export function startHelper(opts) {
  const { port, lan, token, wsPort, origins, queueMax = DEFAULT_QUEUE_MAX, timeoutS, match = null, review = null, evaluator = null, log = (s) => console.log(s) } = opts;
  // D386: the address to bind.  Only the self-test passes `bindHost` (a non-LAN
  // helper on 0.0.0.0, to prove admit() refuses a non-loopback peer by its
  // address and not by the bind); the CLI never does.
  const bindHost = opts.bindHost ?? (lan ? '0.0.0.0' : '127.0.0.1');
  let active = null;          // { kill() } of the running question
  const queue = [];           // waiting questions, oldest first: { key, go(), supersede(), position(n) }
  const pump = () => {
    if (active || !queue.length) return;
    const next = queue.shift();
    active = { kill: () => {} };   // reserved now, so nothing can start between here and its turn
    queue.forEach((w, i) => w.position(i + 1));
    next.go(active);
  };
  const live = new Set();     // every child still alive, for shutdown

  const send = (res, status, obj, headers = {}) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': Buffer.byteLength(body), ...headers });
    res.end(body);
  };

  const server = createServer(async (req, res) => {
    const t0 = Date.now();
    const peer = req.socket.remoteAddress;
    const loop = isLoopback(peer);
    const url = new URL(req.url ?? '/', 'http://helper.invalid');
    const path = url.pathname;
    const origin = req.headers.origin;
    const say = (status, extra = '') => log(`COACH ${req.method} ${path} from ${peer}${origin ? ` origin ${origin}` : ''} -> ${status}${extra}`);

    // D386: the peer and its Host, then M51's order -- Origin first for a
    // preflight (it carries no token), token first for the rest (admit()).
    const gate = admit({ loop, lan, host: req.headers.host, origin, origins, wsPort, method: req.method,
      given: url.searchParams.get('token') ?? req.headers['x-forgecoach-token'], token });
    if (!gate.ok) {
      send(res, gate.status, { type: 'error', message: gate.message });
      say(gate.status, ` (${gate.why})`);
      return;
    }
    const cors = gate.cors;

    if (gate.preflight) {
      res.writeHead(204, {
        ...cors,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-ForgeCoach-Token',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Max-Age': '600',
        'Content-Length': '0',
      });
      res.end();
      say(204);
      return;
    }

    if (path === '/health') {
      if (req.method !== 'GET') { send(res, 405, { type: 'error', message: 'use GET' }, { ...cors, Allow: 'GET, OPTIONS' }); say(405); return; }
      const info = await claudeInfo();
      const matchCap = match && match.available() ? 1 : 0;   // D303
      const eng = matchCap ? { ...match.engine(), ...match.aiChoices?.() } : null;   // D308: engine running | idle; D333: aiPolicies
      const q = { concurrency: 1, queue: { max: queueMax, length: queue.length }, running: active ? 1 : 0, supersedes: 1 };   // D325
      const rv = review ? review.health() : { review: 0 };   // D353
      const ev = evaluator ? evaluator.health() : { eval: 0 };   // D361
      send(res, 200, info.ok
        ? { ok: true, helper: HELPER_VERSION, claude: info.version, models: MODELS, thinking: THINKING, vision: 1, ...q, match: matchCap, ...eng, ...(matchCap ? { engine_start: 1, engine_start_profile: 1 } : {}), ...rv, ...ev }
        : { ok: false, helper: HELPER_VERSION, error: info.error, ...q, match: matchCap, ...eng, ...(matchCap ? { engine_start: 1, engine_start_profile: 1 } : {}), ...rv, ...ev }, cors);
      say(200, info.ok ? '' : ' (claude unavailable)');
      return;
    }
    if (path === '/match') {
      // D303: the match launcher (tools/match-launcher.mjs).  Behind the same gate as /coach.
      if (!match) { send(res, 503, { ok: false, type: 'error', message: 'the match launcher is off: this helper was not started by scripts/play.sh' }, cors); say(503); return; }
      if (req.method === 'GET') { const r = match.get(); send(res, r.status, r.body, cors); say(r.status); return; }
      if (req.method !== 'POST') { send(res, 405, { ok: false, type: 'error', message: 'use GET or POST' }, { ...cors, Allow: 'GET, POST, OPTIONS' }); say(405); return; }
      const raw = await readBody(req, res, MAX_MATCH_BODY, '64 KB', cors, say);
      if (raw === null) return;
      let q;
      try { q = JSON.parse(raw); } catch { send(res, 400, { ok: false, type: 'error', message: 'the body is not JSON' }, cors); say(400); return; }
      const r = await match.post(q);
      send(res, r.status, r.body, cors);
      say(r.status, r.status === 200 ? ` (${r.body.ms} ms)` : ` (${r.body.message.slice(0, 160)})`);
      return;
    }
    if (path === '/review' || path.startsWith('/review/')) {
      // D353: the post-game review (tools/review-runner.mjs).  Behind the same gate as /coach.
      if (!review) { send(res, 503, { ok: false, type: 'error', message: 'the review is off: this helper was started with --no-review' }, cors); say(503); return; }
      if (path === '/review' && req.method === 'POST') {
        const raw = await readBody(req, res, MAX_REVIEW_BODY, '256 KB', cors, say);
        if (raw === null) return;
        let q;
        try { q = JSON.parse(raw); } catch { send(res, 400, { ok: false, type: 'error', message: 'the body is not JSON' }, cors); say(400); return; }
        const r = review.post(q);
        send(res, r.status, r.body, cors);
        say(r.status, r.status === 202 ? ` (${r.body.id})` : ` (${r.body.message.slice(0, 160)})`);
        return;
      }
      if (req.method !== 'GET') { send(res, 405, { ok: false, type: 'error', message: path === '/review' ? 'use GET or POST' : 'use GET' }, { ...cors, Allow: path === '/review' ? 'GET, POST, OPTIONS' : 'GET, OPTIONS' }); say(405); return; }
      const r = path === '/review' ? review.list() : review.get(path.slice('/review/'.length));
      send(res, r.status, r.body, cors);
      say(r.status);
      return;
    }
    if (path === '/eval') {
      // D361: the win chance (tools/eval-runner.mjs).  Behind the same gate as /coach.
      if (req.method !== 'POST') { send(res, 405, { ok: false, type: 'error', message: 'use POST' }, { ...cors, Allow: 'POST, OPTIONS' }); say(405); return; }
      if (!evaluator) { send(res, 503, { ok: false, type: 'error', message: 'the win chance is off: this helper was started with --no-eval' }, cors); say(503); return; }
      const raw = await readBody(req, res, MAX_EVAL_BODY, '2 MB', cors, say);
      if (raw === null) return;
      let q;
      try { q = JSON.parse(raw); } catch { send(res, 400, { ok: false, type: 'error', message: 'the body is not JSON' }, cors); say(400); return; }
      // D368: ?explain=1 is the same as "explain": true in the body.
      if (url.searchParams.get('explain') === '1' && q && typeof q === 'object' && !Array.isArray(q)) q.explain = true;
      const r = await evaluator.post(q);
      send(res, r.status, r.body, cors);
      say(r.status, r.status === 200 ? ` (p ${r.body.p.toFixed(3)}${r.body.sd !== undefined ? ` sd ${r.body.sd.toFixed(3)}` : ''}${r.body.explain ? ', explained' : ''}, turn ${r.body.turn}, ${r.body.ms} ms)` : ` (${r.body.message.slice(0, 160)})`);
      return;
    }
    if (path === '/engine/start') {
      // D308: wake a sleeping engine (match-launcher.mjs `wake`); D381: on an optional {"aiProfile"}.  The same gate.
      if (!match) { send(res, 503, { ok: false, type: 'error', message: 'the match launcher is off: this helper was not started by scripts/play.sh' }, cors); say(503); return; }
      if (req.method !== 'POST') { send(res, 405, { ok: false, type: 'error', message: 'use POST' }, { ...cors, Allow: 'POST, OPTIONS' }); say(405); return; }
      const raw = await readBody(req, res, 4096, '4 KB', cors, say);
      if (raw === null) return;
      const r = await match.wake(raw);   // D381: no body, or {"aiProfile"}
      send(res, r.status, r.body, cors);
      say(r.status, r.status === 200 ? ` (${r.body.already ? 'already running' : r.body.ms + ' ms'})` : ` (${r.body.message.slice(0, 160)})`);
      return;
    }
    if (path !== '/coach' && path !== '/vision') { send(res, 404, { type: 'error', message: 'not found' }, cors); say(404); return; }
    if (req.method !== 'POST') { send(res, 405, { type: 'error', message: 'use POST' }, { ...cors, Allow: 'POST, OPTIONS' }); say(405); return; }
    const vision = path === '/vision';   // D362: the same question, with images

    // The body, at most MAX_BODY bytes (MAX_VISION_BODY for /vision).
    const body = await readBody(req, res, vision ? MAX_VISION_BODY : MAX_BODY, vision ? '24 MB' : '512 KB', cors, say);
    if (body === null) return;
    let q;
    try { q = JSON.parse(body); } catch { send(res, 400, { type: 'error', message: 'the body is not JSON' }, cors); say(400); return; }
    const model = q?.model ?? DEFAULT_MODEL;
    if (!q || typeof q.system !== 'string' || typeof q.user !== 'string' || q.user.trim() === '') {
      send(res, 400, { type: 'error', message: 'expected {"system": string, "user": non-empty string, "model"?: "opus"|"sonnet"|"haiku", "supersedes"?: string, "thinking"?: "off"|"low"|"default"}' }, cors);
      say(400);
      return;
    }
    const imgProblem = vision ? imagesProblem(q.images) : null;
    if (imgProblem) { send(res, 400, { type: 'error', message: imgProblem }, cors); say(400, ` (${imgProblem})`); return; }
    const nImages = vision ? q.images.length : 0;
    if (!MODELS.includes(model)) { send(res, 400, { type: 'error', message: `model must be one of ${MODELS.join(', ')}` }, cors); say(400); return; }
    const thinking = 'thinking' in q ? q.thinking : 'default';   // D346: absent only; null is not absent
    if (!THINKING.includes(thinking)) { send(res, 400, { type: 'error', message: `"thinking" must be one of ${THINKING.join(', ')}` }, cors); say(400); return; }
    const key = q.supersedes ?? null;
    if (key !== null && (typeof key !== 'string' || key.length < 1 || key.length > MAX_SUPERSEDE_KEY)) {
      send(res, 400, { type: 'error', message: `"supersedes" must be a string of 1-${MAX_SUPERSEDE_KEY} characters` }, cors);
      say(400);
      return;
    }

    // D325: one question at a time; the rest wait in a queue, oldest first.
    if (key !== null) for (const w of queue.filter((x) => x.key === key)) w.supersede();
    let headersSent = false;
    const writeHead = () => {
      if (headersSent) return;
      headersSent = true;
      res.writeHead(200, { ...cors, 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.flushHeaders();
    };
    const write = (ev) => { if (!res.destroyed && !res.writableEnded) res.write(JSON.stringify(ev) + '\n'); };
    let slot;
    if (active || queue.length) {
      if (queue.length >= queueMax) {
        send(res, 429, { type: 'error', message: 'the coach is busy with other questions — try again in a moment' }, { ...cors, 'Retry-After': '2' });
        say(429, ` (queue full: ${queue.length})`);
        return;
      }
      const turn = await new Promise((resolve) => {
        const w = {
          key,
          go: (reserved) => { off(); resolve(reserved); },
          supersede: () => {
            off();
            const i = queue.indexOf(w);
            if (i >= 0) queue.splice(i, 1);
            queue.forEach((x, j) => x.position(j + 1));
            write({ type: 'error', code: 'superseded', message: 'superseded by a newer question' });
            res.end();
            resolve('superseded');
          },
          position: (n) => write({ type: 'queued', position: n }),
        };
        const gone = () => {
          off();
          const i = queue.indexOf(w);
          if (i >= 0) { queue.splice(i, 1); queue.forEach((x, j) => x.position(j + 1)); }
          resolve('gone');
        };
        const off = () => res.off('close', gone);
        res.on('close', gone);
        queue.push(w);
        writeHead();
        w.position(queue.length);   // the running one plus those queued before it
      });
      if (turn === 'superseded') { say(200, ' (superseded while queued)'); return; }
      if (turn === 'gone') { say('-', ' (client left while queued)'); pump(); return; }
      slot = turn;
      write({ type: 'running' });
    } else {
      slot = { kill: () => {} };
      active = slot;
    }
    if (res.destroyed || req.socket.destroyed) {
      if (active === slot) active = null;
      say('-', ' (client left while waiting)');
      pump();
      return;
    }

    const info = await claudeInfo();
    writeHead();
    let outcome = '';
    const tr = makeTranslator((ev) => {
      write(ev);
      if (ev.type === 'done' || ev.type === 'error') {
        outcome = ev.type === 'done' ? `done ${ev.model} ${ev.stopReason}` : 'error';
        res.end();
        finishSlot();   // the answer is out: the next question need not wait for this process to exit
      }
    }, model);
    function finishSlot() { if (active === slot) { active = null; pump(); } }

    if (!info.ok) {
      tr.end({ spawnError: { code: 'ENOENT', message: info.error } });
      finishSlot();
      say(200, ` (${outcome}: claude unavailable)`);
      return;
    }

    const dir = mkdtempSync(join(tmpdir(), 'forgecoach-coach-'));
    let systemArg = ['--system-prompt', q.system];
    if (Buffer.byteLength(q.system, 'utf8') > ARGV_SYSTEM_MAX) {
      // Outside the working directory, so the CLI's cwd stays empty.
      const sp = join(mkdtempSync(join(tmpdir(), 'forgecoach-system-')), 'system.txt');
      writeFileSync(sp, q.system);
      systemArg = ['--system-prompt-file', sp];
    }
    const args = claudeArgs({ model, systemArg, help: info.help, streamInput: vision });
    let child;
    let stderr = '';
    let cancelled = false;
    let timedOut = false;
    const killGroup = (sig) => {
      if (!child || child.exitCode !== null || child.signalCode !== null) return;
      try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* gone */ } }
    };
    const stopChild = () => {
      killGroup('SIGTERM');
      setTimeout(() => killGroup('SIGKILL'), 2000).unref();
    };
    try {
      const extraEnv = thinkingEnv(thinking);   // D346: through the env, never argv or a shell
      child = spawn('claude', args, { cwd: dir, detached: true, stdio: ['pipe', 'pipe', 'pipe'],
        ...(Object.keys(extraEnv).length ? { env: { ...process.env, ...extraEnv } } : {}) });
    } catch (e) {
      tr.end({ spawnError: e });
      cleanup();
      finishSlot();
      say(200, ` (${outcome})`);
      return;
    }
    live.add(child);
    slot.kill = () => { cancelled = true; stopChild(); };
    const timer = setTimeout(() => { timedOut = true; stopChild(); }, timeoutS * 1000);
    res.on('close', () => {
      if (!tr.finished) { cancelled = true; stopChild(); }
    });
    child.stdin.on('error', () => { /* a child that died before reading */ });
    child.stdin.end(vision ? visionInput(q.user, q.images) : q.user);
    let buf = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        tr.push(line);
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { if (stderr.length < 16384) stderr += d; });
    let spawnError = null;
    child.on('error', (e) => { spawnError = e; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      live.delete(child);
      if (buf) tr.push(buf);
      // The leader is gone; anything it left in the group goes with it.
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* none */ }
      if (timedOut && !tr.finished) {
        tr.end({ spawnError: { message: `no answer within ${timeoutS} s` } });
      } else {
        tr.end({ code, signal, spawnError, stderr, cancelled });
      }
      cleanup();
      finishSlot();
      say(200, ` (${cancelled && !outcome ? 'cancelled: the client left' : outcome}; ${model}${thinking === 'default' ? '' : `; thinking ${thinking}`}${vision ? `; ${nImages} image${nImages === 1 ? '' : 's'}` : ''}; ${Date.now() - t0} ms)`);
    });
    function cleanup() {
      rmSync(dir, { recursive: true, force: true });
      if (systemArg[0] === '--system-prompt-file') rmSync(join(systemArg[1], '..'), { recursive: true, force: true });
    }
  });

  /** The whole body as a string, or null once a 413 (or a broken request) has been dealt with. */
  async function readBody(req, res, max, words, cors, say) {
    const tooLarge = () => {
      send(res, 413, { type: 'error', message: `request too large (at most ${words})` }, { ...cors, Connection: 'close' });
      say(413);
      req.destroy();
    };
    if (Number(req.headers['content-length'] ?? 0) > max) { tooLarge(); return null; }
    try {
      return await new Promise((resolve, reject) => {
        const parts = [];
        let n = 0;
        req.on('data', (c) => {
          n += c.length;
          if (n > max) { reject(Object.assign(new Error('too large'), { status: 413 })); return; }
          parts.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
        req.on('error', reject);
      });
    } catch (e) {
      if (e.status === 413) tooLarge();
      return null;
    }
  }

  server.on('clientError', (err, socket) => { socket.destroy(); });
  return {
    server,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, bindHost, () => resolve(server.address().port));
    }),
    close: () => {
      for (const c of live) { try { process.kill(-c.pid, 'SIGKILL'); } catch { /* gone */ } }
      review?.close();
      evaluator?.close();
      server.close();
      server.closeAllConnections?.();
    },
  };
}

async function main() {
  let a;
  let cfg;
  try {
    a = parseArgs(process.argv.slice(2));
    cfg = readConfig();
  } catch (e) {
    console.error(`coach-helper: ${e.message}`);
    process.exit(2);
  }
  if (a.help) {
    const src = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    console.log(src.slice(4, src.findIndex((l) => l.startsWith('import '))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return;
  }
  const port = a.port ?? (Number.isInteger(cfg.coachPort) ? cfg.coachPort : DEFAULT_PORT);
  const wsPort = a.wsPort ?? (Number.isInteger(cfg.wsPort) ? cfg.wsPort : 8642);
  if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error('coach-helper: --port must be a port number'); process.exit(2); }
  if (a.lan && !/^[A-Za-z0-9_-]{16,}$/.test(a.token)) {
    console.error('coach-helper: --lan needs the pairing token (COACH_HELPER_TOKEN or --token; 16+ characters of [A-Za-z0-9_-])');
    process.exit(2);
  }
  let match = null;
  if (a.matchDir !== undefined || a.supervisor !== undefined) {
    if (a.matchDir === undefined || !Number.isInteger(a.supervisor) || a.supervisor <= 1) {
      console.error('coach-helper: the match launcher needs both --match-dir <dir under var/> and --supervisor <pid>');
      process.exit(2);
    }
    const fh = resolve(cfg.repoRoot, cfg.forgeHome);
    try {
      match = createMatchLauncher({
        repoRoot: cfg.repoRoot, matchDir: a.matchDir, supervisorPid: a.supervisor,
        cardsZip: a.cardsZip ?? join(fh, 'res', 'cardsfolder', 'cardsfolder.zip'),
        customCardsDir: join(resolve(cfg.repoRoot), 'forge-home', 'custom-cards'),
        aiDir: join(fh, 'res', 'ai'),
        timeoutMs: a.matchTimeoutS * 1000,
        log: (s) => console.log(s),
      });
    } catch (e) { console.error(`coach-helper: ${e.message}`); process.exit(2); }
  }
  if (!Number.isInteger(a.queueMax) || a.queueMax < 0 || a.queueMax > 64) { console.error('coach-helper: --queue-max must be a whole number, 0-64'); process.exit(2); }
  let review = null;
  if (a.review) {
    const jobs = a.reviewJobs ?? Math.max(1, Math.min(7, availableParallelism() - 1));
    if (!Number.isInteger(jobs) || jobs < 1 || jobs > 32) { console.error('coach-helper: --review-jobs must be a whole number, 1-32'); process.exit(2); }
    if (!Number.isInteger(a.reviewQueueMax) || a.reviewQueueMax < 0 || a.reviewQueueMax > 16) { console.error('coach-helper: --review-queue-max must be a whole number, 0-16'); process.exit(2); }
    cleanOld(cfg.repoRoot);
    review = createReviewRunner({ repoRoot: cfg.repoRoot, jobs, queueMax: a.reviewQueueMax, log: (s) => console.log(s) });
  }
  let evaluator = null;
  if (a.eval) {
    if (a.evalSchema !== undefined && !/^[0-9a-f]{16}$/.test(a.evalSchema)) { console.error('coach-helper: --eval-schema is a schemaId, 16 hex digits'); process.exit(2); }
    evaluator = createEvalRunner({
      repoRoot: cfg.repoRoot, model: resolveEvalModel(cfg.repoRoot, a.evalModel), python: resolveEvalPython(cfg.repoRoot, a.evalPython),
      expectSchema: a.evalSchema ?? null, cube: a.evalCube ?? null, log: (s) => console.log(`COACH ${s}`),
    });
    void evaluator.start().then(() => console.log(`COACH EVAL      ${evaluator.describe()}`));
  }
  const h = startHelper({ port, lan: a.lan, token: a.token, wsPort, origins: cfg.origins, queueMax: a.queueMax, timeoutS: a.timeoutS, match, review, evaluator });
  let bound;
  try { bound = await h.listen(); } catch (e) {
    console.error(e.code === 'EADDRINUSE' ? `coach-helper: port ${port} is in use (another coach helper? --port, or config.json coachPort)` : `coach-helper: ${e.message}`);
    process.exit(1);
  }
  const info = await claudeInfo(0);
  console.log(`COACH LISTENING http://127.0.0.1:${bound}`);
  if (a.lan) console.log(`COACH LAN       bound 0.0.0.0:${bound}; non-loopback requests need the pairing token; the LAN page's origin is http://<host>:${wsPort}`);
  console.log(`COACH CLAUDE    ${info.ok ? info.version : info.error}`);
  console.log(`COACH QUEUE     one question at a time; up to ${a.queueMax} more wait in line (--queue-max)`);
  console.log(`COACH ORIGINS   ${cfg.origins.join(' ')}  (from ${cfg.file})`);
  console.log(!review ? 'COACH REVIEW    /review off (--no-review)'
    : review.available() ? 'COACH REVIEW    /review on: tools/coach-grade.sh review, one at a time'
    : 'COACH REVIEW    /review waits for the bridge build (./bridge/build.sh); /health says "review": 0 until then');
  if (!evaluator) console.log('COACH EVAL      /eval off (--no-eval)');
  console.log(match ? `COACH MATCH     /match on: play.sh (pid ${a.supervisor}) restarts the engine; decks under ${a.matchDir}` : 'COACH MATCH     /match off (not started by play.sh)');
  const stop = () => { h.close(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
