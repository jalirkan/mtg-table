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
package mtgtable.ai;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import mtgtable.Json;

/**
 * The distilled policy's model (J126, B1), as {@code tools/ml/distill.py train}
 * exports it ({@code format "mtgtable-distill"}, version 1): per decision kind,
 * a small scorer over the search's own candidates, trained to pick what
 * search-v2 played.
 *
 * <p>For candidate {@code i} of a decision, {@code x_i = [state, c_i, c_i - c_0]}
 * ({@link DistillFeatures}: the state vector, the candidate's vector, and its
 * difference to Forge's answer, candidate 0), standardised with the training
 * split's mean and deviation; the score is
 * {@code w2 . relu(W1 x_i + b1) + u . x_i}; the seat plays the candidate with
 * the highest score, the lowest index on a tie (so Forge's answer when nothing
 * scores above it).  Numpy's float64 forward pass and this one agree to
 * rounding ({@code DistillSelfTest} on {@code fixtures/distill/}).
 *
 * <p><b>A model loads only against this layout</b>: its feature version, state
 * schema id and size, and each kind's candidate names must be
 * {@link DistillFeatures}'s, or {@link #load} refuses it.  A kind the file does
 * not carry is not covered ({@link #covers}): the seat then plays Forge's own
 * answer there, as search-v2 does at every decision it does not search.
 * Immutable after loading; one instance serves every thread.
 */
public final class DistillModel {

    public static final String FORMAT = "mtgtable-distill";
    public static final int FORMAT_VERSION = 1;

    /** One kind's scorer. */
    static final class Head {
        final int d;
        final int h;
        final double[] mean;
        final double[] invSd;
        final double[][] w1;   // h x d
        final double[] b1;
        final double[] w2;
        final double[] u;

        Head(final Map<?, ?> m, final int stateSize, final List<String> names, final String kind) {
            final List<String> got = strings(m.get("candNames"));
            if (!got.equals(names)) {
                throw new IllegalArgumentException("model kind " + kind + " was trained on candidate features " + got
                        + ", this layout's are " + names);
            }
            d = stateSize + 2 * names.size();
            mean = doubles(m.get("mean"), d, kind + ".mean");
            final double[] sd = doubles(m.get("sd"), d, kind + ".sd");
            invSd = new double[d];
            for (int i = 0; i < d; i++) {
                invSd[i] = sd[i] > 0 ? 1.0 / sd[i] : 1.0;
            }
            final Object[] rows = arr(m.get("W1"));
            h = rows.length;
            if (h < 1) {
                throw new IllegalArgumentException("model kind " + kind + " has no hidden unit");
            }
            w1 = new double[h][];
            for (int j = 0; j < h; j++) {
                w1[j] = doubles(rows[j], d, kind + ".W1[" + j + "]");
            }
            b1 = doubles(m.get("b1"), h, kind + ".b1");
            w2 = doubles(m.get("w2"), h, kind + ".w2");
            u = doubles(m.get("u"), d, kind + ".u");
        }

        double score(final double[] x) {
            final double[] z = new double[d];
            for (int i = 0; i < d; i++) {
                z[i] = (x[i] - mean[i]) * invSd[i];
            }
            double s = 0;
            for (int i = 0; i < d; i++) {
                s += u[i] * z[i];
            }
            for (int j = 0; j < h; j++) {
                final double[] w = w1[j];
                double a = b1[j];
                for (int i = 0; i < d; i++) {
                    a += w[i] * z[i];
                }
                if (a > 0) {
                    s += w2[j] * a;
                }
            }
            return s;
        }
    }

    private final Map<String, Head> heads = new HashMap<>();
    private final int stateSize;
    private final Map<?, ?> training;

    private DistillModel(final Map<?, ?> m) {
        if (!FORMAT.equals(m.get("format")) || num(m.get("formatVersion")) != FORMAT_VERSION) {
            throw new IllegalArgumentException("not a " + FORMAT + " v" + FORMAT_VERSION + " model (format "
                    + m.get("format") + " v" + m.get("formatVersion") + ")");
        }
        if (!DistillFeatures.VERSION.equals(m.get("featureVersion"))) {
            throw new IllegalArgumentException("model feature version " + m.get("featureVersion") + ", this layout is "
                    + DistillFeatures.VERSION);
        }
        stateSize = num(m.get("stateSize"));
        if (!DistillFeatures.stateSchema().schemaId().equals(m.get("stateSchemaId"))
                || stateSize != DistillFeatures.stateSchema().size()) {
            throw new IllegalArgumentException("model state schema " + m.get("stateSchemaId") + " (" + stateSize
                    + " features) is not this encoder's " + DistillFeatures.stateSchema().schemaId() + " ("
                    + DistillFeatures.stateSchema().size() + ")");
        }
        final Map<?, ?> kinds = map(m.get("kinds"));
        for (final Map.Entry<?, ?> e : kinds.entrySet()) {
            final String k = String.valueOf(e.getKey());
            final List<String> names = DistillFeatures.names(k);
            if (names == null) {
                throw new IllegalArgumentException("model kind " + k + " is not one this policy decides (p, a, b)");
            }
            heads.put(k, new Head(map(e.getValue()), stateSize, names, k));
        }
        training = m.get("training") instanceof Map<?, ?> t ? t : Map.of();
    }

