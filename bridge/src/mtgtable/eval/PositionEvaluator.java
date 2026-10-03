/*
 * mtg-table -- a local browser client for Magic: The Gathering on the Forge engine.
 * Copyright (C) 2026 mtg-table contributors.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
package mtgtable.eval;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import forge.game.Game;
import forge.game.player.Player;

/**
 * THE entry point for a player of ours (the search AI's leaves): "who is
 * winning this game, from this player's chair?" as a probability (D316).
 *
 * <pre>{@code
 *   PositionEvaluator ev = PositionEvaluator.load(Path.of("var/ml/models/synergy-eval.json"),
 *                                                 Path.of("cubes/synergy-cube-180.md"));
 *   double p = ev.winProbability(game, aiPlayer);     // 0..1, the viewer's chance to win
 * }</pre>
 *
 * <p>It reads only what {@code viewer} legitimately knows ({@link GamePosition}):
 * the opponent's hand and both libraries are sizes, so a determinized copy whose
 * hidden cards were redealt scores exactly like the real game.  A finished game
 * is not special-cased: check {@code Player.hasWon()/hasLost()} first, as the
 * search's leaf does.
 *
 * <p>Distribution: the model was trained on decision states -- the viewer holding
 * priority in a main phase or a combat step (D305's rows; a dataset built with
 * {@code --phases main,combat,beginning,end} widens that).  At any other moment
 * the inputs that were constant in training (the viewer's priority flag, an
 * unseen phase) are not read by the model at all, so a leaf at another phase is
 * scored on its board, not extrapolated wildly.
 *
 * <p>Immutable and allocation-light: one instance serves every thread.  Each
 * call must run where the game is not moving (the game thread for a live game,
 * any thread for a private copy).
 */
public final class PositionEvaluator {

    private final EvalModel model;
    private final FeatureEncoder encoder;

    private PositionEvaluator(final EvalModel model) {
        if (!model.liveUnsafeRead().isEmpty()) {
            throw new IllegalArgumentException("the model reads features a live game cannot reproduce: "
                    + model.liveUnsafeRead());
        }
        this.model = model;
        this.encoder = new FeatureEncoder(model.schema());
    }

    /** Load a model; its own schema check runs (see {@link EvalModel}). */
    public static PositionEvaluator load(final Path model) throws IOException {
        return new PositionEvaluator(EvalModel.load(model));
    }

    /**
     * Load a model and require that it was trained for this card pool -- the
     * cube design file (or .dck / plain lists) the decks were drafted from,
     * merged in order as {@code encode.py --vocab} merges them.
     */
    public static PositionEvaluator load(final Path model, final Path... vocabFiles) throws IOException {
        final EvalModel m = EvalModel.load(model);
        if (vocabFiles.length > 0) {
            m.requireVocab(Vocab.fromFiles(List.of(vocabFiles)));
        }
        return new PositionEvaluator(m);
    }

    public static PositionEvaluator of(final EvalModel model) {
        return new PositionEvaluator(model);
    }

    public EvalModel model() {
        return model;
    }

    public FeatureEncoder encoder() {
        return encoder;
    }

    /** P(viewer wins) for a live (or copied) Forge game. */
    public double winProbability(final Game game, final Player viewer) {
        return model.predict(features(game, viewer));
    }

    /** The pre-sigmoid score, if a search would rather add logits than probabilities. */
    public double logit(final Game game, final Player viewer) {
        return model.logit(features(game, viewer));
    }

    /** The D305 feature vector of a live game from {@code viewer}'s side. */
    public double[] features(final Game game, final Player viewer) {
        return encoder.encode(GamePosition.of(game, viewer), viewer.getId(), Tally.fromGame(game));
    }

    /** P(viewer wins) for an already-built position (the log path, tests). */
    public double winProbability(final Position pos, final int viewerId, final Tally tally) {
        return model.predict(encoder.encode(pos, viewerId, tally));
    }
}
