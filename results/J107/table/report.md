# ForgeCoach playtest

2026-10-07T19:05:31.763Z → 2026-10-07T23:26:35.971Z · mode `table` · seed 106 · coach off

**playtest: 10 game(s), 4 best-of-three(s); 5 friend won, 4 host won, 1 abandoned (time); 21 finding(s) of 19 kind(s); ERROR**

```
stopped by SIGTERM
```

## Best of three

| Match | Cube | Result | Games | Findings |
|---|---|---|---|---|
| 1 | pauper | friend won 2 – 1 | 1.1, 1.2, 1.3 | 0 |
| 2 | synergy | abandoned | 2.1 | 0 |
| 3 | vintage | friend won 2 – 0 | 3.1, 3.2 | 0 |
| 4 | modern-era | host won 2 – 1 | 4.1, 4.2, 4.3 | 0 |

## Games

| Game | Decks | Result | Turns | Decisions | Clicks | Findings | Time |
|---|---|---|---|---|---|---|---|
| 1.1 | Justin’s Pauper Cube deck vs Sam’s Pauper Cube deck | friend won (AllOpponentsLost) | 42 | 586 + 748 | 543 + 728 | 0 | 1055 s |
| 1.2 | Justin’s Pauper Cube deck vs Sam’s Pauper Cube deck (sideboarded) | host won (AllOpponentsLost) | 70 | 1347 + 1294 | 1332 + 1262 | 2 | 2386 s |
| 1.3 | Justin’s Pauper Cube deck vs Sam’s Pauper Cube deck (sideboarded) (sideboarded) | friend won (AllOpponentsLost) | 28 | 581 + 585 | 520 + 557 | 0 | 964 s |
| 2.1 | Justin’s Synergy Cube deck vs Sam’s Synergy Cube deck | abandoned (time) | 17 | 265 + 179 | 241 + 173 | 2 | 4501 s |
| 3.1 | Justin’s Vintage Cube deck vs Sam’s Vintage Cube deck | friend won (AllOpponentsLost) | 33 | 611 + 518 | 475 + 436 | 5 | 1100 s |
| 3.2 | Justin’s Vintage Cube deck vs Sam’s Vintage Cube deck (sideboarded) | friend won (AllOpponentsLost) | 32 | 474 + 605 | 437 + 473 | 2 | 1114 s |
| 4.1 | Justin’s Modern-Era Cube deck vs Sam’s Modern-Era Cube deck | host won (AllOpponentsLost) | 55 | 885 + 874 | 861 + 811 | 9 | 1428 s |
| 4.2 | Justin’s Modern-Era Cube deck vs Sam’s Modern-Era Cube deck (sideboarded) | friend won (AllOpponentsLost) | 23 | 456 + 514 | 444 + 436 | 0 | 943 s |
| 4.3 | Justin’s Modern-Era Cube deck vs Sam’s Modern-Era Cube deck (sideboarded) (sideboarded) | host won (AllOpponentsLost) | 29 | 374 + 473 | 368 + 454 | 0 | 758 s |
| 5.1 | Justin’s Pauper Cube deck vs Sam’s Pauper Cube deck | host won (AllOpponentsLost) | 30 | 603 + 268 | 604 + 252 | 1 | 651 s |

## Paths exercised

manual-tap 1528 · ability-menu 455 · activate 275 · use-mana 148 · to-eot 131 · target-player 100 · graveyard-cast 73 · ability-menu-cancel 43 · zone-pick 40 · x-spell 40 · equip-attached 25 · equip 22 · zone-choice 9 · alpha-strike 6 · trigger-order 4 · x-number 3 · exile-play 1

## Findings by kind

- **unreachable-option: button cancel "…" (pay: "…")** — 2× in game(s) 1.2, 3.2
  - e.g. game 1.2, friend, turn 51 MAIN1, frame 7542 (seq 7544): button cancel "Cancel" (pay: "Rally the Peasants (77) - Creatures you control get +2/+0 until end of turn.")
  - prompt: `Rally the Peasants (77) - Creatures you control get +2/+0 until end of turn. ⏎  ⏎ Pay Mana Cost: {2}{R}`
  - board: {"board":"mode-stack","primary":"Let it resolveOK","dialog":false,"card":[]}
  - screenshot: [shots/g1.2-friend-1-unreachable-option.png](shots/g1.2-friend-1-unreachable-option.png)
