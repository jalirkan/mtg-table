/*
 * mtg-table — render/CombatBands.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5: what has been declared so far.**
 *
 * `PLAN.md` "What M4 hands to M5": *"Attackers and blockers are declared by
 * clicking tiles and pressing the engine's button, which is how Forge's inputs
 * genuinely work — but there is no band-building gesture, no drag, and no 'this
 * blocker on that attacker' beyond the clicks the engine asks for."*
 *
 * This adds the missing half — a reading of the declaration in progress — and
 * **adds no gesture at all**:
 *
 *   - every fact comes from `state.combat.bands`, which is the engine's own
 *     `CombatView` as of this snapshot. The client infers nothing, pairs
 *     nothing, and remembers nothing across frames;
 *   - there is no drag and no drop target. Forge's `InputAttack` /
 *     `InputBlock` want tile clicks and then their own OK button, and a board
 *     that invented a second grammar for the same input would be the "threw the
 *     engine's answer away" failure mode (§2.2);
 *   - the strip is drawn whenever there is a band to draw, and in the two
 *     declaration steps it is drawn even while empty, because *"nothing declared
 *     yet"* during declare-attackers is information and a missing panel is not.
 *
 * Every card goes through `CardTile` (`anchor={false}` — the battlefield row is
 * where the card is for the arrows overlay), and every fact here is also an
 * arrow and also a tile note (§14 rule 4): three renderings, one source.
 */

import type { ArtIndex } from '../art.ts';
import { isHidden, type GameStateBody, type InputBody } from '../protocol.ts';
import { CardTile, type Clicks } from './CardTile.tsx';
import { cardLabel, entityLabel, findCard } from './resolve.ts';

/** Forge's own `PhaseType` names for the two declaration steps (§3.1, verbatim). */
export const DECLARE_ATTACKERS = 'COMBAT_DECLARE_ATTACKERS';
export const DECLARE_BLOCKERS = 'COMBAT_DECLARE_BLOCKERS';

export function CombatBands({
  board,
  input,
  art,
  clicks,
  you,
}: {
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  you: number | null;
}): JSX.Element | null {
  const bands = board.combat?.bands ?? [];
  const declaring =
    board.phase === DECLARE_ATTACKERS || board.phase === DECLARE_BLOCKERS;
  if (bands.length === 0 && !declaring) return null;

  const step =
    board.phase === DECLARE_ATTACKERS
      ? 'declare attackers'
      : board.phase === DECLARE_BLOCKERS
        ? 'declare blockers'
        : 'combat';

  return (
    <section className="bands" aria-label={`Combat — ${step}`}>
      <h3 className="bands__head">
        <span className="k">{step}</span>{' '}
        <span className="muted">
          {bands.length === 0
            ? 'nothing declared yet — click a creature, then the engine’s button'
            : `${String(bands.length)} band${bands.length === 1 ? '' : 's'}, as the engine reports them`}
        </span>
        {/* The engine's own prompt is already verbatim in the decision panel;
            this is the one place the two are side by side while attacking. */}
        {input !== null && declaring && <span className="bands__prompt muted">{input.prompt}</span>}
      </h3>

      {bands.length > 0 && (
        <ol className="bands__list">
          {bands.map((band, i) => {
            const defender = entityLabel(board, band.defender);
            return (
              <li key={`${String(i)}-${band.attackerIds.join('.')}`} className="band">
                <Row
                  label="attacking"
                  ids={band.attackerIds}
                  board={board}
                  art={art}
                  clicks={clicks}
                  you={you}
                />
                <span className="band__arrow" aria-hidden="true">
                  →
                </span>
                <span className="band__defender">{defender}</span>
                {band.blockerIds.length > 0 ? (
                  <>
                    <span className="band__blocked">blocked by</span>
                    <Row
                      label="blocking"
                      ids={band.blockerIds}
                      board={board}
                      art={art}
                      clicks={clicks}
                      you={you}
                    />
                    {/* §3.1 — `damageOrder` is the engine's own ordering of the
                        blockers for damage assignment. Printed, never sorted. */}
                    {band.damageOrder.length > 0 && (
                      <span className="muted">
                        damage order: {band.damageOrder.map((id) => cardLabel(board, id)).join(' → ')}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="muted">unblocked</span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * One side of a band. An id that does not resolve in **this** frame prints as an
 * id (P5, §3.6 rule 1) rather than as a tile for a card that is no longer there.
 */
function Row({
  label,
  ids,
  board,
  art,
  clicks,
  you,
}: {
  label: string;
  ids: number[];
  board: GameStateBody;
  art: ArtIndex;
  clicks: Clicks | null;
  you: number | null;
}): JSX.Element {
  return (
    <span className="band__side">
      <span className="sr-only">{label}: </span>
      <ul className="row row--stack band__row" style={{ '--slots': String(Math.max(ids.length, 1)) } as React.CSSProperties}>
        {ids.map((id, i) => {
          const card = findCard(board, id);
          if (card === undefined) return null;
          return (
            <CardTile
              key={id}
              card={card}
              kind="stack"
              input={null}
              art={art}
              clicks={clicks}
              index={i}
              mine={you !== null && !isHidden(card) && card.controller === you}
              zoom="down"
              // The battlefield tile owns `c:<id>`; this is a second copy.
              anchor={false}
            />
          );
        })}
      </ul>
      <span className="sr-only">{ids.map((id) => cardLabel(board, id)).join(', ')}</span>
    </span>
  );
}
