# J203 (llm-judge3): blind judge batches WITH the board, for the unselected sample of 160 (sample.py).
# The renderer is llm-judge2/scripts/build.py's, byte for byte above the `items` loop (position(), render_opt(), the
# glossary); only the sample, the alignment file and the letter map differ. One letter map for both judges (seed 203:
# each decision's options in a random order), so judge A and judge B read identical files.
# Never writes option values or Forge's choice into anything a judge reads; reads none.
# usage: python3 -I build3.py <move-atlas-v1 dir> <llm-judge3 dir>
import json, sqlite3, os, sys, gzip, collections, random
DATA, R2 = sys.argv[1], sys.argv[2]
DB = '~/code/mtg-table/var/cards/cards.sqlite'
db = sqlite3.connect('file:%s?mode=ro' % DB, uri=True)
rows = [json.loads(l) for l in open(os.path.join(DATA, 'labels.jsonl'))]
want = [json.loads(l)['key'] for l in open(os.path.join(R2, 'sample.jsonl'))]
byk = {'%s/%s/d%d' % (r['night'], r['spine'], r['d']): r for r in rows}
conf = [byk[k] for k in want]   # the sample, in sample.jsonl's order (night, spine, d); the name kept from build.py
align = json.load(open(os.path.join(R2, 'align.json')))
BASICS = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'}

def deck(path):
    main, sec = [], None
    for line in open(os.path.join(DATA, path)):
        line = line.strip()
        if line.startswith('['): sec = line; continue
        if sec == '[Main]' and line:
            n, name = line.split(' ', 1); main.append((int(n), name.split('|')[0]))
    return main

missing = set(); ocache = {}
def oracle(name):
    if name in ocache: return ocache[name]
    q = db.execute("select name,mana_cost,type_line,oracle_text,power,toughness,loyalty,faces from cards where name=? and kind='card'", (name,)).fetchall()
    q = [x for x in q if x[2] != 'Card // Card'] or q
    if not q:
        q = db.execute("select name,mana_cost,type_line,oracle_text,power,toughness,loyalty,faces from cards where name like ? and kind='card'", (name + ' // %',)).fetchall()
    if not q:
        missing.add(name); ocache[name] = None; return None
    n, mc, tl, ot, p, t, l, faces = q[0]
    s = '%s %s — %s' % (n, mc or '', tl or '')
    if p is not None: s += ' %s/%s' % (p, t)
    if l: s += ' [loyalty %s]' % l
    s += ': ' + (ot or '').replace('\n', ' / ')
    if faces and '//' in n:
        try:
            fs = json.loads(faces)
            s = n + ' :: ' + ' || '.join('%s %s — %s%s: %s' % (f.get('name'), f.get('mana_cost', ''), f.get('type_line', ''),
                 (' %s/%s' % (f['power'], f['toughness'])) if f.get('power') else '', (f.get('oracle_text') or '').replace('\n', ' / ')) for f in fs)
        except Exception: pass
    ocache[name] = s; return s

atlases = {}
def atlas(path):
    if path not in atlases: atlases[path] = json.load(open(os.path.join(DATA, path)))
    return atlases[path]

frame_cache = {}
def state_of(al):
    fl = al['frameLog']
    if fl not in frame_cache:
        frame_cache.clear()
        frame_cache[fl] = {f['seq']: f for f in (json.loads(l) for l in gzip.open(fl, 'rt')) if f.get('type') == 'state'}
    return frame_cache[fl][al['stateSeq']]['body']

PHASE = {'UPKEEP': 'upkeep', 'DRAW': 'draw step', 'MAIN1': 'precombat main phase', 'COMBAT_BEGIN': 'beginning of combat',
         'COMBAT_DECLARE_ATTACKERS': 'declare attackers step', 'COMBAT_DECLARE_BLOCKERS': 'declare blockers step',
         'COMBAT_FIRST_STRIKE_DAMAGE': 'first-strike damage step', 'COMBAT_DAMAGE': 'combat damage step', 'COMBAT_END': 'end of combat',
         'MAIN2': 'postcombat main phase', 'END_OF_TURN': 'end step', 'CLEANUP': 'cleanup'}

