// mtg-table — tools/bug-reports.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// BUG REPORTS FROM THE BOARD (D411).  ForgeCoach's "Report a bug" panel sends one
// JSON report -- a title, what happened, the game's position as that seat sees it,
// the last frames of its log, recent console errors, the client's build and
// settings, and optionally a screenshot -- and this module checks it and saves it:
//
//   var/bugs/<id>.json         the report (images taken out, secrets scrubbed)
//   var/bugs/<id>.<png|jpg>    the screenshot, when one came
//   var/bugs/<id>.thumb.jpg    its small copy, when one came (what bugs-sync.mjs pushes)
//
// <id> is `<UTC yyyymmddThhmmssSSSZ>-<6 random [a-z0-9]>` (milliseconds, strictly increasing
// within one helper), so the folder sorts in the order the reports came.
// Two doors take a report, and neither changes who may come in:
//
//   - the coach helper's `POST /bug` (8643): Justin's own page, behind the helper's
//     door as it is (D386: loopback with a loopback Host, or --lan with the pairing
//     token; a tunnel's headers refused);
//   - the room listener's `POST /room/<id>/bug` (8644): a friend's page (or Justin's
//     own at a table of two), behind that seat's X-Room-Token like every room route
//     (D400: tokens always, no loopback trust), and its own per-seat limit.  The
//     report records `received.via: "room"`, the room and the seat.
//
// THE BODY (at most MAX_BUG_BODY):
//   {"kind": "forgecoach-bug", "schema": 1, "title": string (1-120), "details"?: string (<= 8000),
//    "severity"?: "blocker"|"major"|"minor"|null, ...the client's context (game, ask, frames,
//    console, client) as it sent it...,
//    "screenshot"?: {"mediaType": "image/png"|"image/jpeg", "data": <base64>, "width"?, "height"?, "how"?},
//    "thumbnail"?:  {"mediaType": "image/jpeg"|"image/png", "data": <base64>, "width"?, "height"?}}
// -> 201 {"ok": true, "id", "screenshot": bool}
//    400 {"ok": false, "code": "bad", "message"} a body that is not a report
//    429 {"code": "slow"} too many reports from this seat / door
//    507 {"code": "full"} var/bugs holds MAX_BUG_FILES reports or MAX_BUG_BYTES already
//
// SECRETS NEVER STAY.  ForgeCoach strips its API key and every seat/room token
// before it sends; this module does it again over the report's text: the token the
// request itself presented (the room's X-Room-Token, the helper's pairing token),
// anything shaped like an Anthropic key, the value of any `token=`/`t=`/`seat=`
// URL parameter, and the value of any JSON key named like a token, key or password.
//
// HIDDEN INFORMATION.  A report holds what the reporting seat's page holds: its own
// redacted frames (its own hand), never the other seat's.  A friend's report lands on
// the owner's disk -- the panel says so before it is sent (ForgeCoach src/bug/).
//
// tools/bugs-sync.mjs copies new reports (smaller: fewer frames, the thumbnail) to
// the pc-results branch under bugs/ for the cloud session.  Self-test:
// tools/bug-reports-selftest.mjs (gate step 12f, CI's redaction job).

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export const BUG_SCHEMA = 1;
export const BUG_KIND = 'forgecoach-bug';
/** The whole request body: a report of at most ~3 MB of JSON plus a ~1.5 MB screenshot and its thumbnail. */
export const MAX_BUG_BODY = 6 * 1024 * 1024;
/** The report's JSON once the images are out of it. */
export const MAX_REPORT_JSON = 4 * 1024 * 1024;
export const MAX_SHOT_BASE64 = 2 * 1024 * 1024;
export const MAX_THUMB_BASE64 = 320 * 1024;
export const MAX_TITLE = 120;
export const MAX_DETAILS = 8000;
export const SEVERITIES = ['blocker', 'major', 'minor'];
/** What var/bugs may hold before a new report is refused (507): reports, and bytes in all. */
export const MAX_BUG_FILES = 500;
export const MAX_BUG_BYTES = 500 * 1024 * 1024;
export const BUG_ID = /^[0-9]{8}T[0-9]{9}Z-[a-z0-9]{6}$/;
const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg' };
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** A short line: control characters out, whitespace folded, at most `max` characters; null if empty. */
export function cleanLine(s, max) {
  if (typeof s !== 'string') return null;
  const t = s.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return [...t].slice(0, max).join('');
}

/** Free text: control characters (but newlines and tabs) out, at most `max` characters. */
export function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  return [...s.replace(CONTROL, ' ')].slice(0, max).join('');
}

