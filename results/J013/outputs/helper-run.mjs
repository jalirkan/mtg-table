// J013: POST /coach to the running helper and time the NDJSON stream.
// usage: node helper-run.mjs <model> <tag>
import { readFileSync, writeFileSync } from 'node:fs';
const [model, tag] = process.argv.slice(2);
const system = readFileSync('/tmp/J013/system.txt', 'utf8');
const user = readFileSync('/tmp/J013/user.txt', 'utf8');
const ac = new AbortController();
const timer = setTimeout(() => { console.log(`ABORT ${tag}: over 120 s`); ac.abort(); }, 120_000);
const t0 = Date.now();
let raw = '', firstText = null, firstThinking = null, firstLine = null, textChars = 0, thinkingChars = 0, thinkingLines = 0, done = null, error = null;
const types = {};
try {
  const res = await fetch('http://127.0.0.1:8643/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, user, model }), signal: ac.signal });
  const dec = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body) {
    const s = dec.decode(chunk, { stream: true });
    raw += s; buf += s;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const o = JSON.parse(line);
      const t = Date.now() - t0;
      if (firstLine === null) firstLine = t;
      types[o.type] = (types[o.type] ?? 0) + 1;
      if (o.type === 'text') { if (firstText === null) firstText = t; textChars += o.text.length; }
      if (o.type === 'thinking') { if (firstThinking === null) firstThinking = t; thinkingChars += o.text.length; thinkingLines++; }
      if (o.type === 'done') done = o;
      if (o.type === 'error') error = o;
    }
  }
} catch (e) { error = { message: String(e) }; }
clearTimeout(timer);
const wall = Date.now() - t0;
writeFileSync(`/tmp/J013/${tag}.ndjson`, raw);
const row = { tag, path: 'helper', model, wall_ms: wall, first_line_ms: firstLine, first_thinking_ms: firstThinking, first_text_ms: firstText, text_chars: textChars, thinking_chars: thinkingChars, thinking_lines: thinkingLines, line_types: types, done, error };
writeFileSync(`/tmp/J013/${tag}.row.json`, JSON.stringify(row, null, 2));
console.log(JSON.stringify(row));
