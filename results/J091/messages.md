# Night 3 quarantine: still-failing messages

45 lines in recheck.jsonl

## own-hand-no-name
```json
{
 "night": 3,
 "rel": "bridge/fair-fight+omega/games/453/g1-seat0.jsonl.gz",
 "kinds": [
  "own-hand-no-name"
 ],
 "messages": [
  "the viewer's own hand card 10 has no name -- redaction is too aggressive (it is a full card with name \"\" (faceDown false, controller 0); last seen outside this hand in exile at line 473)"
 ]
}
```

## own-hand-no-name
```json
{
 "night": 3,
 "rel": "bridge/fair-fight+peasant/games/302/g1-seat1.jsonl.gz",
 "kinds": [
  "own-hand-no-name"
 ],
 "messages": [
  "the viewer's own hand card 107 has no name -- redaction is too aggressive (it is a full card with name \"\" (faceDown false, controller 1); last seen outside this hand in exile at line 478)"
 ]
}
```

## M55
```json
{
 "night": 3,
 "rel": "bridge/modern-era+omega/games/354/g1-seat1.jsonl.gz",
 "kinds": [
  "M55"
 ],
 "messages": [
  "decision 58 names card 99 (land:99), which its state frame does not show seat 1 -- a stub's id, a library card or another seat's hidden card is never an option (M55, D347)"
 ]
}
```

## other
```json
{
 "night": 3,
 "rel": "recheck.jsonl",
 "kinds": [
  "other",
  "shape"
 ],
 "messages": [
  "line 0 must be the session header (\"kind\":\"session\"), got kind=undefined",
  "session header v=undefined, expected 1",
  "session header is missing \"gameId\"",
  "session header is missing \"startedAt\"",
  "session header is missing \"seat\""
 ]
}
```

counts: {'own-hand-no-name': 43, 'M55': 1, 'other': 1}