def card_line(c, byid, show_id=True, active=None):
    if c.get('hidden'): return '(hidden card)'
    nm = c.get('name') or '(face-down card)'
    s = ('#%d ' % c['id'] if show_id else '') + nm
    bits = []
    if c.get('types'): bits.append(c['types'])
    if c.get('power') is not None: bits.append('%s/%s' % (c['power'], c['toughness']))
    if c.get('loyalty'): bits.append('loyalty %s' % c['loyalty'])
    if c.get('token'): bits.append('token')
    if c.get('faceDown'): bits.append('face down')
    if c.get('tapped'): bits.append('TAPPED')
    if c.get('sick') and 'Creature' in (c.get('types') or '') and c.get('controller') == active: bits.append('summoning sick')
    if c.get('damage'): bits.append('%d damage marked' % c['damage'])
    if c.get('counters'): bits.append('counters: ' + ', '.join('%s %s' % (v, k) for k, v in c['counters'].items()))
    if c.get('keywords'): bits.append('keywords: ' + ', '.join(k.lower().replace('_', ' ') for k in c['keywords']))
    if c.get('attacking'): bits.append('ATTACKING')
    if c.get('blocking'): bits.append('BLOCKING')
    if c.get('attachedToId') is not None:
        t = byid.get(c['attachedToId']); bits.append('attached to #%d %s' % (c['attachedToId'], t.get('name') if t else '?'))
    return s + (' (' + '; '.join(bits) + ')' if bits else '')

def hand_line(c):
    s = '#%d %s' % (c['id'], c.get('name'))
    if c.get('manaCost'): s += ' %s' % c['manaCost']
    if c.get('types'): s += ' — %s' % c['types']
    return s

def render_opt(o, byid):
    t = o['token']; ident = o['identity']
    if t == 'pass': return 'pass (play nothing now / pass priority)'
    if t == 'attack:none': return 'attack with nothing'
    if t == 'block:none': return 'declare no blocks'
    if t.startswith('attack:'):
        ids = [int(x) for x in t.split(':', 1)[1].split(',')]
        return 'attack with ' + ' + '.join('#%d %s (%s/%s)' % (i, byid[i]['name'], byid[i].get('power'), byid[i].get('toughness')) if i in byid else '#%d %s' % (i, '?') for i in ids)
    if t.startswith('block:'):
        prs = []
        for pr in t.split(':', 1)[1].split(','):
            b, a = (int(x) for x in pr.split('>'))
            bn = byid.get(b, {}).get('name', '?'); an = byid.get(a, {}).get('name', '?')
            prs.append('#%d %s blocks #%d %s' % (b, bn, a, an))
        return 'blocks: ' + '; '.join(prs)
    f = ident.split('|'); name, kind, face, alt = f[0], f[1], f[2], f[3]
    cid = int(t.split(':', 1)[1].split('#')[0])
    c = byid.get(cid, {})
    zone = c.get('zone', '?')
    if kind == 'spell': s = 'cast #%d %s' % (cid, name) + (' from your %s' % zone if zone not in ('hand', '?') else '')
    elif kind == 'ability': s = 'activate an ability of #%d %s (Forge ability index %s; see the card\'s text)' % (cid, name, t.split('#')[1] if '#' in t else '?')
    else: s = kind + ' #%d %s' % (cid, name)
    if face and face not in ('Original', '-'): s += ' [face: %s]' % face
    if alt and alt != '-': s += ' [alternative cost: %s]' % alt
    extra = [x for x in f[4:] if x and x != '-']
    if extra: s += ' [' + ', '.join(extra) + ']'
    return s

