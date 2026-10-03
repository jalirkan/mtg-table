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
 */
package mtgtable.cubelab;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.google.common.eventbus.Subscribe;

import forge.LobbyPlayer;
import forge.StaticData;
import forge.card.CardDb;
import forge.card.CardRules;
import forge.card.ColorSet;
import forge.card.ICardFace;
import forge.card.MagicColor;
import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.Game;
import forge.game.GameEndReason;
import forge.game.GameOutcome;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.Match;
import forge.game.event.GameEventFlipCoin;
import forge.game.event.GameEventTurnBegan;
import forge.game.player.Player;
import forge.game.player.RegisteredPlayer;
import forge.gamemodes.limited.BoosterDeckBuilder;
import forge.gamemodes.limited.CardRanker;
import forge.gamemodes.limited.DeckColors;
import forge.gamemodes.limited.DraftRankCache;
import forge.gamemodes.limited.IBoosterDraft;
import forge.gamemodes.limited.LimitedDeckEvaluator;
import forge.item.PaperCard;
import forge.util.MyRandom;
import mtgtable.Bootstrap;
import mtgtable.Config;
import mtgtable.Json;
import mtgtable.Json.JsonOut;
import mtgtable.SeatRecorder;

/**
 * The cube lab's engine half (D293-D296; {@code tools/cubelab.sh} is the
 * command, {@code docs/guides/cube-lab.md} the manual).  Everything that is not
 * the engine -- parsing a cube, ratings, the two drafts, deckbuilding, the
 * report -- is TypeScript under {@code tools/cubelab/}; this file answers the
 * two questions only Forge can:
 *
 * <ol>
 *   <li>{@code facts --names <file> --out <json>}: what each listed name IS in
 *       this engine's card database -- found or not (an MDFC by its front face,
 *       the way Forge keys it), colours, mana cost, type line, oracle text,
 *       Forge's draft rank for its best-ranked printing (Forge's DEFAULT
 *       printing is often a precon reprint with no rank file, and an unranked
 *       card scores -100, "drafted last"), and the {@code AI:RemAIDeck} /
 *       {@code AI:RemRandomDeck} hints (Forge's own "the AI plays this
 *       poorly").</li>
 *   <li>{@code play}: a worker.  It reads one match per stdin line (two
 *       {@code .dck} paths, both pools, a seed, the number of games, the two
 *       AI profiles, a per-game timeout), plays it, and writes one
 *       {@code CUBELAB {json}} line per match on its ORIGINAL stdout.  Forge's
 *       own chatter goes to stderr, which the TypeScript runner files under
 *       {@code <out>/logs/}.</li>
 * </ol>
 *
 * <h2>Recording (D315)</h2>
 *
 * A match line with a {@code record} block ({@code run --record-all} /
 * {@code --record-every N}) has every game of it written, while it is played,
 * as two gzipped frame logs -- {@code <dir>/g<n>-seat0.jsonl.gz} (drafter A's
 * view) and {@code -seat1} (drafter B's) -- by {@link SeatRecorder}, which is
 * {@code RecordMatch}'s recorder reused: the bridge's {@code Snap.state} and its
 * redaction, the same header and {@code hello_ok.match}.  The recorders are
 * subscribed before the game starts and finished inside the same
 * {@code GameAction.invoke} body that runs the game, so this file still makes
 * no hop and names no {@code CardView}.
 *
 * <h2>The rules it keeps</h2>
 *
 * Hard rule 1: {@link Bootstrap#installGui} is the first Forge call.  Hard rule
 * 4: decks are read with {@link DeckSerializer#fromFile} only.  Every AI seat is
 * {@link Bootstrap#createAiPlayer} with an explicit profile (D107).  It names no
 * {@code CardView}, starts no thread, and hops onto no game thread: each game is
 * started with {@code GameAction.invoke}, exactly as {@code RecordMatch} starts
 * its one game, from {@code main}, which is not a game thread -- so it STARTS
 * {@code Game-n} rather than running beside it (hard rule 3).  The two event
 * subscribers below run on that game thread, synchronously, and read only
 * {@code Game}-side objects and a player's name.
 *
 * <h2>Who plays first (D295)</h2>
 *
 * A Bo3 here alternates play and draw on purpose, so that being on the play is
 * spread evenly over both drafters.  Forge decides the first player in the
 * private {@code GameAction.determineFirstTurnPlayer}: a coin flip
 * ({@code GameEventFlipCoin}, then {@code Aggregates.random(players)}, which is
 * {@code MyRandom.getRandom().nextInt(2)}) for the first game of a
 * {@code Match}, the loser's choice after it.  So every game is its own
 * one-game {@code Match}, and at the flip event the lab hands {@code MyRandom}
 * a {@link ForcedFirst} whose next {@code nextInt} names the seat due to play
 * and which puts the seeded generator straight back -- the game's own random
 * stream is not consumed by the flip at all.  The first {@code GameEventTurnBegan}
 * is read back and reported ({@code onPlayVerified}).
 *
 * <h2>The watchdog</h2>
 *
 * {@code main} waits for each game with a deadline.  At the deadline the game is
 * ended as a draw ({@code Game.setGameOver(GameEndReason.Draw)}) and recorded
 * {@code timeout: true}; if the game thread does not come back within 30 s of
 * that, the worker prints a {@code stuck} line and exits 3, and the runner
 * restarts a worker for whatever is left.  A game whose thread throws is
 * recorded with the exception's class and the match carries on.
 */
