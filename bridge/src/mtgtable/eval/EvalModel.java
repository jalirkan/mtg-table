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
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import mtgtable.Json;

/**
 * A trained position-value model, exported by {@code tools/ml/train_eval.py}
 * ({@code evalnet.py}'s format, {@code formatVersion} 1), and its forward pass:
 * P(the viewer wins) from one D305 feature vector.
 *
 * <p>The network (evalnet.py's header has the why): the model's board columns,
 * standardised; the card block pooled per card state through a learned
 * embedding per card ({@code pooled[state*dim + d] = sum_c count[c,state] *
 * E[c][d]}); then fully connected layers, ReLU between, a sigmoid at the end.
 * All in double; the numbers match numpy's float64 forward pass to rounding
 * ({@code EvalSelfTest}).
 *
 * <p><b>A model loads only against its own schema.</b>  {@link #load} rebuilds
 * the feature layout from the model's vocabulary with {@link FeatureSchema} and
 * refuses the file unless the schema id, the feature count and the card-block
 * offset agree with what the model says -- so a model trained on another
 * encoder version cannot be fed this encoder's vectors -- and
 * {@link #requireVocab} refuses a cube whose card list is not the model's.
 * Immutable after loading, so one instance serves any number of threads.
 */
public final class EvalModel {

    public static final String FORMAT = "mtgtable-position-eval";
    public static final int FORMAT_VERSION = 1;

    private final FeatureSchema schema;
    private final String schemaId;
    private final int[] cols;
    private final double[] mean;
    private final double[] invSd;
    private final int dim;
    private final double[] emb;      // vocab x dim, row-major
    private final int nStates;
    private final double[][] W;      // per layer: out x in, row-major
    private final double[][] B;
    private final int[] in;
    private final int[] out;
    private final int maxWidth;
    private final Map<?, ?> training;

    private EvalModel(final Map<?, ?> m) {
        if (!FORMAT.equals(m.get("format")) || num(m.get("formatVersion")) != FORMAT_VERSION) {
            throw new IllegalArgumentException("not a " + FORMAT + " v" + FORMAT_VERSION + " model (format "
                    + m.get("format") + " v" + m.get("formatVersion") + ")");
        }
        if (num(m.get("schemaVersion")) != FeatureSchema.SCHEMA_VERSION) {
            throw new IllegalArgumentException("model schema version " + m.get("schemaVersion")
                    + ", this encoder's is " + FeatureSchema.SCHEMA_VERSION);
        }
        final List<String> vocab = new ArrayList<>();
        for (final Object o : JsonPosition.arr(m.get("vocab"))) {
            vocab.add(String.valueOf(o));
        }
        this.schema = new FeatureSchema(Vocab.ofCards(vocab));
        this.schemaId = String.valueOf(m.get("schemaId"));
        if (!schema.schemaId().equals(schemaId) || num(m.get("nFeatures")) != schema.size()
                || num(m.get("cardOffset")) != schema.cardOffset()) {
            throw new IllegalArgumentException("model schema " + schemaId + " (" + m.get("nFeatures")
                    + " features) is not this encoder's layout for its vocabulary: schema "
                    + schema.schemaId() + " (" + schema.size() + " features)");
        }
        final Object[] states = JsonPosition.arr(m.get("cardStates"));
        if (!List.of(states).equals(new ArrayList<Object>(FeatureSchema.CARD_STATES))) {
            throw new IllegalArgumentException("model card states differ from this encoder's");
        }
        this.nStates = states.length;
        final Map<?, ?> inp = JsonPosition.map(m.get("input"));
        final Object[] c = JsonPosition.arr(inp.get("boardColumns"));
        final Object[] names = JsonPosition.arr(inp.get("boardNames"));
        cols = new int[c.length];
        for (int i = 0; i < c.length; i++) {
            cols[i] = num(c[i]);
            if (cols[i] < 0 || cols[i] >= schema.cardOffset()
                    || (names.length == c.length && !schema.names().get(cols[i]).equals(names[i]))) {
                throw new IllegalArgumentException("board column " + cols[i] + " is not " + names[i]);
            }
        }
        mean = doubles(inp.get("mean"));
        final double[] sd = doubles(inp.get("sd"));
        if (mean.length != cols.length || sd.length != cols.length) {
            throw new IllegalArgumentException("mean/sd do not match the board columns");
        }
        invSd = new double[sd.length];
        for (int i = 0; i < sd.length; i++) {
            invSd[i] = 1.0 / sd[i];
        }
        dim = num(inp.get("cardDim"));
        final Object[] rows = JsonPosition.arr(inp.get("cardEmbedding"));
        if (rows.length != vocab.size()) {
            throw new IllegalArgumentException("embedding has " + rows.length + " rows for " + vocab.size() + " cards");
        }
        emb = new double[vocab.size() * dim];
        for (int s = 0; s < rows.length; s++) {
            final double[] r = doubles(rows[s]);
            if (r.length != dim) {
                throw new IllegalArgumentException("embedding row " + s + " has " + r.length + " values");
            }
            System.arraycopy(r, 0, emb, s * dim, dim);
        }
        final Object[] layers = JsonPosition.arr(m.get("layers"));
        W = new double[layers.length][];
        B = new double[layers.length][];
        in = new int[layers.length];
        out = new int[layers.length];
        int width = cols.length + nStates * dim;
        int maxW = width;
        for (int l = 0; l < layers.length; l++) {
            final Map<?, ?> L = JsonPosition.map(layers[l]);
            in[l] = num(L.get("in"));
            out[l] = num(L.get("out"));
            if (in[l] != width) {
                throw new IllegalArgumentException("layer " + l + " takes " + in[l] + " inputs, gets " + width);
            }
            final String act = String.valueOf(L.get("activation"));
            if (!act.equals(l == layers.length - 1 ? "sigmoid" : "relu")) {
                throw new IllegalArgumentException("layer " + l + " activation " + act);
            }
            final Object[] wr = JsonPosition.arr(L.get("W"));
            W[l] = new double[in[l] * out[l]];
            for (int o = 0; o < out[l]; o++) {
                final double[] r = doubles(wr[o]);
                if (r.length != in[l]) {
                    throw new IllegalArgumentException("layer " + l + " row " + o + " has " + r.length + " weights");
                }
                System.arraycopy(r, 0, W[l], o * in[l], in[l]);
            }
            B[l] = doubles(L.get("b"));
            width = out[l];
            maxW = Math.max(maxW, width);
        }
        if (width != 1) {
            throw new IllegalArgumentException("the last layer must have one output");
        }
        maxWidth = maxW;
        training = JsonPosition.map(m.get("training"));
    }