/** The image's bytes from {mediaType, data}, checked against its own magic number; or a problem string. */
export function imageOf(im, maxBase64, what) {
  if (!im || typeof im !== 'object' || Array.isArray(im)) return { problem: `"${what}" must be {"mediaType", "data"}` };
  const ext = IMAGE_TYPES[im.mediaType];
  if (!ext) return { problem: `"${what}.mediaType" must be image/png or image/jpeg` };
  if (typeof im.data !== 'string' || im.data.length < 16 || im.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(im.data)) return { problem: `"${what}.data" must be base64` };
  if (im.data.length > maxBase64) return { problem: `"${what}" is too large (at most ${Math.round(maxBase64 / 1024)} KB of base64)` };
  const bytes = Buffer.from(im.data, 'base64');
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if ((ext === 'png' && !png) || (ext === 'jpg' && !jpg)) return { problem: `"${what}" is not the ${im.mediaType} it says it is` };
  const dim = (n) => (Number.isInteger(n) && n > 0 && n <= 20000 ? n : null);
  return { image: { ext, mediaType: im.mediaType, bytes, width: dim(im.width), height: dim(im.height), how: cleanLine(im.how, 20) } };
}

/**
 * Why a body is not a bug report, or the report split from its images:
 * {problem} | {report, shot, thumb}.  The report keeps the client's own fields
 * (its context) as they came, with title, details and severity cleaned.
 */
export function checkBug(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { problem: 'the body must be a JSON object' };
  if (body.kind !== BUG_KIND) return { problem: `"kind" must be "${BUG_KIND}"` };
  if (body.schema !== BUG_SCHEMA) return { problem: `"schema" must be ${BUG_SCHEMA}` };
  const title = cleanLine(body.title, MAX_TITLE);
  if (!title) return { problem: `"title" must be a line of text (1-${MAX_TITLE} characters)` };
  if (body.details !== undefined && typeof body.details !== 'string') return { problem: '"details" must be text' };
  if (body.severity !== undefined && body.severity !== null && !SEVERITIES.includes(body.severity)) return { problem: `"severity" must be one of ${SEVERITIES.join(', ')}, or null` };
  let shot = null;
  let thumb = null;
  if (body.screenshot !== undefined && body.screenshot !== null) {
    const r = imageOf(body.screenshot, MAX_SHOT_BASE64, 'screenshot');
    if (r.problem) return { problem: r.problem };
    shot = r.image;
  }
  if (body.thumbnail !== undefined && body.thumbnail !== null) {
    const r = imageOf(body.thumbnail, MAX_THUMB_BASE64, 'thumbnail');
    if (r.problem) return { problem: r.problem };
    thumb = r.image;
  }
  const { screenshot: _s, thumbnail: _t, received: _r, ...rest } = body;
  const report = { ...rest, title, details: cleanText(body.details ?? '', MAX_DETAILS), severity: body.severity ?? null };
  return { report, shot, thumb };
}

const KEY_NAMES = /^(?:[a-z_-]*token|api[_-]?key|apikey|x-api-key|authorization|password|secret|cookie)$/i;

/**
 * The report's JSON text with every secret it might carry replaced by "[redacted]":
 * each of `secrets` (strings of 8+ characters: the token this request presented, the
 * helper's pairing token), Anthropic-shaped keys, `token=`/`t=`/`seat=` URL values,
 * and string values of keys named like a token, key or password.
 */