    /** Load and validate an exported model. */
    public static DistillModel load(final Path path) throws IOException {
        try (Reader r = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            final Object o = Json.parse(r);
            if (!(o instanceof Map<?, ?> m)) {
                throw new IllegalArgumentException(path + " is not a JSON object");
            }
            return new DistillModel(m);
        }
    }

    private static final Map<String, DistillModel> LOADED = new ConcurrentHashMap<>();

    /** One loaded model per path, shared by every seat and thread; a file that cannot be loaded is an error. */
    public static DistillModel cached(final String path) {
        return LOADED.computeIfAbsent(path, p -> {
            try {
                return load(Path.of(p));
            } catch (final IOException e) {
                throw new IllegalArgumentException("search distill=" + p + ": " + e.getMessage(), e);
            }
        });
    }

    /** Whether the model decides this kind (else the seat plays Forge's answer there). */
    public boolean covers(final String kind) {
        return heads.containsKey(kind);
    }

    public Map<?, ?> training() {
        return training;
    }

    /** Each candidate's score: {@code state} is {@link DistillFeatures#state}, {@code cands} {@link DistillFeatures#candidates}. */
    public double[] scores(final String kind, final double[] state, final double[][] cands) {
        final Head h = heads.get(kind);
        if (h == null) {
            throw new IllegalArgumentException("the model does not cover kind " + kind);
        }
        if (state.length != stateSize) {
            throw new IllegalArgumentException("state has " + state.length + " features, the model " + stateSize);
        }
        final int c = (h.d - stateSize) / 2;
        final double[] out = new double[cands.length];
        final double[] x = new double[h.d];
        System.arraycopy(state, 0, x, 0, stateSize);
        for (int i = 0; i < cands.length; i++) {
            if (cands[i].length != c) {
                throw new IllegalArgumentException("candidate " + i + " has " + cands[i].length + " features, the model " + c);
            }
            for (int f = 0; f < c; f++) {
                x[stateSize + f] = cands[i][f];
                x[stateSize + c + f] = cands[i][f] - cands[0][f];
            }
            out[i] = h.score(x);
        }
        return out;
    }

    /** The index of the highest score, the lowest on a tie. */
    public static int argmax(final double[] s) {
        int best = 0;
        for (int i = 1; i < s.length; i++) {
            if (s[i] > s[best]) {
                best = i;
            }
        }
        return best;
    }

    // ------------------------------------------------------------ JSON (Jetty's parser: numbers are Long or Double)

    static int num(final Object o) {
        if (!(o instanceof Number n)) {
            throw new IllegalArgumentException("expected a number, got " + o);
        }
        return n.intValue();
    }

    static Map<?, ?> map(final Object o) {
        if (!(o instanceof Map<?, ?> m)) {
            throw new IllegalArgumentException("expected an object, got " + o);
        }
        return m;
    }

    static Object[] arr(final Object o) {
        if (o instanceof Object[] a) {
            return a;
        }
        if (o instanceof List<?> l) {
            return l.toArray();
        }
        throw new IllegalArgumentException("expected an array, got " + o);
    }

    static double[] doubles(final Object o, final int n, final String what) {
        final Object[] a = arr(o);
        if (a.length != n) {
            throw new IllegalArgumentException(what + " has " + a.length + " values, want " + n);
        }
        final double[] d = new double[n];
        for (int i = 0; i < n; i++) {
            if (!(a[i] instanceof Number x)) {
                throw new IllegalArgumentException(what + "[" + i + "] is not a number");
            }
            d[i] = x.doubleValue();
        }
        return d;
    }

    static List<String> strings(final Object o) {
        final List<String> l = new ArrayList<>();
        for (final Object x : arr(o)) {
            l.add(String.valueOf(x));
        }
        return l;
    }
}