    /** Load and validate an exported model. */
    public static EvalModel load(final Path path) throws IOException {
        try (Reader r = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            final Object o = Json.parse(r);
            if (!(o instanceof Map<?, ?> m)) {
                throw new IllegalArgumentException(path + " is not a JSON object");
            }
            return new EvalModel(m);
        }
    }

    /** Refuse a cube whose card list (as encode.py's Vocab builds it) is not the model's. */
    public void requireVocab(final Vocab cube) {
        if (!cube.cards().equals(schema.vocab().cards())) {
            throw new IllegalArgumentException("the model was trained for another card pool: schema "
                    + schemaId + " has " + schema.vocab().size() + " slots, this cube's schema is "
                    + new FeatureSchema(cube).schemaId() + " with " + cube.size());
        }
    }

    public FeatureSchema schema() {
        return schema;
    }

    public String schemaId() {
        return schemaId;
    }

    /** The training block of the export (date, data, metrics), as parsed JSON. */
    public Map<?, ?> training() {
        return training;
    }

    /** P(the viewer wins) for one feature vector of this model's schema. */
    public double predict(final double[] f) {
        return 1.0 / (1.0 + Math.exp(-logit(f)));
    }

    /** The pre-sigmoid score. */
    public double logit(final double[] f) {
        if (f.length != schema.size()) {
            throw new IllegalArgumentException(f.length + " features, the schema has " + schema.size());
        }
        double[] x = new double[in[0]];
        for (int i = 0; i < cols.length; i++) {
            x[i] = (f[cols[i]] - mean[i]) * invSd[i];
        }
        final int base = cols.length;
        final int off = schema.cardOffset();
        final int nCards = schema.vocab().size();
        for (int s = 0; s < nCards; s++) {
            final int row = off + s * nStates;
            for (int t = 0; t < nStates; t++) {
                final double cnt = f[row + t];
                if (cnt != 0.0) {
                    final int e = s * dim;
                    final int p = base + t * dim;
                    for (int d = 0; d < dim; d++) {
                        x[p + d] += cnt * emb[e + d];
                    }
                }
            }
        }
        double[] h = new double[maxWidth];
        for (int l = 0; l < W.length; l++) {
            final double[] w = W[l];
            final double[] bias = B[l];
            final int ni = in[l];
            final int no = out[l];
            final boolean last = l == W.length - 1;
            for (int o = 0; o < no; o++) {
                double z = bias[o];
                final int r = o * ni;
                for (int i = 0; i < ni; i++) {
                    z += w[r + i] * x[i];
                }
                h[o] = last || z > 0 ? z : 0.0;
            }
            final double[] tmp = x;
            x = h;
            h = tmp.length >= maxWidth ? tmp : new double[maxWidth];
        }
        return x[0];
    }

    private static int num(final Object o) {
        return o instanceof Number n ? n.intValue() : -1;
    }

    private static double[] doubles(final Object o) {
        final Object[] a = JsonPosition.arr(o);
        final double[] d = new double[a.length];
        for (int i = 0; i < a.length; i++) {
            d[i] = ((Number) a[i]).doubleValue();
        }
        return d;
    }
}