- **unreachable-option: button ok "…" (priority: "…")** — 2× in game(s) 2.1, 3.2
  - e.g. game 2.1, host, turn 5 MAIN2, frame 518 (seq 520): button ok "OK" (priority: "Priority: Justin")
  - prompt: `Priority: Justin ⏎ Turn: 5 (Justin) ⏎ Phase: Main phase, postcombat ⏎ Stack: Empty`
  - board: {"board":"mode-pay is-selecting","primary":"Autotap a card first (disabled)","dialog":false,"card":[]}
  - screenshot: [shots/g2.1-host-3-unreachable-option.png](shots/g2.1-host-3-unreachable-option.png)
- **control-not-clickable: spell: Rolling Thunder** — 1× in game(s) 1.2
  - e.g. game 1.2, friend, turn 59 MAIN1, frame 9716 (seq 9718): spell: Rolling Thunder — locator.click: Timeout 6000ms exceeded.
  - prompt: `Lone Missionary - Creature 2 / 1 ⏎  ⏎ Pay Mana Cost: {1}{W}`
  - screenshot: [shots/g1.2-friend-2-control-not-clickable.png](shots/g1.2-friend-2-control-not-clickable.png)
- **abandoned: the game was left without an end (time) at turn N** — 1× in game(s) 2.1
  - e.g. game 2.1, host, turn 17 MAIN1, frame 2387 (seq 2389): the game was left without an end (time) at turn 17
  - prompt: `Blood Artist (30) - Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life. [Zone Changer: Blood Artist (30)] ⏎  ⏎ Select target player`
  - screenshot: [shots/g2.1-host-4-abandoned.png](shots/g2.1-host-4-abandoned.png)
- **unreachable-option: button ok "…" (attack: "…")** — 1× in game(s) 3.1
  - e.g. game 3.1, host, turn 17 COMBAT_DECLARE_ATTACKERS, frame 2502 (seq 2504): button ok "OK" (attack: "Select creatures to attack Sam or select player/card you wish to attack.")
  - prompt: `Select creatures to attack Sam or select player/card you wish to attack.`
  - board: {"board":"mode-attack is-selecting","primary":"Confirm attacksOKSpace","dialog":false,"card":[]}
  - screenshot: [shots/g3.1-host-5-unreachable-option.png](shots/g3.1-host-5-unreachable-option.png)
- **unreachable-option: button cancel "…" (attack: "…")** — 1× in game(s) 3.1
  - e.g. game 3.1, host, turn 17 COMBAT_DECLARE_ATTACKERS, frame 2502 (seq 2504): button cancel "Alpha Strike" (attack: "Select creatures to attack Sam or select player/card you wish to attack.")
  - prompt: `Select creatures to attack Sam or select player/card you wish to attack.`
  - board: {"board":"mode-attack is-selecting","primary":"Confirm attacksOKSpace","dialog":false,"card":[]}
  - screenshot: [shots/g3.1-host-6-unreachable-option.png](shots/g3.1-host-6-unreachable-option.png)
- **unreachable-option: attacker Thieving Skydiver (N) has no clickable tile** — 1× in game(s) 3.1
  - e.g. game 3.1, host, turn 17 COMBAT_DECLARE_ATTACKERS, frame 2502 (seq 2504): attacker Thieving Skydiver (27) has no clickable tile
  - prompt: `Select creatures to attack Sam or select player/card you wish to attack.`
  - card: {"id":27}
  - board: {"board":"mode-attack is-selecting","primary":"Confirm attacksOKSpace","dialog":false,"card":[{"where":"tile","mark":"act","w":114,"h":159,"opacity":"1","hidden":false}]}
  - screenshot: [shots/g3.1-host-7-unreachable-option.png](shots/g3.1-host-7-unreachable-option.png)