export function scrubText(text, secrets = []) {
  let t = String(text);
  for (const s of secrets) {
    if (typeof s !== 'string' || s.length < 8) continue;
    t = t.split(s).join('[redacted]');
    const enc = encodeURIComponent(s);
    if (enc !== s) t = t.split(enc).join('[redacted]');
  }
  t = t.replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, '[redacted-key]');
  t = t.replace(/([?&#;](?:token|t|seat|key)=)[^&#"'\s\\]{6,}/gi, '$1[redacted]');
  return t;
}

/** Deep: string values under KEY_NAMES keys become "[redacted]" (booleans and numbers stay: a card's `token: true`). */
export function scrubKeys(v, depth = 0) {
  if (depth > 64 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => scrubKeys(x, depth + 1));
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = typeof x === 'string' && KEY_NAMES.test(k) ? '[redacted]' : scrubKeys(x, depth + 1);
  return out;
}

/** A new report id: `<UTC yyyymmddThhmmssSSSZ>-<6 random [a-z0-9]>`. */
export function newBugId(now = Date.now(), rand = () => randomBytes(6)) {
  const iso = new Date(now).toISOString();   // 2026-10-07T15:30:12.345Z
  const stamp = `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}${iso.slice(20, 23)}Z`;
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const b = rand();
  let tail = '';
  for (let i = 0; i < 6; i++) tail += abc[b[i] % abc.length];
  return `${stamp}-${tail}`;
}

/** The folder is (or would be) inside `root` by its real path (draft-room.mjs realUnder). */
function realUnder(root, p) {
  try {
    const r = realpathSync(root);
    let q = resolve(p);
    const tail = [];
    while (!existsSync(q)) { tail.unshift(q.slice(q.lastIndexOf(sep) + 1)); q = q.slice(0, q.lastIndexOf(sep)) || sep; }
    const real = join(realpathSync(q), ...tail);
    return real === r || real.startsWith(r + sep);
  } catch { return false; }
}

/** The reports a folder holds (ids, oldest first) and its size in bytes. */
export function bugFolder(dir) {
  if (!existsSync(dir)) return { ids: [], bytes: 0 };
  const ids = [];
  let bytes = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (!st.isFile()) continue;
    bytes += st.size;
    const m = /^(.+)\.json$/.exec(f);
    if (m && BUG_ID.test(m[1])) ids.push(m[1]);
  }
  ids.sort();
  return { ids, bytes };
}

/**
 * opts: { dir (default <repo>/var/bugs), varRoot (dir's real path must stay under it), now(), log(),
 * maxFiles, maxBytes, newId() }.  save({body, via, room?, seat?, secrets?}) -> {status, body}.
 */
export function createBugStore(opts = {}) {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => {});
  const dir = opts.dir;
  const maxFiles = opts.maxFiles ?? MAX_BUG_FILES;
  const maxBytes = opts.maxBytes ?? MAX_BUG_BYTES;
  // Strictly increasing: two reports in one millisecond still sort in the order they came.
  let last = 0;
  const newId = opts.newId ?? (() => { last = Math.max(now(), last + 1); return newBugId(last); });
  if (!dir) throw new Error('the bug store needs a folder');
  if (opts.varRoot) mkdirSync(opts.varRoot, { recursive: true });
  if (opts.varRoot && !realUnder(opts.varRoot, dir)) throw new Error(`the bug folder must be inside ${opts.varRoot} (got ${dir})`);
  const write = (file, data) => {
    writeFileSync(file + '.tmp', data, { mode: 0o600 });
    renameSync(file + '.tmp', file);
  };
  return {
    dir,
    health: () => ({ bugs: 1 }),
    save({ body, via, room = null, seat = null, secrets = [] }) {
      const c = checkBug(body);
      if (c.problem) return { status: 400, body: { ok: false, type: 'error', code: 'bad', message: c.problem } };
      if (opts.varRoot && !realUnder(opts.varRoot, dir)) { log(`BUG refusing to write: ${dir} left ${opts.varRoot}`); return { status: 500, body: { ok: false, type: 'error', code: 'disk', message: 'the bug folder is not where it should be' } }; }
      const have = bugFolder(dir);
      const incoming = (c.shot?.bytes.length ?? 0) + (c.thumb?.bytes.length ?? 0);
      if (have.ids.length >= maxFiles || have.bytes + incoming > maxBytes) {
        return { status: 507, body: { ok: false, type: 'error', code: 'full', message: `the bug folder is full (${have.ids.length} reports): run tools/bugs-sync.mjs --push, then move old ones out of var/bugs` } };
      }
      const id = newId();
      const received = { at: new Date(now()).toISOString(), via, ...(room ? { room } : {}), ...(seat === 0 || seat === 1 ? { seat } : {}) };
      const report = { ...c.report, id, received };
      if (c.shot) report.screenshot = { file: `${id}.${c.shot.ext}`, mediaType: c.shot.mediaType, bytes: c.shot.bytes.length, width: c.shot.width, height: c.shot.height, how: c.shot.how };
      if (c.thumb) report.thumbnail = { file: `${id}.thumb.${c.thumb.ext}`, mediaType: c.thumb.mediaType, bytes: c.thumb.bytes.length, width: c.thumb.width, height: c.thumb.height };
      let text;
      try {
        text = scrubText(JSON.stringify(scrubKeys(report), null, 1), secrets);
        JSON.parse(text);
      } catch (e) {
        return { status: 400, body: { ok: false, type: 'error', code: 'bad', message: `the report could not be saved as JSON (${e.message})` } };
      }
      if (Buffer.byteLength(text) > MAX_REPORT_JSON) return { status: 413, body: { ok: false, type: 'error', code: 'size', message: `the report is too large (at most ${MAX_REPORT_JSON / 1048576} MB without its images)` } };
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      try { chmodSync(dir, 0o700); } catch { /* not ours */ }
      if (c.shot) write(join(dir, report.screenshot.file), c.shot.bytes);
      if (c.thumb) write(join(dir, report.thumbnail.file), c.thumb.bytes);
      write(join(dir, `${id}.json`), text + '\n');   // the JSON last: a report is whole once its .json is there
      log(`BUG ${id} saved (${room ? `room ${room} seat ${seat}` : `via ${via}`}${c.shot ? ', with a screenshot' : ''}): ${report.title.slice(0, 80)}`);
      return { status: 201, body: { ok: true, id, screenshot: !!c.shot } };
    },
  };
}
