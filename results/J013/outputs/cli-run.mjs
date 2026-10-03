// J013: spawn `claude` exactly as tools/coach-helper.mjs (e54aa16) does, and time it.
// usage: node cli-run.mjs <model> <tag>
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [model, tag] = process.argv.slice(2);
const system = readFileSync('/tmp/J013/system.txt', 'utf8');
const user = readFileSync('/tmp/J013/user.txt', 'utf8');
const args = ['-p', '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
  '--model', model, '--system-prompt', system,
  '--tools', '', '--strict-mcp-config', '--no-session-persistence',
  '--permission-mode', 'dontAsk', '--max-turns', '1', '--safe-mode', '--disable-slash-commands'];
const dir = mkdtempSync(join(tmpdir(), 'forgecoach-coach-'));
const t0 = Date.now();
const child = spawn('claude', args, { cwd: dir, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
child.stdin.end(user);
let raw = '', stderr = '', buf = '';
let firstText = null, firstThinking = null, firstEvent = null, msgStart = null;
let textChars = 0, thinkingChars = 0, result = null, init = null;
const other = [];
const timer = setTimeout(() => { console.log(`ABORT ${tag}: over 120 s`); try { process.kill(-child.pid, 'SIGTERM'); } catch {} }, 120_000);
child.stdout.setEncoding('utf8');
child.stdout.on('data', (d) => {
  raw += d; buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    let o; try { o = JSON.parse(line); } catch { continue; }
    const t = Date.now() - t0;
    if (firstEvent === null) firstEvent = t;
    if (o.type === 'system' && o.subtype === 'init') init = o;
    else if (o.type === 'system') other.push({ t, subtype: o.subtype });
    if (o.type === 'stream_event') {
      const e = o.event;
      if (e.type === 'message_start' && msgStart === null) msgStart = t;
      if (e.type === 'content_block_delta') {
        if (e.delta.type === 'text_delta') { if (firstText === null) firstText = t; textChars += e.delta.text.length; }
        if (e.delta.type === 'thinking_delta') { if (firstThinking === null) firstThinking = t; thinkingChars += e.delta.thinking.length; }
      }
    }
    if (o.type === 'result') result = o;
  }
});
child.stderr.on('data', (d) => { stderr += d; });
child.on('close', (code) => {
  clearTimeout(timer);
  const wall = Date.now() - t0;
  rmSync(dir, { recursive: true, force: true });
  writeFileSync(`/tmp/J013/${tag}.stream.jsonl`, raw);
  const row = {
    tag, path: 'CLI', model, exit: code, wall_ms: wall, first_event_ms: firstEvent, message_start_ms: msgStart,
    first_thinking_ms: firstThinking, first_text_ms: firstText, text_chars: textChars, thinking_chars: thinkingChars,
    result_chars: typeof result?.result === 'string' ? result.result.length : null,
    duration_ms: result?.duration_ms, duration_api_ms: result?.duration_api_ms, num_turns: result?.num_turns,
    stop_reason: result?.stop_reason, usage: result?.usage, modelUsage: result?.modelUsage,
    init_model: init?.model, other_system: other, stderr: stderr.slice(0, 500),
  };
  writeFileSync(`/tmp/J013/${tag}.row.json`, JSON.stringify(row, null, 2));
  console.log(JSON.stringify({ tag, exit: code, wall_ms: wall, first_text_ms: firstText, first_thinking_ms: firstThinking, text_chars: textChars, thinking_chars: thinkingChars, duration_api_ms: row.duration_api_ms, in: row.usage?.input_tokens, out: row.usage?.output_tokens, models: Object.keys(row.modelUsage ?? {}) }));
});