- **unreachable-option: ask ability_menu "…": no dialog on screen** — 1× in game(s) 3.1
  - e.g. game 3.1, host, turn 29 MAIN1, frame 4108 (seq 4110): ask ability_menu "": no dialog on screen
  - prompt: `Knight of the Reliquary - Creature 2 / 2 ⏎  ⏎ Pay Mana Cost: {1}{W}{G}`
  - ask: ability_menu "" [{T}: Add {W}. | {T}: Add {U}.]
  - board: {"board":"mode-ask","primary":"Answer the question (disabled)","dialog":true,"card":[]}
  - screenshot: [shots/g3.1-host-8-unreachable-option.png](shots/g3.1-host-8-unreachable-option.png)
- **click-no-act: instant: Counterspell: a click on a marked card sent no clickCard** — 1× in game(s) 3.1
  - e.g. game 3.1, host, turn 31 COMBAT_DECLARE_ATTACKERS, frame 4472 (seq 4474): instant: Counterspell: a click on a marked card sent no clickCard
  - prompt: `Waiting for Sam...`
  - card: {"id":9}
  - screenshot: [shots/g3.1-host-9-click-no-act.png](shots/g3.1-host-9-click-no-act.png)
- **unreachable-option: Seasoned Pyromancer (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Seasoned Pyromancer (54, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":54,"name":"Seasoned Pyromancer","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-12-unreachable-option.png](shots/g4.1-friend-12-unreachable-option.png)
- **unreachable-option: Vampire Nighthawk (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Vampire Nighthawk (81, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":81,"name":"Vampire Nighthawk","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-13-unreachable-option.png](shots/g4.1-friend-13-unreachable-option.png)
- **unreachable-option: Lightning Helix (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Lightning Helix (83, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":83,"name":"Lightning Helix","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-14-unreachable-option.png](shots/g4.1-friend-14-unreachable-option.png)
- **unreachable-option: Oko, Thief of Crowns (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Oko, Thief of Crowns (50, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":50,"name":"Oko, Thief of Crowns","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-15-unreachable-option.png](shots/g4.1-friend-15-unreachable-option.png)
- **unreachable-option: Portable Hole (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Portable Hole (82, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":82,"name":"Portable Hole","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-16-unreachable-option.png](shots/g4.1-friend-16-unreachable-option.png)
- **unreachable-option: Courser of Kruphix (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Courser of Kruphix (98, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":98,"name":"Courser of Kruphix","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-17-unreachable-option.png](shots/g4.1-friend-17-unreachable-option.png)
- **unreachable-option: Heartless Act (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Heartless Act (62, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":62,"name":"Heartless Act","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-18-unreachable-option.png](shots/g4.1-friend-18-unreachable-option.png)
- **unreachable-option: Kitesail Freebooter (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 4.1
  - e.g. game 4.1, friend, turn 40 MAIN1, frame 5988 (seq 5987): Kitesail Freebooter (90, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 40 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: Empty`
  - card: {"id":90,"name":"Kitesail Freebooter","zone":"hand","attachedToId":null}
  - board: {"board":"mode-main","primary":"Go to combatOK","dialog":false,"card":[]}
  - screenshot: [shots/g4.1-friend-19-unreachable-option.png](shots/g4.1-friend-19-unreachable-option.png)
- **click-no-act: ok "…" sent no buttonOk** — 1× in game(s) 4.1
  - e.g. game 4.1, host, turn 53 MAIN1, frame 7953 (seq 7955): ok "Go to combatOKSpace" sent no buttonOk
  - prompt: `Garruk Wildspeaker ⏎  ⏎ Pay Mana Cost: {2}{G}{G}`
  - screenshot: [shots/g4.1-host-20-click-no-act.png](shots/g4.1-host-20-click-no-act.png)
- **unreachable-option: Exclude (N, hand): spell — no clickable control at "…" (MAIN1)** — 1× in game(s) 5.1
  - e.g. game 5.1, friend, turn 27 MAIN1, frame 3363 (seq 3362): Exclude (55, hand): spell — no clickable control at "Priority: Sam" (MAIN1)
  - prompt: `Priority: Sam ⏎ Turn: 27 (Sam) ⏎ Phase: Main phase, precombat ⏎ Stack: 1 to Resolve.`
  - card: {"id":55,"name":"Exclude","zone":"hand","attachedToId":null}
  - board: {"board":"mode-stack","primary":"Let it resolveOK","dialog":false,"card":[]}
  - screenshot: [shots/g5.1-friend-21-unreachable-option.png](shots/g5.1-friend-21-unreachable-option.png)
