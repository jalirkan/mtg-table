#!/usr/bin/env python3
# mtg-table — tools/atlas: build a move-atlas dataset release, scrubbed, as one folder and one zip.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Build a public release of the move atlas (D515): one folder and its zip, every file scrubbed and checked.

    python3 -I tools/atlas/release.py --out var/release/move-atlas-v1 \\
        --night J186=<night data folder> ... [--labels J186=<labels.jsonl> ...] [--results J186=<results folder> ...] \\
        [--source-commit <sha>] [--version v1] [--no-zip]
    python3 -I tools/atlas/release.py --check <release folder>        # the scrub check alone

READS, for each --night NAME=DIR, the spine folders DIR/b-s??-* that hold an atlas.json (their plan.json,
atlas.json, phaseB/baseline.json and phaseB/branches.jsonl) and the night's label rows: --labels NAME=FILE, or
DIR/report/labels.jsonl (labels.py's --out). For --results NAME=DIR, the lab runner's DIR/STATUS (its status line and
its pin), as information. The deck files the rows name (`deckA`, `deckB`). docs/guides/move-atlas.md, whose field
dictionary goes into the release's README.

WRITES <out>/ (refused when it exists) and, unless --no-zip, <out>.zip beside it, its one top folder named as <out>:
    labels.jsonl                          every label row of every night, minus EXCLUDE's units, with `night` added
    branches/<night>/<spine>.branches.jsonl   each spine's phaseB/branches.jsonl, minus EXCLUDE's decisions
    atlas/<night>/<spine>.atlas.json      each spine's atlas.json
    decks/<night>/<deck folder>/<file>.dck    the two decks each spine played
    README.md, MANIFEST.json              what the data is, the counts, sha256 and bytes per file

THE SCRUB (every row and file):
  - a play's IDENTITY is SearchPolicy.playIdentity's nine `|`-separated fields: the card's name, spell or ability,
    the face, the alternative cost, AltCost, the may-play host, free, the optional costs, and Forge's description of
    the play (matchKey), which renders the card's rules text. The ninth field and anything after it is dropped, so
    a released identity has at most eight fields ("Holy Light|spell|Original|-|-|-|-|");
  - an `activate:` option's LABEL is "<card name>: <the ability's text, cut at 60 characters>"; it becomes the card's
    name (the identity's first field; the token keeps the ability's index). Cast, attack and block labels are names;
  - atlas.json's strings (warnings, problems) have each such raw label replaced, and each option of
    phaseB.decisions gains its scrubbed `identity` (from phaseB/baseline.json), so the check can hold its label;
  - a path: `deckA`/`deckB` become decks/<night>/<deck folder>/<file>.dck, `branchesFile` and `atlas` the
    release's own files, and `frameLog`, `rows.file` and `branchFrames` (not in the release) paths relative to the
    night's data folder; atlas.json's absolute paths the same.
THE CHECK (`check`, run before the zip is written; the build fails on any finding): no file holds "/home/" or
"justin" (any case) or "CARDNAME" (Forge's rules-text placeholder); no identity has a ninth field; an `activate:`
option's label is its identity's name in labels.jsonl and atlas.json, and in branches/ the label atlas.json gives
the same decision and option; every row's decks are in the release.

Standard library only; no engine. Deterministic: the same inputs give the same files and the same zip (entries in
name order, one fixed timestamp).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import zipfile

CONTRACT = 'mtg-table rung-4b label v6 (J177)'
# D509 point 4: the units a reader pooling D508's population leaves out, by the job files' names. J186's s11
# d13-d16: 12 frame logs failed the redaction checker on an all-hidden target record (D510). J187's s03 d23, d25,
# d27 and d29: every one of their 975 branch forks was not the baseline's position (D511's replay divergence).
EXCLUDE = {'J186': {'s11': (13, 14, 15, 16)}, 'J187': {'s03': (23, 25, 27, 29)}}
EXCLUDE_WHY = {'J186': 'a hidden-information fault in the seat\'s record: 12 frame logs failed the redaction checker '
                       'on an all-hidden target record (fixed by D510, before J188\'s pin)',
               'J187': 'the forks were not the position: all 975 branch forks of these decisions replayed a game that '
                       'had parted from the recorded baseline (fixed by D511, before J188\'s pin)'}
ATTRIBUTION = 'mtg-table move atlas, https://github.com/jalirkan/mtg-table'
ENGINE = {'name': 'Forge', 'version': '2.0.14 (Implementation-Version 2.0.14-SNAPSHOT-08.08)',
          'jar': 'forge-gui-desktop-2.0.14-jar-with-dependencies.jar',
          'jarSha256': '3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9'}
ZIP_TIME = (2026, 11, 6, 0, 0, 0)
IDENTITY_FIELDS = 8
GUIDE = 'docs/guides/move-atlas.md'
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


def scrub_identity(s):
    """a play identity without its ninth field (Forge's description: the rules text) and anything after it"""
    if not isinstance(s, str):
        return s
    parts = s.split('|')
    return '|'.join(parts[:IDENTITY_FIELDS]) if len(parts) > IDENTITY_FIELDS else s


def identity_has_text(s):
    return isinstance(s, str) and len(s.split('|')) > IDENTITY_FIELDS


def identity_name(s):
    return s.split('|')[0] if isinstance(s, str) and '|' in s else None


def scrub_label(token, label, identity):
    """an activate option's label -> the card's name; every other label as it is"""
    if not (isinstance(token, str) and token.startswith('activate')):
        return label
    name = identity_name(identity)
    if name is None:
        raise ValueError('an activate option with no play identity: %r %r' % (token, label))
    if label != name and not label.startswith(name + ':'):
        raise ValueError('an activate label of an unknown shape: %r (identity %r)' % (label, name))
    return name


def deck_path(night, p):
    """.../decks/<deck folder>/decks/<file>.dck -> decks/<night>/<deck folder>/<file>.dck"""
    parts = p.replace('\\', '/').split('/')
    if len(parts) < 3 or parts[-2] != 'decks' or not parts[-1].endswith('.dck'):
        raise ValueError('a deck path of an unknown shape: %r' % p)
    return 'decks/%s/%s/%s' % (night, parts[-3], parts[-1])


def relative(p, root):
    """an absolute path under the night's data folder -> relative to it"""
    if isinstance(p, str) and p.startswith(root + '/'):
        return p[len(root) + 1:]
    return p


def dumps_line(x):
    return json.dumps(x, separators=(',', ':'), ensure_ascii=False) + '\n'


class Spine:
    """one spine folder: its identities by (decision, option), and the raw activate labels to replace"""

    def __init__(self, night, root, folder):
        self.night, self.root, self.folder = night, root, folder
        self.dir = os.path.join(root, folder)
        self.plan = json.load(open(os.path.join(self.dir, 'plan.json')))
        self.ident, self.tokens, self.raw = {}, {}, {}
        for x in json.load(open(os.path.join(self.dir, 'phaseB', 'baseline.json')))['decisions']:
            ids = x.get('identities') or []
            for o, tok in enumerate(x.get('tokens') or []):
                idt = ids[o] if o < len(ids) else None
                self.ident[(x['d'], o)] = idt
                self.tokens[(x['d'], o)] = tok
                lab = (x.get('labels') or [None] * (o + 1))[o]
                new = scrub_label(tok, lab, idt) if lab is not None else None
                if lab is not None and new != lab:
                    self.raw[lab] = new

    def label(self, d, o, token, label):
        if self.tokens.get((d, o)) not in (None, token):
            raise ValueError('%s %s d%d o%d: token %r, the baseline lists %r' % (self.night, self.folder, d, o, token, self.tokens.get((d, o))))
        return scrub_label(token, label, self.ident.get((d, o)))

    def text(self, s):
        for raw in sorted(self.raw, key=len, reverse=True):
            s = s.replace(raw, self.raw[raw])
        return s.replace(self.root + '/', '')


def scrub_atlas(sp, doc):
    def walk(x, d=None):
        if isinstance(x, dict):
            d = x.get('d', d) if isinstance(x.get('d'), int) else d
            out = {}
            for k, v in x.items():
                out[k] = walk(v, d)
            if isinstance(out.get('token'), str) and 'label' in out and isinstance(out.get('o'), int) and d is not None:
                out['label'] = sp.label(d, out['o'], out['token'], x['label'])
            return out
        if isinstance(x, list):
            return [walk(v, d) for v in x]
        if isinstance(x, str):
            return sp.text(x)
        return x
    out = walk(doc)
    for k in ('deckA', 'deckB'):
        if isinstance(doc.get('plan', {}).get(k), str):
            out['plan'][k] = deck_path(sp.night, doc['plan'][k])
    for x in (out.get('phaseB') or {}).get('decisions') or []:
        for o in x.get('options') or []:
            o['identity'] = scrub_identity(sp.ident.get((x['d'], o['o'])))
    return out


def scrub_row(sp, row):
    out = {'v': row['v'], 'contract': row['contract'], 'night': sp.night}
    for k, v in row.items():
        if k in ('v', 'contract'):
            continue
        out[k] = v
    out['deckA'], out['deckB'] = deck_path(sp.night, row['deckA']), deck_path(sp.night, row['deckB'])
    out['options'] = []
    for o in row['options']:
        o2 = dict(o)
        o2['label'] = scrub_label(o['token'], o['label'], o.get('identity'))
        o2['identity'] = scrub_identity(o.get('identity'))
        out['options'].append(o2)
    out['frameLog'] = relative(row['frameLog'], sp.root)
    out['rows'] = dict(row['rows'], file=relative(row['rows']['file'], sp.root))
    out['branchFrames'] = relative(row['branchFrames'], sp.root)
    out['branchesFile'] = 'branches/%s/%s.branches.jsonl' % (sp.night, sp.folder)
    out['atlas'] = 'atlas/%s/%s.atlas.json' % (sp.night, sp.folder)
    return out


def excluded(night, spine, d):
    return d in EXCLUDE.get(night, {}).get(spine, ())


def spine_key(folder):
    return folder.split('-')[1]


def read_status(path):
    st = {}
    try:
        lines = open(os.path.join(path, 'STATUS')).read().splitlines()
    except OSError:
        return None
    st['status'] = lines[0].strip() if lines else None
    for line in lines[1:]:
        k, _, v = line.partition(':')
        if k.strip() in ('reason', 'started', 'finished', 'mtg-table'):
            st[k.strip()] = v.strip()
    return st


def guide_fields():
    """the field dictionary of docs/guides/move-atlas.md, between its two markers"""
    s = open(os.path.join(REPO, GUIDE)).read()
    a, b = s.index('<!-- fields -->'), s.index('<!-- /fields -->')
    return s[a + len('<!-- fields -->'):b].strip('\n')


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def build(args):
    out = os.path.abspath(args.out)
    if os.path.exists(out):
        sys.exit('release.py: %s exists; remove it first' % out)
    nights = []
    for spec in args.night:
        name, _, d = spec.partition('=')
        nights.append((name, os.path.abspath(d)))
    labels_of = dict(x.split('=', 1) for x in args.labels or [])
    results_of = dict(x.split('=', 1) for x in args.results or [])
    os.makedirs(out)
    counts = {'rows': 0, 'labels': 0, 'confident': 0, 'partial': 0, 'futilityControls': 0, 'spines': 0, 'decks': 0,
              'branchRows': 0, 'excludedRows': 0, 'excludedBranchRows': 0, 'nights': {}}
    rows_out = open(os.path.join(out, 'labels.jsonl'), 'w')
    for night, root in nights:
        spines = {}
        for f in sorted(os.listdir(root)):
            if re.match(r'^b-s\d\d-', f) and os.path.exists(os.path.join(root, f, 'atlas.json')):
                spines[f] = Spine(night, root, f)
        nc = {'spines': len(spines), 'rows': 0, 'labels': 0, 'confident': 0, 'partial': 0, 'futilityControls': 0,
              'branchRows': 0, 'excludedRows': 0, 'excludedBranchRows': 0, 'decks': 0,
              'pins': [], 'status': read_status(results_of[night]) if night in results_of else None,
              'excluded': {s: list(ds) for s, ds in EXCLUDE.get(night, {}).items()}}
        lf = labels_of.get(night) or os.path.join(root, 'report', 'labels.jsonl')
        decks = set()
        for line in open(lf):
            row = json.loads(line)
            if row.get('contract') != CONTRACT:
                sys.exit('release.py: %s: a row of another contract: %r' % (lf, row.get('contract')))
            folder = os.path.basename(os.path.dirname(row['atlas']))
            if folder not in spines:
                sys.exit('release.py: %s: a row of %s, which is no spine of %s' % (lf, folder, root))
            if excluded(night, row['spine'], row['d']):
                nc['excludedRows'] += 1
                continue
            sp = spines[folder]
            r = scrub_row(sp, row)
            rows_out.write(dumps_line(r))
            nc['rows'] += 1
            nc['labels'] += 1 if r['complete'] else 0
            nc['confident'] += 1 if r['confident'] else 0
            nc['partial'] += 1 if r['partial'] else 0
            nc['futilityControls'] += 1 if r['futilityControl'] else 0
            if r['sha'] not in nc['pins']:
                nc['pins'].append(r['sha'])
            decks.add((row['deckA'], r['deckA']))
            decks.add((row['deckB'], r['deckB']))
        for folder, sp in spines.items():
            for k in ('deckA', 'deckB'):
                decks.add((sp.plan[k], deck_path(night, sp.plan[k])))
            os.makedirs(os.path.join(out, 'atlas', night), exist_ok=True)
            doc = scrub_atlas(sp, json.load(open(os.path.join(sp.dir, 'atlas.json'))))
            with open(os.path.join(out, 'atlas', night, folder + '.atlas.json'), 'w') as f:
                json.dump(doc, f, indent=1, ensure_ascii=False)
                f.write('\n')
            os.makedirs(os.path.join(out, 'branches', night), exist_ok=True)
            with open(os.path.join(out, 'branches', night, folder + '.branches.jsonl'), 'w') as f:
                for line in open(os.path.join(sp.dir, 'phaseB', 'branches.jsonl')):
                    if not line.strip():
                        continue
                    b = json.loads(line)
                    if excluded(night, spine_key(folder), b['d']):
                        nc['excludedBranchRows'] += 1
                        continue
                    b['label'] = sp.label(b['d'], b['o'], b['token'], b['label'])
                    f.write(dumps_line(b))
                    nc['branchRows'] += 1
        for src, dst in sorted(decks, key=lambda x: x[1]):
            src = src if os.path.isabs(src) else os.path.join(root, src)   # a fixture names its decks from its night folder
            p = os.path.join(out, dst)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            data = open(src, 'rb').read()
            if os.path.exists(p):
                if open(p, 'rb').read() != data:
                    sys.exit('release.py: two different decks named %s' % dst)
                continue
            open(p, 'wb').write(data)
            nc['decks'] += 1
        counts['nights'][night] = nc
        for k in ('rows', 'labels', 'confident', 'partial', 'futilityControls', 'spines', 'decks', 'branchRows',
                  'excludedRows', 'excludedBranchRows'):
            counts[k] += nc[k]
    rows_out.close()
    commit = args.source_commit or git_head()
    readme = README.format(**readme_fields(args.version, counts, commit, nights))
    with open(os.path.join(out, 'README.md'), 'w') as f:
        f.write(readme)
    files = {}
    for dp, _, fs in os.walk(out):
        for f in fs:
            p = os.path.join(dp, f)
            files[os.path.relpath(p, out).replace(os.sep, '/')] = {'sha256': sha256(p), 'bytes': os.path.getsize(p)}
    manifest = {'name': 'mtg-table move atlas', 'version': args.version, 'contract': CONTRACT,
                'sourceCommit': commit, 'generator': 'tools/atlas/release.py', 'engine': ENGINE,
                'attribution': ATTRIBUTION, 'licence': {'data': 'CC-BY-4.0', 'generator': 'GPL-3.0-or-later'},
                'counts': counts, 'excluded': {n: {'units': {s: list(ds) for s, ds in v.items()}, 'why': EXCLUDE_WHY[n]}
                                               for n, v in EXCLUDE.items() if n in counts['nights']},
                'files': dict(sorted(files.items()))}
    with open(os.path.join(out, 'MANIFEST.json'), 'w') as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
        f.write('\n')
    problems = check(out)
    if problems:
        for p in problems[:50]:
            print('SCRUB CHECK FAILED: ' + p, file=sys.stderr)
        sys.exit('release.py: %d scrub problem(s); no zip written' % len(problems))
    if not args.no_zip:
        write_zip(out)
    print(json.dumps({'out': out, 'zip': None if args.no_zip else out + '.zip',
                      'zipBytes': None if args.no_zip else os.path.getsize(out + '.zip'),
                      'counts': {k: v for k, v in counts.items() if k != 'nights'},
                      'nights': {n: {k: v[k] for k in ('spines', 'rows', 'labels', 'confident', 'branchRows', 'decks', 'excludedRows')}
                                 for n, v in counts['nights'].items()}}, indent=1))


def write_zip(out):
    top = os.path.basename(out)
    names = []
    for dp, _, fs in os.walk(out):
        for f in fs:
            names.append(os.path.relpath(os.path.join(dp, f), out).replace(os.sep, '/'))
    tmp = out + '.zip.part'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for n in sorted(names):
            zi = zipfile.ZipInfo(top + '/' + n, date_time=ZIP_TIME)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16
            z.writestr(zi, open(os.path.join(out, n), 'rb').read())
    os.replace(tmp, out + '.zip')


def git_head():
    try:
        return subprocess.run(['git', '-C', REPO, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


BANNED = (re.compile(rb'/home/'), re.compile(rb'justin', re.I), re.compile(rb'CARDNAME'))


def check(out):
    """the scrub check over a release folder: a list of problems, empty when it is clean"""
    problems = []
    for dp, _, fs in os.walk(out):
        for f in sorted(fs):
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, out)
            data = open(p, 'rb').read()
            for b in BANNED:
                m = b.search(data)
                if m:
                    problems.append('%s: holds %r at byte %d' % (rel, m.group(0).decode('utf-8', 'replace'), m.start()))
    atlas_labels = {}
    for dp, _, fs in os.walk(os.path.join(out, 'atlas')):
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(dp, f), out).replace(os.sep, '/')
            doc = json.load(open(os.path.join(dp, f)))
            night = os.path.basename(dp)
            for x in (doc.get('phaseB') or {}).get('decisions') or []:
                for o in x.get('options') or []:
                    problems.extend(option_problems('%s d%s o%s' % (rel, x.get('d'), o.get('o')), o))
                    atlas_labels[(night, f[:-len('.atlas.json')], x.get('d'), o.get('o'))] = o.get('label')
    for dp, _, fs in os.walk(os.path.join(out, 'branches')):
        for f in sorted(fs):
            night, folder = os.path.basename(dp), f[:-len('.branches.jsonl')]
            for n, line in enumerate(open(os.path.join(dp, f)), 1):
                b = json.loads(line)
                if str(b.get('token', '')).startswith('activate') and b.get('label') != atlas_labels.get((night, folder, b.get('d'), b.get('o'))):
                    problems.append('branches/%s/%s line %d: label %r is not the atlas option\'s' % (night, f, n, b.get('label')))
    lf = os.path.join(out, 'labels.jsonl')
    if os.path.exists(lf):
        for n, line in enumerate(open(lf), 1):
            r = json.loads(line)
            for o in r.get('options') or []:
                problems.extend(option_problems('labels.jsonl line %d o%s' % (n, o.get('o')), o))
            for k in ('deckA', 'deckB'):
                if not os.path.isfile(os.path.join(out, str(r.get(k)))):
                    problems.append('labels.jsonl line %d: %s %r is not in the release' % (n, k, r.get(k)))
    return problems


def option_problems(where, o):
    p = []
    idt = o.get('identity')
    if identity_has_text(idt):
        p.append('%s: identity %r has a rules-text field (a ninth `|` field)' % (where, idt[:80]))
    if str(o.get('token', '')).startswith('activate') and o.get('label') != identity_name(idt):
        p.append('%s: activate label %r is not the card name %r' % (where, str(o.get('label'))[:80], identity_name(idt)))
    return p


def readme_fields(version, counts, commit, nights):
    rows = []
    for n, _ in nights:
        c = counts['nights'][n]
        st = c['status'] or {}
        rows.append('| %s | %s | %d | %d | %d | %d | %d | %s | %s |' % (
            n, ', '.join(c['pins']), c['spines'], c['rows'], c['labels'], c['confident'], c['branchRows'],
            st.get('status', 'n/a'), ('; '.join('%s d%s' % (s, ','.join(str(d) for d in ds)) for s, ds in c['excluded'].items()) or 'none')))
    return {'version': version, 'commit': commit or '(not a git checkout)', 'rows': counts['rows'], 'labels': counts['labels'],
            'confident': counts['confident'], 'partial': counts['partial'], 'controls': counts['futilityControls'],
            'spines': counts['spines'], 'decks': counts['decks'], 'branchRows': counts['branchRows'],
            'excludedRows': counts['excludedRows'], 'excludedBranchRows': counts['excludedBranchRows'],
            'nights': len(nights), 'nightNames': ', '.join(n for n, _ in nights), 'nightTable': '\n'.join(rows),
            'jarSha': ENGINE['jarSha256'], 'attribution': ATTRIBUTION, 'fields': guide_fields(),
            'exclusions': '\n'.join('- **%s %s**: %s.' % (n, '; '.join('%s d%s' % (s, ', d'.join(str(d) for d in ds)) for s, ds in v.items()), EXCLUDE_WHY[n])
                                    for n, v in EXCLUDE.items() if n in counts['nights'])}


README = '''# mtg-table move atlas, {version}

What each option of a Magic: The Gathering decision was worth, measured by playing the rest of the game out many
times from that exact position: **{rows} decision rows** ({labels} complete labels, **{confident} confident**, {partial}
partial) from **{spines} games** between random 40-card decks, with **{branchRows} branch games** behind them.

## What it is

The *move atlas* ([D451](https://github.com/jalirkan/mtg-table/blob/main/docs/decisions/D451-move-atlas.md)) takes
two decks and one seed and plays a **baseline game** with the Forge engine's own AI on both seats. At chosen
decisions of seat A (a priority: cast this, activate that, or pass; an attack; a block) it forks the real position,
forces each option Forge listed (option 0 is always the one Forge's AI actually chose), redeals what seat A could
not see from what it could not rule out, and plays the game out:

- on the **random map**, both seats pick uniformly at random among the plays they can make, under mechanical
  guardrails (always take a land drop, keep the opening hand, don't repeat a no-op ability), up to 150 branches an
  option;
- on the **Forge map** (three spines a night, two on J186, whose third never finished), both seats are Forge's AI,
  40 branches an option.

Each option's value is its mean score (win 1, draw 0.5, loss 0); a decision's **regret** is the best option's mean
minus option 0's, with a paired bootstrap interval. A label is **confident** when it is complete and the random
map's regret interval lies above zero: some option beat Forge's own choice in random play. A decision the futility
rule stopped at 50 branches (option 0 leading or tied) is a **partial** label, never confident; a quarter of those
were played on to the full count as the rule's controls.

The {nights} nights ({nightNames}) are one **population**: one seat policy, unchanged between them, so their rows
pool. Each spine is a new pair of decks drawn at random (D447's census draw) from one of four card-pool bands
(pauper, peasant, legacy, powered), cycled across the night.

## Files

| path | what |
|---|---|
| `labels.jsonl` | one row per branched decision ({rows} rows); the field dictionary is below |
| `branches/<night>/<spine>.branches.jsonl` | every branch game's outcome, one line a game: the decision `d`, the map `c` (`random` or `forge`), the option `o`, its `token` and `label`, the branch index `i` and its `seed`, the `result` for seat A (1 win, 0 draw, -1 loss) and its `score`, whether the turn cap ended it (`capped`) or the clock (`timedOut`), its length (`turns`, `steps`, `ms`, `bytes` of frame log), `standIns`, an `error` text when the branch errored, `forkProblems` (empty: the fork was the baseline's position), the unit `key`, and, when non-zero, the random seats' counters (`modesDrawn`, `retargeted`, `targetCountTrimmed`, `costTargetAvoided`, `chooseSourceGuard`, `exileLinksLost`, `restarts`, `engineError`, `leakSame`, `controlMoved`). No game text. |
| `atlas/<night>/<spine>.atlas.json` | the generator's summary of the spine: the plan, every decision's option values under both maps, the agreement between the maps, the schedule (what the cuts and the futility stop did), the checks it passed, timings. Each option of `phaseB.decisions` carries its play `identity` |
| `decks/<night>/<deck folder>/*.dck` | the {decks} decks the spines played, in Forge's `.dck` format |
| `MANIFEST.json` | sha256 and bytes of every file, the counts, the exclusions, the source commit |

**Not in this release:** the frame logs (every game's full record, about 1 GB a spine) and the per-decision state
rows. The rows' `frameLog`, `rows.file` and `branchFrames` name where they sit relative to a night's data folder;
anyone can make them again (*How it was made*).

## The nights

| night | pin | spines | rows | labels | confident | branch games | runner status | excluded |
|---|---|---|---|---|---|---|---|---|
{nightTable}

A night's runner status is its lab job's. J186 was stopped by its own abort rule before its report: its twelve
finished spines stand, its label rows were made afterwards with the same `labels.py` and arguments, and its
refused- and lost-cast fields are null because its frame-log scan never ran. J187 failed its final checks on s03's
forks (excluded below), on two s06 frame logs the redaction checker misread (D512 admits the shape) and on one
option whose forced cast the engine refused in most branches (s06 d21, Lively Dirge: a seat fault queued under
D509, marked in that row's `refusedCastOptions` and `lostCastOptions`). J191 failed one check on the checker's
misread of two s08 logs (D513). Their data stands.

**Excluded units** (D509 point 4: the units whose night failed on them are left out of any pool):
{exclusions}

{excludedRows} label rows and {excludedBranchRows} branch games are left out for them; their spines' `atlas.json`
still describe the whole spine as it ran.

## How it was made

- **Generator:** [mtg-table](https://github.com/jalirkan/mtg-table) (GPL-3.0-or-later), this release built at
  commit `{commit}` by `tools/atlas/release.py`. The nights ran at the pins in the table; the label rows come
  from `tools/atlas/labels.py` (label contract v6). `docs/guides/move-atlas.md` in the repository is the manual,
  with the exact commands to make a spine of your own.
- **Engine:** Forge 2.0.14 (`forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, sha256 `{jarSha}`), headless, as
  the rules engine and the AI. Every frame log of every night names this jar.
- **The seat:** the atlas plays no search seat; option 0 is Forge's Default AI's choice in the baseline game, and the
  branches are played by the random seat (D488's policy, D498's redeal, D508's gate), frozen for the whole
  population (D509). No ladder player or search configuration applies.
- **Scrubbed:** each option's `identity` keeps the card's name and the play's kind, face and costs and drops Forge's
  description of the play (the rules text); an activated ability's `label` is the card's name; every path is
  relative. Card names stay.

## Known limits

- Six nights, {spines} spines: a small, young dataset. Labels are per decision, from one baseline game each.
- These are **constructed random decks** drawn from pauper, peasant, legacy and powered card pools, not Limited
  decks and not tuned lists; the play is Forge's AI and a random policy, not people. A confident label says an
  option beat Forge's choice when the rest of the game was played at random; whether it is better play is a
  separate question (the Forge map is there to ask it).
- The random map's values are biased toward options that help in chaotic games; compare the Forge map where it
  exists. Draws at the 40-turn cap score a half.
- Some branch games errored inside the engine (the `error` field); they carry no result and count in no value.

## Licence

- **The data** (every file in this release): [Creative Commons Attribution 4.0 International
  (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Attribute it as: *{attribution}*.
- **The generator** (the mtg-table repository): GPL-3.0-or-later.
- **Wizards of the Coast:** card names and Magic: The Gathering are the property of Wizards of the Coast. This
  dataset is unofficial Fan Content permitted under the [Fan Content
  Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards. Portions of the
  materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC. No card rules text is included.

## The label row

Every key of a row of `labels.jsonl`, one line each (the same table as the repository's
`docs/guides/move-atlas.md`).

{fields}
'''


def main():
    ap = argparse.ArgumentParser(description='build a move-atlas release (D515)')
    ap.add_argument('--out')
    ap.add_argument('--night', action='append', help='NAME=DIR: a night\'s data folder (repeat, in order)')
    ap.add_argument('--labels', action='append', help='NAME=FILE: the night\'s labels.jsonl when not DIR/report/labels.jsonl')
    ap.add_argument('--results', action='append', help='NAME=DIR: the lab runner\'s results folder of the night (its STATUS)')
    ap.add_argument('--source-commit')
    ap.add_argument('--version', default='v1')
    ap.add_argument('--no-zip', action='store_true')
    ap.add_argument('--check', metavar='DIR', help='run the scrub check over a release folder and exit')
    args = ap.parse_args()
    if args.check:
        problems = check(args.check)
        for p in problems:
            print('SCRUB CHECK FAILED: ' + p)
        print('scrub check: %d problem(s)' % len(problems))
        sys.exit(1 if problems else 0)
    if not args.out or not args.night:
        ap.error('--out and at least one --night are required')
    build(args)


if __name__ == '__main__':
    main()