public final class CubeLab {

    private CubeLab() { }

    /** Forge's cube-draft ranking list, the one {@code BoosterDraft.setupCustomDraft} selects. */
    static final String CUBE_RANKINGS = "rankings_cubecobra.txt";

    /** What a protocol line starts with; the runner ignores every other stdout line. */
    static final String PREFIX = "CUBELAB ";

    /** The stdout the runner reads.  System.out itself is pointed at stderr for Forge's chatter. */
    private static PrintStream proto;

    /** This worker's config (the Forge home, the jar). */
    private static Config cfg;

    /** The jar's sha256 for the recordings' headers, computed on the first recorded game. */
    private static String jarSha;

    public static void main(final String[] args) throws Exception {
        proto = new PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), true, StandardCharsets.UTF_8);
        System.setOut(System.err);
        if (args.length == 0) {
            System.err.println("usage: CubeLab facts --names <file> --out <json> | CubeLab play");
            System.exit(2);
        }
        cfg = Config.load();
        final long t0 = System.nanoTime();
        Bootstrap.installGui(cfg.forgeHomeDir());           // hard rule 1: the FIRST Forge call
        final long initMs = Bootstrap.initializeModel(false);
        // A cube draft in Forge ranks by the CubeCobra list first; set it the way
        // BoosterDraft.setupCustomDraft does, so CardRanker.getRawScore reads it.
        IBoosterDraft.CUSTOM_RANKINGS_FILE[0] = CUBE_RANKINGS;
        emit(new JsonOut().obj().n("type", "ready").n("initMs", initMs).n("bootMs", ms(t0)).end().done());
        int rc;
        switch (args[0]) {
            case "facts": rc = facts(args); break;
            case "play": rc = play(); break;
            default: System.err.println("unknown command " + args[0]); rc = 2;
        }
        System.err.flush();
        proto.flush();
        System.exit(rc);   // Forge leaves non-daemon pools behind
    }

    static void emit(final String json) {
        synchronized (CubeLab.class) {
            proto.print(PREFIX);
            proto.println(json);
            proto.flush();
        }
    }

    // ==================================================================
    // facts
    // ==================================================================

    static int facts(final String[] args) throws Exception {
        String names = null, out = null;
        for (int i = 1; i < args.length; i++) {
            switch (args[i]) {
                case "--names": names = args[++i]; break;
                case "--out": out = args[++i]; break;
                default: throw new IllegalArgumentException("unknown flag " + args[i]);
            }
        }
        if (names == null || out == null) throw new IllegalArgumentException("facts needs --names and --out");
        final CardDb db = StaticData.instance().getCommonCards();
        final List<String> all = new ArrayList<>();
        for (final PaperCard pc : db.getUniqueCards()) all.add(pc.getName());
        final JsonOut j = new JsonOut().obj();
        j.n("engine", "forge").key("cards").arr();
        for (final String raw : Files.readAllLines(new File(names).toPath(), StandardCharsets.UTF_8)) {
            final String listed = raw.trim();
            if (listed.isEmpty()) continue;
            j.obj().n("listed", listed);
            final PaperCard exact = db.getCard(listed);
            final PaperCard pc = lookup(db, listed);
            if (pc == null) {
                j.n("found", false).key("suggestions").arr();
                for (final String s : suggest(listed, all)) j.v(s);
                j.end().end();
                continue;
            }
            final PaperCard ranked = rankedPrinting(db, pc);
            final CardRules r = pc.getRules();
            final ICardFace main = r.getMainPart();
            j.n("found", true).n("exact", exact != null).n("name", pc.getName())
             .n("colors", colorKey(r.getColor())).n("identity", colorKey(r.getColorIdentity()))
             .n("manaCost", r.getManaCost() == null ? "" : r.getManaCost().getShortString())
             .n("cmc", (long) (r.getManaCost() == null ? 0 : r.getManaCost().getCMC()))
             .n("type", r.getType().toString())
             .n("land", r.getType().isLand()).n("basicLand", r.getType().isBasicLand())
             .n("creature", r.getType().isCreature()).n("planeswalker", r.getType().isPlaneswalker())
             .n("instant", r.getType().isInstant()).n("sorcery", r.getType().isSorcery())
             .n("artifact", r.getType().isArtifact()).n("enchantment", r.getType().isEnchantment())
             .n("power", main.getPower()).n("toughness", main.getToughness())
             .n("oracle", r.getOracleText() == null ? "" : r.getOracleText())
             .n("otherFace", r.getOtherPart() == null ? null : r.getOtherPart().getName())
             .n("otherFaceType", r.getOtherPart() == null ? null : r.getOtherPart().getType().toString())
             .n("unsupported", r.isUnsupported())
             .n("remAIDeck", r.getAiHints().getRemAIDecks())
             .n("remRandomDeck", r.getAiHints().getRemRandomDecks());
            // Forge's raw draft score for the best-ranked printing, and where it came from.
            final Double cube = DraftRankCache.getCustomRanking(CUBE_RANKINGS, pc.getName());
            final Double set = DraftRankCache.getRanking(ranked.getName(), ranked.getEdition());
            final double rawScore = CardRanker.getRawScore(ranked);
            j.key("rank").obj().n("source", cube != null ? "cube" : set != null ? "set" : "none")
             .n("edition", ranked.getEdition()).n("defaultEdition", pc.getEdition())
             .n("rawScore", rawScore).end();
            j.end();
        }
        j.end().end();
        Files.writeString(new File(out).toPath(), j.done() + "\n", StandardCharsets.UTF_8);
        emit(new JsonOut().obj().n("type", "facts").n("out", out).end().done());
        return 0;
    }

    /** Exact name first; for "A // B" the front face, which is how Forge keys an MDFC. */
    static PaperCard lookup(final CardDb db, final String name) {
        PaperCard pc = db.getCard(name);
        if (pc == null && name.contains(" // ")) pc = db.getCard(name.substring(0, name.indexOf(" // ")));
        return pc;
    }

    /** Among all printings, the one whose per-set draft ranking is best (Forge's default printing often has none). */
    static PaperCard rankedPrinting(final CardDb db, final PaperCard pc) {
        PaperCard best = pc;
        Double bestRank = DraftRankCache.getRanking(pc.getName(), pc.getEdition());
        for (final PaperCard p : db.getAllCards(pc.getName())) {
            final Double r = DraftRankCache.getRanking(p.getName(), p.getEdition());
            if (r != null && (bestRank == null || r < bestRank)) { best = p; bestRank = r; }
        }
        return best;
    }

    static List<String> suggest(final String name, final List<String> all) {
        final String lower = name.toLowerCase(Locale.ROOT);
        final List<Object[]> best = new ArrayList<>();
        for (final String n : all) {
            final int d = lev(lower, n.toLowerCase(Locale.ROOT));
            if (d <= Math.max(3, name.length() / 4)) best.add(new Object[] {d, n});
        }
        best.sort((a, b) -> (Integer) a[0] - (Integer) b[0]);
        final List<String> out = new ArrayList<>();
        for (int i = 0; i < Math.min(3, best.size()); i++) out.add((String) best.get(i)[1]);
        return out;
    }

    static int lev(final String a, final String b) {
        final int[] prev = new int[b.length() + 1], cur = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) prev[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                cur[j] = Math.min(Math.min(cur[j - 1] + 1, prev[j] + 1),
                        prev[j - 1] + (a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1));
            }
            System.arraycopy(cur, 0, prev, 0, cur.length);
        }
        return prev[b.length()];
    }

    static String colorKey(final ColorSet cs) {
        final StringBuilder sb = new StringBuilder();
        if (cs == null) return "";
        for (final char c : "WUBRG".toCharArray()) {
            if (cs.hasAnyColor(MagicColor.fromName(c))) sb.append(c);
        }
        return sb.toString();
    }

    // ==================================================================
    // play: a worker
    // ==================================================================

    static int play() throws Exception {
        final BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String line;
        while ((line = in.readLine()) != null) {
            if (line.isBlank()) continue;
            final Map<?, ?> job = (Map<?, ?>) Json.parse(line);
            if ("quit".equals(job.get("type"))) break;
            final int rc = playMatch(job);
            if (rc != 0) return rc;
        }
        return 0;
    }

    static String str(final Map<?, ?> m, final String k) {
        final Object v = m.get(k);
        return v == null ? null : v.toString();
    }

    static long num(final Map<?, ?> m, final String k, final long dflt) {
        final Object v = m.get(k);
        return v instanceof Number ? ((Number) v).longValue() : dflt;
    }

    /** One match: an optional Forge-builder comparison, then up to {@code games} one-game Matches. */
    static int playMatch(final Map<?, ?> job) throws Exception {
        final String id = str(job, "id");
        final long seed = num(job, "seed", 0);
        final int games = (int) num(job, "games", 3);
        final long timeoutMs = num(job, "gameTimeoutSec", 300) * 1000L;
        final String profA = str(job, "profileA"), profB = str(job, "profileB");
        final String builder = str(job, "builder");
        final Deck[] decks = new Deck[2];
        final File[] deckFiles = new File[2];
        final JsonOut res = new JsonOut().obj().n("type", "match").n("id", id);

        // Forge's own builder, for comparison (and as the deck when --builder forge or the lab's failed).
        res.key("forge").arr();
        for (int s = 0; s < 2; s++) {
            final String side = s == 0 ? "A" : "B";
            final Object[] pool = (Object[]) job.get("pool" + side);
            final String labDeck = str(job, "deck" + side);
            Deck forgeDeck = null;
            final long t = System.nanoTime();
            try {
                forgeDeck = forgeBuild(pool, side, res);
            } catch (final RuntimeException e) {
                res.obj().n("side", side).n("error", e.getClass().getSimpleName()).end();
            }
            final String forgeOut = str(job, "forgeDeckOut" + side);
            if (forgeDeck != null && forgeOut != null) DeckSerializer.writeDeck(forgeDeck, new File(forgeOut));
            final boolean useForge = "forge".equals(builder) || labDeck == null;
            decks[s] = useForge ? forgeDeck : DeckSerializer.fromFile(new File(labDeck));
            if (decks[s] == null) throw new IllegalStateException("no deck for side " + side + " of " + id);
            deckFiles[s] = useForge ? (forgeOut == null ? null : new File(forgeOut)) : new File(labDeck);
            decks[s].setName("Drafter " + side);
            System.err.println("[cubelab] " + id + " side " + side + " forge build " + ms(t) + " ms");
        }
        res.end();

        final LobbyPlayer lpA = Bootstrap.createAiPlayer("Drafter A", 0, profA);
        final LobbyPlayer lpB = Bootstrap.createAiPlayer("Drafter B", 1, profB);
        final Map<?, ?> record = job.get("record") instanceof Map ? (Map<?, ?>) job.get("record") : null;
        int winsA = 0, winsB = 0;
        final int need = games / 2 + 1;
        res.key("games").arr();
        for (int g = 1; g <= games && winsA < need && winsB < need; g++) {
            // Alternate who is on the play; the draft's seed decides game 1, so it alternates across drafts too.
            final boolean aOnPlay = ((seed + g) % 2L) == 1L;
            final long gameSeed = seed * 1000003L + g;
            final Recording rec = record == null ? null
                    : new Recording(record, id, seed, g, gameSeed, aOnPlay, decks, deckFiles, profA, profB);
            final GameResult r = playGame(decks, lpA, lpB, aOnPlay, gameSeed, timeoutMs, rec);
            if (r.stuck) {
                res.end().n("stuck", true).end();
                emit(res.done());
                return 3;
            }
            if ("A".equals(r.winner)) winsA++;
            else if ("B".equals(r.winner)) winsB++;
            res.obj().n("n", (long) g).n("onPlay", aOnPlay ? "A" : "B").n("onPlayVerified", r.firstTurn)
               .n("winner", r.winner).n("turns", (long) r.turns).n("ms", r.ms).n("timeout", r.timeout)
               .n("reason", r.reason).n("error", r.error).n("cpuMs", r.cpuMs).n("gameCpuMs", r.gameCpuMs);
            if (r.recorded != null) {
                res.key("recorded").obj().n("dir", r.recorded).n("bytes", r.recordBytes)
                   .n("frames", (long) r.recordFrames).n("errors", (long) r.recordErrors).end();
            }
            res.end();
        }
        res.end().n("winsA", (long) winsA).n("winsB", (long) winsB).end();
        emit(res.done());
        return 0;
    }

    /**
     * Forge's BoosterDeckBuilder over every colour pair, keeping the deck with the
     * most real spells (capped at 23) and then the best {@code LimitedDeckEvaluator}
     * value -- left to its committed colours alone it once padded a thin pool to
     * 11 spells and 29 lands.  Appends its summary to {@code res}.
     */
    static Deck forgeBuild(final Object[] poolNames, final String side, final JsonOut res) throws Exception {
        final CardDb db = StaticData.instance().getCommonCards();
        final List<PaperCard> pool = new ArrayList<>();
        for (final Object o : poolNames) {
            final PaperCard pc = lookup(db, o.toString());
            if (pc != null) pool.add(pc);
        }
        final byte[] wubrg = {MagicColor.WHITE, MagicColor.BLUE, MagicColor.BLACK, MagicColor.RED, MagicColor.GREEN};
        Deck best = null;
        int bestSpells = -1;
        double bestVal = -1e9;
        for (int i = 0; i < 5; i++) {
            for (int k = i + 1; k < 5; k++) {
                final DeckColors dc = newDeckColors();
                dc.setColorsByList(List.of(wubrg[i], wubrg[k]));
                final Deck deck;
                try {
                    deck = new BoosterDeckBuilder(new ArrayList<>(pool), dc).buildDeck((String) null);
                } catch (final RuntimeException e) {
                    continue;
                }
                int spells = 0;
                for (final Map.Entry<PaperCard, Integer> e : deck.getMain()) {
                    if (!e.getKey().getRules().getType().isLand()) spells += e.getValue();
                }
                final double val = LimitedDeckEvaluator.getDeckDraftValue(deck);
                final int sp = Math.min(spells, 23);
                if (sp > bestSpells || (sp == bestSpells && val > bestVal)) {
                    best = deck; bestSpells = spells; bestVal = val;
                }
            }
        }
        if (best == null) throw new IllegalStateException("BoosterDeckBuilder built nothing");
        int mask = 0, lands = 0;
        final Map<String, Integer> main = new LinkedHashMap<>();
        for (final Map.Entry<PaperCard, Integer> e : best.getMain()) {
            final CardRules r = e.getKey().getRules();
            if (r.getType().isLand()) lands += e.getValue();
            else mask |= r.getColor().getColor();
            main.merge(e.getKey().getName(), e.getValue(), Integer::sum);
        }
        res.obj().n("side", side).n("colors", colorKey(ColorSet.fromMask(mask))).n("spells", (long) bestSpells)
           .n("lands", (long) lands).n("value", bestVal).key("main").arr();
        for (final Map.Entry<String, Integer> e : main.entrySet()) res.arr().v((long) e.getValue()).v(e.getKey()).end();
        res.end().end();
        return best;
    }

    static DeckColors newDeckColors() throws Exception {
        final java.lang.reflect.Constructor<DeckColors> c = DeckColors.class.getDeclaredConstructor();   // package-private
        c.setAccessible(true);
        return c.newInstance();
    }

    static final class GameResult {
        String winner;       // "A", "B" or "draw"
        String firstTurn;    // whose turn 1 it was, read back from the event
        String reason;
        String error;
        int turns;
        long ms;
        boolean timeout;
        boolean stuck;
        long cpuMs;          // the worker JVM's CPU time over the game, every thread (D315's overhead measure)
        long gameCpuMs;      // the game thread's own CPU time
        String recorded;     // the recording's folder, relative to the run (D315)
        long recordBytes;
        int recordFrames;
        int recordErrors;
    }

    /**
     * What one recorded game's two logs say about it (D315).  The job's
     * {@code record} block: {@code dir} (absolute: the draft's folder),
     * {@code rel} (that folder relative to the run), {@code run}, {@code cube},
     * {@code cubeFile}, {@code cubeSha}, {@code format} and the two deck names
     * the recordings use ({@code deckNameA}, {@code deckNameB}).
     */
    static final class Recording {
        final File dir;
        final String rel;
        final String gameId;
        final long gameSeed;
        final List<SeatRecorder.Seat> seats = new ArrayList<>();
        final Map<String, Object> lab = new LinkedHashMap<>();

        Recording(final Map<?, ?> rec, final String id, final long seed, final int g, final long gameSeed,
                  final boolean aOnPlay, final Deck[] decks, final File[] deckFiles,
                  final String profA, final String profB) {
            this.dir = new File(str(rec, "dir"));
            this.rel = str(rec, "rel");
            this.gameId = id + "-g" + g;
            this.gameSeed = gameSeed;
            final String[] names = {str(rec, "deckNameA"), str(rec, "deckNameB")};
            final String[] profiles = {profA, profB};
            for (int s = 0; s < 2; s++) {
                seats.add(new SeatRecorder.Seat(names[s], deckFiles[s], relPath(deckFiles[s]), decks[s], profiles[s]));
            }
            lab.put("run", str(rec, "run"));
            lab.put("cube", str(rec, "cube"));
            lab.put("cubeFile", str(rec, "cubeFile"));
            lab.put("cubeSha", str(rec, "cubeSha"));
            lab.put("format", str(rec, "format"));
            lab.put("match", id);
            lab.put("draftSeed", seed);
            lab.put("game", (long) g);
            lab.put("gameSeed", gameSeed);
            lab.put("onPlay", aOnPlay ? "A" : "B");
        }

        File out(final int seat) {
            return new File(dir, "g" + lab.get("game") + "-seat" + seat + ".jsonl.gz");
        }

        static String relPath(final File f) {
            if (f == null) return null;
            final String root = cfg.root().getAbsolutePath() + File.separator;
            final String p = f.getAbsolutePath();
            return p.startsWith(root) ? p.substring(root.length()) : p;
        }
    }

    static synchronized String jarSha() {
        if (jarSha == null) {
            try {
                final java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                try (java.io.InputStream in = Files.newInputStream(cfg.forgeJar().toPath())) {
                    final byte[] buf = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
                }
                final StringBuilder sb = new StringBuilder(64);
                for (final byte b : md.digest()) sb.append(String.format(Locale.ROOT, "%02x", b));
                jarSha = sb.toString();
            } catch (final Exception e) {
                jarSha = "";
            }
        }
        return jarSha.isEmpty() ? null : jarSha;
    }

    static GameResult playGame(final Deck[] decks, final LobbyPlayer lpA, final LobbyPlayer lpB,
                               final boolean aOnPlay, final long gameSeed, final long timeoutMs,
                               final Recording rec) throws Exception {
        final GameRules rules = new GameRules(GameType.Draft);
        rules.setAppliedVariants(EnumSet.of(GameType.Draft));
        rules.setGamesPerMatch(1);
        final RegisteredPlayer pA = new RegisteredPlayer(decks[0]);
        pA.setPlayer(lpA);
        final RegisteredPlayer pB = new RegisteredPlayer(decks[1]);
        pB.setPlayer(lpB);
        MyRandom.setRandom(new Random(gameSeed));
        final Match match = new Match(rules, List.of(pA, pB), "cubelab");
        final Game game = match.createGame();
        final GameResult r = new GameResult();
        game.subscribeToEvents(new FirstPlayer(game, aOnPlay ? lpA : lpB, r));
        // D315: both chairs' recorders, subscribed after FirstPlayer and before the game starts.
        final List<SeatRecorder> recorders = new ArrayList<>();
        if (rec != null) {
            for (int s = 0; s < 2; s++) {
                recorders.add(SeatRecorder.attach(game, s, rec.out(s), rec.gameId, rec.gameSeed, jarSha(),
                        rec.seats, rec.lab));
            }
        }
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        final long t = System.nanoTime();
        final long cpu0 = processCpuNanos();
        final long[] gameCpu = new long[1];
        game.getAction().invoke(() -> {           // Forge's own Game pool, as RecordMatch starts its game
            final long c0 = ManagementFactory.getThreadMXBean().getCurrentThreadCpuTime();
            try {
                match.startGame(game);
                for (final SeatRecorder sr : recorders) sr.finish();   // still the game thread, as RecordMatch
            } catch (final Throwable e) {
                fail[0] = e;
                for (final SeatRecorder sr : recorders) sr.crashed();
            } finally {
                gameCpu[0] = ManagementFactory.getThreadMXBean().getCurrentThreadCpuTime() - c0;
                done.countDown();
            }
        });
        if (!done.await(timeoutMs, TimeUnit.MILLISECONDS)) {
            r.timeout = true;
            game.setGameOver(GameEndReason.Draw);
            if (!done.await(30, TimeUnit.SECONDS)) {
                r.stuck = true;
                return r;
            }
        }
        r.ms = ms(t);
        if (rec != null) {
            for (final SeatRecorder sr : recorders) {
                try {
                    sr.close();
                } catch (final IOException e) {
                    r.recordErrors++;
                    System.err.println("[cubelab] recording " + sr.file() + " failed: " + e);
                }
                r.recordBytes += sr.bytes();
                r.recordFrames += sr.frames();
                r.recordErrors += sr.errors();
            }
            r.recorded = rec.rel;
        }
        r.cpuMs = (processCpuNanos() - cpu0) / 1_000_000L;
        r.gameCpuMs = gameCpu[0] / 1_000_000L;
        if (fail[0] != null) {
            r.error = fail[0].getClass().getName();
            fail[0].printStackTrace();
        }
        final GameOutcome o = game.getOutcome();
        if (o == null || o.isDraw() || r.timeout) {
            r.winner = "draw";
        } else {
            r.winner = o.getWinningLobbyPlayer() == lpA ? "A" : o.getWinningLobbyPlayer() == lpB ? "B" : "draw";
        }
        if (o != null) {
            r.turns = o.getLastTurnNumber();
            r.reason = o.getWinCondition() == null ? null : o.getWinCondition().name();
        }
        if (r.timeout) r.reason = "Timeout";
        return r;
    }

    /**
     * Decides Forge's coin flip and reads turn 1's owner back (class javadoc,
     * "Who plays first").  Both handlers run on the game thread, synchronously
     * inside {@code Game.fireEvent}.
     */
    public static final class FirstPlayer {
        private final Game game;
        private final LobbyPlayer due;
        private final GameResult result;

        FirstPlayer(final Game game, final LobbyPlayer due, final GameResult result) {
            this.game = game;
            this.due = due;
            this.result = result;
        }

        @Subscribe
        public void flip(final GameEventFlipCoin e) {
            final List<Player> players = new ArrayList<>(game.getPlayers());
            for (int i = 0; i < players.size(); i++) {
                if (players.get(i).getLobbyPlayer() == due) {
                    MyRandom.setRandom(new ForcedFirst(MyRandom.getRandom(), i));
                    return;
                }
            }
        }

        @Subscribe
        public void turn(final GameEventTurnBegan e) {
            if (result.firstTurn == null) {
                final String n = e.turnOwner() == null ? null : e.turnOwner().getName();
                result.firstTurn = "Drafter A".equals(n) ? "A" : "Drafter B".equals(n) ? "B" : n;
            }
        }
    }

    /**
     * A {@code Random} whose next bounded {@code nextInt} is the given index, and
     * which puts the seeded generator back into {@code MyRandom} at that moment.
     * Every other draw is the seeded generator's own.
     */
    static final class ForcedFirst extends Random {
        private static final long serialVersionUID = 1L;
        private final transient Random inner;
        private final int index;
        private boolean used;

        ForcedFirst(final Random inner, final int index) {
            this.inner = inner;
            this.index = index;
        }

        @Override public int nextInt(final int bound) {
            if (!used) {
                used = true;
                MyRandom.setRandom(inner);
                return Math.min(index, bound - 1);
            }
            return inner.nextInt(bound);
        }
        @Override public int nextInt() { return inner.nextInt(); }
        @Override public long nextLong() { return inner.nextLong(); }
        @Override public double nextDouble() { return inner.nextDouble(); }
        @Override public float nextFloat() { return inner.nextFloat(); }
        @Override public boolean nextBoolean() { return inner.nextBoolean(); }
        @Override public double nextGaussian() { return inner.nextGaussian(); }
        @Override public void nextBytes(final byte[] b) { inner.nextBytes(b); }
    }

    static long ms(final long t) { return (System.nanoTime() - t) / 1_000_000L; }

    /** The JVM's CPU time, every thread (0 where the platform will not say). */
    static long processCpuNanos() {
        final java.lang.management.OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
        return os instanceof com.sun.management.OperatingSystemMXBean
                ? ((com.sun.management.OperatingSystemMXBean) os).getProcessCpuTime() : 0L;
    }
}