def position(r, al, first):
    b = state_of(al)
    seat = r['view']['seat']
    me = [p for p in b['players'] if p['id'] == seat][0]; op = [p for p in b['players'] if p['id'] != seat][0]
    byid = {}
    for p in b['players']:
        for zn, z in p['zones'].items():
            for c in z.get('cards', []):
                if not c.get('hidden'): byid[c['id']] = c
    for c in b.get('stackCards') or []:
        byid.setdefault(c['id'], c)
    zc = lambda p, n: p['zones'].get(n, {}).get('count', len(p['zones'].get(n, {}).get('cards', [])))
    out = []
    act = 'you (seat A)' if b['activePlayer'] == seat else 'the opponent (seat B)'
    out.append('- Position: turn %d, %s of %s\'s turn. You have priority / the decision.' % (b['turn'], PHASE.get(b['phase'], b['phase']), act))
    out.append('- Life: you %d, opponent %d.%s' % (me['life'], op['life'],
               ''.join(' %s poison %d.' % (w, p['poison']) for w, p in (('You', me), ('Opponent', op)) if p.get('poison'))))
    pool = {k: v for k, v in me['manaPool'].items() if v}
    untapped = [c for c in me['zones']['battlefield'].get('cards', []) if 'Land' in (c.get('types') or '') and not c.get('tapped')]
    out.append('- Your mana: %d untapped land(s) (%s); about %d mana available in all%s. Land drop this turn: %s.' % (
        len(untapped), ', '.join(c['name'] for c in untapped) or 'none', int(al['manaAvailable']),
        ('; floating ' + ', '.join('%s%s' % (v, k) for k, v in pool.items())) if pool else '',
        'already used' if al['landDropUsed'] else ('not used' if b['activePlayer'] == seat else 'n/a (not your turn)')))
    out.append('- Opponent: %d card(s) in hand (hidden), %d in library; about %d mana open (untapped lands etc.).' % (zc(op, 'hand'), zc(op, 'library'), int(al['oppManaAvailable'])))
    out.append('- Your hand (%d):' % zc(me, 'hand'))
    for c in me['zones']['hand'].get('cards', []):
        o = oracle(c['name']) if c.get('name') and c['name'] not in BASICS else None
        out.append('  - ' + hand_line(c) + (('\n    Oracle: ' + o.split(': ', 1)[1]) if o and ': ' in o else ''))
    def bf(p, who):
        cs = p['zones']['battlefield'].get('cards', [])
        lands = [c for c in cs if 'Land' in (c.get('types') or '') and 'Creature' not in (c.get('types') or '')]
        non = [c for c in cs if c not in lands]
        out.append('- %s battlefield: %d permanents.' % (who, len(cs)))
        out.append('  - Lands: ' + (', '.join(('%s%s' % (c['name'], ' (tapped)' if c.get('tapped') else '')) + ('' if not c.get('counters') else ' [%s]' % c['counters']) for c in lands) or 'none'))
        for c in non: out.append('  - ' + card_line(c, byid, active=b['activePlayer']))
    bf(me, 'Your')
    bf(op, 'Opponent\'s')
    st = b.get('stack') or []
    if st:
        out.append('- The stack (top first):')
        for s in st:
            who = 'yours' if s['controller'] == seat else 'opponent\'s'
            tg = ''
            if s.get('targetCardIds'): tg += ' targets: ' + ', '.join('#%d %s' % (i, byid.get(i, {}).get('name', '?')) for i in s['targetCardIds'])
            if s.get('targetPlayerIds'): tg += ' targets player(s): ' + ', '.join('you' if i == seat else 'opponent' for i in s['targetPlayerIds'])
            out.append('  - (%s) %s%s' % (who, s.get('text'), tg))
    else:
        out.append('- The stack: empty.')
    for p, who in ((me, 'Your'), (op, 'Opponent\'s')):
        for zn in ('graveyard', 'exile', 'command'):
            cs = p['zones'].get(zn, {}).get('cards', [])
            if cs or zn == 'graveyard':
                out.append('- %s %s (%d): %s' % (who, zn, zc(p, zn), ', '.join((c.get('name') or 'face-down card') if not c.get('hidden') else 'hidden card' for c in cs) or 'empty'))
    out.append('- Libraries: you %d, opponent %d.' % (zc(me, 'library'), zc(op, 'library')))
    return out, byid

items = []
for r in conf:
    key = '%s/%s/d%d' % (r['night'], r['spine'], r['d'])
    a = atlas(r['atlas'])
    first = a['phaseB']['baseline']['first']
    hist = []
    for d in sorted(a['phaseB']['decisions'], key=lambda x: x['d']):
        if d['d'] >= r['d']: continue
        ch = [o for o in d['options'] if o['o'] == d['chosen']][0]
        others = [o['label'] for o in d['options'] if o['o'] != d['chosen']]
        hist.append('T%d %s: played "%s" (other listed options: %s)' % (d['turn'], {'p': 'priority', 'a': 'attack', 'b': 'blocks'}[d['kind']], ch['label'], '; '.join(others) or '-'))
    items.append(dict(key=key, r=r, first=first, hist=hist, deckA=deck(r['deckA']), deckB=deck(r['deckB']), band=r['pool'].split('-')[1]))

by_spine = collections.OrderedDict()
for it in items: by_spine.setdefault((it['r']['night'], it['r']['spine']), []).append(it)
batches, cur = [], []
for sp, its in by_spine.items():
    if len(cur) + len(its) > 16 and cur: batches.append(cur); cur = []
    cur.extend(its)
if cur: batches.append(cur)

keymap = {}
positions = {}
rng = random.Random(538)
km1 = {}
for it in items:
    opts = [o['o'] for o in it['r']['options']]
    rng.shuffle(opts)
    km1['1|' + it['key']] = {chr(65 + i): o for i, o in enumerate(opts)}
for judge in (1,):
    for bi, bt in enumerate(batches):
        out = ['# Blind judging batch %02d, with the board\n' % (bi + 1)]
        cards = set()
        for it in bt:
            for _, n in it['deckA'] + it['deckB']:
                if n not in BASICS: cards.add(n)
        for it in bt:
            r = it['r']; al = align[it['key']]
            pos, byid = position(r, al, it['first'])
            positions[it['key']] = pos
            for c in byid.values():
                if c.get('name') and not c.get('token') and c['name'] not in BASICS and '(' not in c['name'] and c.get('zone') != 'command': cards.add(c['name'])
            m = km1['%d|%s' % (judge, it['key'])]
            letters = sorted(m)
            keymap[it['key']] = m
            out.append('\n---\n## Decision %s\n' % it['key'])
            out.append('- Card pool band: %s. 40-card constructed random decks, 20 life, 1v1.' % it['band'])
            out.append('- You are seat A. Seat %s took the first turn.' % it['first'])
            out.append('- Decision kind: %s.' % {'p': 'priority: cast a spell, activate an ability, or pass', 'a': 'declare attackers (your attack this turn)', 'b': 'declare blockers (the opponent is attacking you)'}[r['kind']])
            out.extend(pos)
            out.append('- Your deck (seat A): ' + ', '.join(('%d %s' % (n, c)) if n > 1 else c for n, c in it['deckA']))
            out.append('- Opponent deck (seat B), its full list: ' + ', '.join(('%d %s' % (n, c)) if n > 1 else c for n, c in it['deckB']))
            out.append('- Earlier in this game (only the sampled decisions of seat A, not every play): ' + (' | '.join(it['hist']) if it['hist'] else 'none sampled'))
            out.append('- Options (listed in random order; #n are the card ids above):')
            optby = {o['o']: o for o in r['options']}
            for L in letters:
                out.append('  - %s: %s' % (L, render_opt(optby[m[L]], byid)))
        out.append('\n---\n# Card glossary (Oracle text) for this batch\n')
        for n in sorted(cards):
            t = oracle(n)
            out.append('- ' + (t if t else '%s: (no Oracle text found; use your own knowledge)' % n))
        open(os.path.join(R2, 'batches/batch%02d.md' % (bi + 1)), 'w').write('\n'.join(out) + '\n')
json.dump(keymap, open(os.path.join(R2, 'scripts/keymap.json'), 'w'), indent=0)
json.dump({'%02d' % (i + 1): [it['key'] for it in bt] for i, bt in enumerate(batches)}, open(os.path.join(R2, 'batches/index.json'), 'w'), indent=0)
json.dump(positions, open(os.path.join(R2, 'positions/positions.json'), 'w'), indent=0)
print('batches', [len(b) for b in batches], 'missing oracle', sorted(missing))
