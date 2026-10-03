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
package mtgtable.audit;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import forge.StaticData;
import forge.card.CardEdition;
import forge.card.CardRules;
import forge.card.CardStateName;
import forge.deck.CardPool;
import forge.deck.Deck;
import forge.deck.DeckSection;
import forge.deck.io.DeckSerializer;
import forge.game.CardTraitBase;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.Match;
import forge.game.ability.AbilityFactory;
import forge.game.ability.ApiType;
import forge.game.card.Card;
import forge.game.card.CardFactory;
import forge.game.card.CardState;
import forge.game.keyword.Keyword;
import forge.game.keyword.KeywordInterface;
import forge.game.player.Player;
import forge.game.player.RegisteredPlayer;
import forge.game.replacement.ReplacementEffect;
import forge.game.replacement.ReplacementHandler;
import forge.game.spellability.SpellAbility;
import forge.game.staticability.StaticAbility;
import forge.game.trigger.Trigger;
import forge.game.trigger.TriggerHandler;
import forge.game.trigger.TriggerType;
import forge.item.PaperCard;
import forge.localinstance.properties.ForgeConstants;
import forge.model.FModel;
import forge.util.BuildInfo;
import mtgtable.Bootstrap;
import mtgtable.Config;
import mtgtable.Json;

/**
 * The Java half of {@code tools/audit-deck.mjs}: boot Forge exactly the way every
 * mtg-table process does ({@link Bootstrap}), then answer, per card of one or more
 * {@code .dck} files, "would this card actually work in this engine?".
 *
 * <p>It is a <b>read-only measuring tool</b>.  It starts no match, opens no socket,
 * emits no protocol, and never touches {@code forge-home/} or {@code var/forge/}:
 * the node driver builds a throwaway Forge home under {@code var/audit-deck/} and
 * points {@code -Dmtgtable.config} at it, so an audit cannot change how the game
 * runs.  It lives outside {@code bridge/src} on purpose -- it is not part of the
 * bridge, and nothing here reaches the wire.
 *
 * <h2>What "works" means, and the four checks</h2>
 *
 * <ol>
 *   <li><b>In the database.</b>  {@code DeckSerializer.fromFile} (hard rule 4 --
 *       never {@code FModel.getDecks()}) turns a name it cannot resolve into a
 *       placeholder whose {@code CardRules.isUnsupported()} is true, and
 *       {@code Match.prepareAllZones} then drops it from the library
 *       <b>silently</b> (see {@code Smoke.auditDeck}).  Reported as
 *       {@code missing}.</li>
 *   <li><b>Instantiable.</b>  A script parses into {@code CardRules} long before
 *       its abilities are built: {@code A:}/{@code T:}/{@code S:}/{@code R:}
 *       lines and every {@code SubAbility$} chain are only parsed when a real
 *       {@code Card} is made.  An unknown {@code DB$ Api} there throws, and a
 *       card that throws in {@code CardFactory.getCard} does not merely fail --
 *       it takes the whole game down at {@code prepareAllZones}.  So each card is
 *       built with {@code CardFactory.getCard} inside a throwaway {@code Game}
 *       that is never started (no game thread exists, so nothing can race the
 *       view graph -- hard rule 3 is about a RUNNING game).  Reported as
 *       {@code broken}.</li>
 *   <li><b>Every SVar that is an ability, trigger, static or replacement
 *       parses.</b>  SVars reached only through {@code Execute$},
 *       {@code Triggers$}, {@code StaticAbilities$} and friends are parsed at
 *       <em>resolution</em>, mid-game, so check (2) cannot see them.  Each is
 *       parsed here, standalone.  Reported as {@code broken}.</li>
 *   <li><b>No keyword the engine does not know.</b>  An unknown {@code K:} line
 *       becomes {@code Keyword.UNDEFINED} and is <em>silently ignored</em> in
 *       play.  Also every {@code TokenScript$} must name a token script the
 *       engine has.  Reported as {@code broken}.</li>
 * </ol>
 *
 * <p>A card that passes all four is {@code ok} -- which means the engine can
 * <em>build</em> it, not that every rules nuance is right.  A parameter the old
 * engine does not read (an unknown {@code Foo$} key on a known effect) is
 * ignored without a word, and no static check here can see that.  The report
 * says so rather than claiming more.
 *
 * <p>Engine chatter is teed (like {@code Smoke}'s watcher) and every line that
 * names an audited card, or matches a short list of complaint phrases, is
 * attached to the report.
 */
public final class AuditDeck {

    private AuditDeck() { }

    /** Complaint phrases worth surfacing from the boot log even when no card name is on the line. */
    private static final String[] NOTABLE = {
        "unsupported card was requested",
        "error loading cardscript",
        "not assigned to any set",
        "wrong token name",
        "upcoming set",
        "could not find this card",
        "not supported yet",
        "ignoring unknown",
        "exception",
    };

    private static final Pattern DECK_LINE =
            Pattern.compile("^\\s*(\\d+)\\s+([^|]+?)\\s*(?:\\|([^|\\s]+))?(?:\\|.*)?\\s*$");

    public static void main(final String[] args) {
        final Tee out = Tee.install(true);
        final Tee err = Tee.install(false);
        int exit;
        try {
            exit = run(args, out, err);
        } catch (final Throwable t) {
            System.out.flush();
            System.err.println("AUDIT FAILED: " + t);
            t.printStackTrace();
            exit = 2;
        }
        System.out.flush();
        System.err.flush();
        // Forge leaves daemon pools behind; do not wait for them.
        System.exit(exit);
    }

    // ------------------------------------------------------------------
    // Arguments
    // ------------------------------------------------------------------

    private static final class Args {
        final List<File> decks = new ArrayList<>();
        final List<String> names = new ArrayList<>();
        boolean allCustom;
        File json;
    }

    private static Args parse(final String[] argv) throws IOException {
        final Args a = new Args();
        for (int i = 0; i < argv.length; i++) {
            final String k = argv[i];
            switch (k) {
            case "--json":
                a.json = new File(argv[++i]).getAbsoluteFile();
                break;
            case "--names":
                for (final String l : Files.readAllLines(new File(argv[++i]).toPath(), StandardCharsets.UTF_8)) {
                    final String n = l.trim();
                    if (!n.isEmpty() && !n.startsWith("#")) {
                        a.names.add(n);
                    }
                }
                break;
            case "--all-custom":
                a.allCustom = true;
                break;
            default:
                if (k.startsWith("--")) {
                    throw new IllegalArgumentException("unknown flag " + k);
                }
                a.decks.add(new File(k).getAbsoluteFile());
            }
        }
        if (a.decks.isEmpty() && a.names.isEmpty() && !a.allCustom) {
            throw new IllegalArgumentException("nothing to audit: give a .dck, --names <file> or --all-custom");
        }
        return a;
    }

    // ------------------------------------------------------------------
    // One audited card
    // ------------------------------------------------------------------

    private static final class Row {
        String source = "";        // the deck file's name, or "" for --names / --all-custom
        final String section;      // main | sideboard | names | custom
        final String requested;    // the name as written
        final String requestedSet; // the |SET suffix, or null
        int qty;
        String resolvedName;
        String resolvedSet;
        boolean inDb;
        boolean unsupported;
        boolean custom;
        String path;
        PaperCard pc;
        String instantiate = "skipped";
        final List<String> states = new ArrayList<>();
        final List<String> problems = new ArrayList<>();
        final List<String> notes = new ArrayList<>();
        final List<String> log = new ArrayList<>();
        int abilities;
        int triggers;
        int statics;
        int replacements;
        int svarsParsed;

        Row(final String section, final String requested, final String requestedSet, final int qty) {
            this.section = section;
            this.requested = requested;
            this.requestedSet = requestedSet;
            this.qty = qty;
        }

        String verdict() {
            if (!inDb || unsupported) {
                return "missing";
            }
            return problems.isEmpty() ? "ok" : "broken";
        }
    }

    // ------------------------------------------------------------------
    // Run
    // ------------------------------------------------------------------

    private static int run(final String[] argv, final Tee out, final Tee err) throws Exception {
        final Args a = parse(argv);
        final Config cfg = Config.load();

        // Hard rule 1: GuiBase first.  Hard rule 11: Bootstrap owns the order.
        Bootstrap.installGui(cfg.forgeHomeDir());
        final long initMs = Bootstrap.initializeModel(false);
        final List<String> bootLines = new ArrayList<>(out.lines());
        bootLines.addAll(err.lines());
        out.clear();
        err.clear();

        final StaticData db = FModel.getMagicDb();

        // The rows, in the order the decks list them.
        final List<Row> rows = new ArrayList<>();
        final List<String> deckNames = new ArrayList<>();
        for (final File f : a.decks) {
            if (!f.isFile()) {
                throw new IllegalStateException("deck not found: " + f);
            }
            final Deck deck = DeckSerializer.fromFile(f);   // hard rule 4
            if (deck == null) {
                throw new IllegalStateException("DeckSerializer.fromFile returned null for " + f);
            }
            deckNames.add(f.getPath() + " = " + deck.getName());
            for (final Row r : deckRows(f, deck)) {
                r.source = f.getName();
                rows.add(r);
            }
        }
        for (final String n : a.names) {
            final Row r = new Row("names", n, null, 1);
            final CardRules cr = db.getCommonCards().getRules(n, false);
            if (cr != null) {
                fill(r, db.getCommonCards().getCard(n), cr);
            }
            rows.add(r);
        }
        if (a.allCustom) {
            final Map<String, PaperCard> custom = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            for (final PaperCard pc : db.getCommonCards().getUniqueCards()) {
                if (pc.getRules() != null && pc.getRules().isCustom()) {
                    custom.put(pc.getName(), pc);
                }
            }
            for (final PaperCard pc : custom.values()) {
                final Row r = new Row("custom", pc.getName(), null, 1);
                fill(r, pc, pc.getRules());
                rows.add(r);
            }
        }

        // Check (2)-(4): build every distinct card once, in a Game nobody starts.
        final Game game = throwawayGame();
        final Player owner = game.getPlayers().get(0);
        final Map<String, Row> built = new LinkedHashMap<>();
        for (final Row r : rows) {
            if (!r.inDb || r.unsupported) {
                continue;
            }
            final Row first = built.get(r.resolvedName + "|" + r.resolvedSet);
            if (first != null) {
                copyBuild(first, r);
                continue;
            }
            instantiate(r, owner, game, db);
            built.put(r.resolvedName + "|" + r.resolvedSet, r);
        }
        final List<String> runLines = new ArrayList<>(out.lines());
        runLines.addAll(err.lines());
        out.stop();
        err.stop();

        // Attach every log line that names a card to that card.
        final List<String> notable = new ArrayList<>();
        final List<String> all = new ArrayList<>(bootLines);
        all.addAll(runLines);
        for (final String line : all) {
            final String low = line.toLowerCase(Locale.ROOT);
            boolean named = false;
            for (final Row r : rows) {
                final String n = (r.resolvedName != null ? r.resolvedName : r.requested).toLowerCase(Locale.ROOT);
                if (n.length() > 2 && low.contains(n)) {
                    if (r.log.size() < 12 && !r.log.contains(line)) {
                        r.log.add(line);
                    }
                    named = true;
                }
            }
            if (!named) {
                for (final String needle : NOTABLE) {
                    if (low.contains(needle)) {
                        if (notable.size() < 200) {
                            notable.add(line);
                        }
                        break;
                    }
                }
            }
        }

        final String json = report(cfg, initMs, deckNames, rows, notable);
        if (a.json != null) {
            a.json.getParentFile().mkdirs();
            Files.write(a.json.toPath(), json.getBytes(StandardCharsets.UTF_8));
        } else {
            System.out.println(json);
        }
        for (final Row r : rows) {
            if (!"ok".equals(r.verdict())) {
                return 1;
            }
        }
        return 0;
    }

    /** One row per distinct (section, name) in the file, matched to what Forge parsed. */
    private static List<Row> deckRows(final File f, final Deck deck) throws IOException {
        final List<Row> rows = new ArrayList<>();
        String section = null;
        for (final String raw : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
            final String line = raw.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            if (line.startsWith("[") && line.endsWith("]")) {
                section = line.substring(1, line.length() - 1).toLowerCase(Locale.ROOT);
                continue;
            }
            if (!"main".equals(section) && !"sideboard".equals(section)) {
                continue;
            }
            final Matcher m = DECK_LINE.matcher(line);
            if (!m.matches()) {
                final Row r = new Row(section, line, null, 0);
                r.problems.add("unparseable deck line");
                rows.add(r);
                continue;
            }
            final Row r = new Row(section, m.group(2).trim(), m.group(3), Integer.parseInt(m.group(1)));
            final CardPool pool = "main".equals(section) ? deck.getMain()
                    : (deck.has(DeckSection.Sideboard) ? deck.get(DeckSection.Sideboard) : null);
            PaperCard hit = null;
            if (pool != null) {
                for (final Map.Entry<PaperCard, Integer> e : pool) {
                    if (e.getKey().getName().equalsIgnoreCase(r.requested)) {
                        hit = e.getKey();
                        break;
                    }
                }
            }
            if (hit == null) {
                r.problems.add("not in the deck Forge parsed (dropped by DeckSerializer)");
            } else {
                fill(r, hit, hit.getRules());
                if (r.requestedSet != null && !r.requestedSet.equalsIgnoreCase(r.resolvedSet)) {
                    r.notes.add("asked for set " + r.requestedSet + ", Forge resolved " + r.resolvedSet);
                }
            }
            rows.add(r);
        }
        return rows;
    }

    private static void fill(final Row r, final PaperCard pc, final CardRules cr) {
        r.inDb = cr != null;
        r.unsupported = cr == null || cr.isUnsupported();
        r.custom = cr != null && cr.isCustom();
        r.path = cr == null ? null : cr.getPath();
        r.resolvedName = pc != null ? pc.getName() : (cr != null ? cr.getName() : null);
        r.resolvedSet = pc != null ? pc.getEdition() : null;
        r.pc = pc;
    }

    private static void copyBuild(final Row from, final Row to) {
        to.instantiate = from.instantiate;
        to.states.addAll(from.states);
        to.problems.addAll(from.problems);
        to.abilities = from.abilities;
        to.triggers = from.triggers;
        to.statics = from.statics;
        to.replacements = from.replacements;
        to.svarsParsed = from.svarsParsed;
    }

    /**
     * Two AI seats with empty decks; {@code createGame()} builds the players and nothing else.
     *
     * <p>Seated through {@link Bootstrap#createAiPlayer}, like every AI in every
     * mtg-table process (D107), never through {@code GamePlayerUtil}'s two-argument
     * overload: that one passes an empty {@code profileOverride}, whose branch calls
     * {@code ForgePreferences.save()} when the preferences name an AI profile that
     * did not load -- and that wrote every in-memory pref {@link Bootstrap} sets
     * (D13, D14) into this audit's throwaway home (docs/evidence/guards.md section 4).
     * {@code tools/lint-bridge.sh} reads this file too since D182.
     */
    private static Game throwawayGame() {
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        final List<RegisteredPlayer> players = new ArrayList<>();
        final RegisteredPlayer p1 = new RegisteredPlayer(new Deck("audit-1"));
        p1.setPlayer(Bootstrap.createAiPlayer("Audit-One", 0, Bootstrap.DEFAULT_AI_PROFILE));
        players.add(p1);
        final RegisteredPlayer p2 = new RegisteredPlayer(new Deck("audit-2"));
        p2.setPlayer(Bootstrap.createAiPlayer("Audit-Two", 1, Bootstrap.DEFAULT_AI_PROFILE));
        players.add(p2);
        return new Match(rules, players, "mtg-table-audit").createGame();
    }

    // ------------------------------------------------------------------
    // Checks (2)-(4)
    // ------------------------------------------------------------------

    private static void instantiate(final Row r, final Player owner, final Game game, final StaticData db) {
        if (r.pc == null) {
            r.instantiate = "no-printing";
            r.problems.add("in the rules database but Forge has no printing (PaperCard) of it");
            return;
        }
        final Card c;
        try {
            c = CardFactory.getCard(r.pc, owner, game);
        } catch (final Throwable t) {
            r.instantiate = "threw";
            r.problems.add("CardFactory.getCard threw: " + oneLine(t));
            return;
        }
        if (c == null) {
            r.instantiate = "null";
            r.problems.add("CardFactory.getCard returned null");
            return;
        }
        r.instantiate = "ok";
        final Set<String> tokenRefs = new LinkedHashSet<>();
        for (final CardStateName sn : c.getStates()) {
            final CardState st = c.getState(sn);
            if (st == null) {
                continue;
            }
            r.states.add(sn.name() + ":" + st.getName());
            for (final KeywordInterface ki : st.getIntrinsicKeywords()) {
                // Keyword.UNDEFINED alone is not a failure: etbCounter,
                // ETBReplacement and friends are matched by string prefix in
                // CardFactoryUtil and still build a replacement or trigger.  An
                // UNDEFINED keyword that built NO trait is the one the engine
                // will carry around and never act on.
                if (ki.getKeyword() == Keyword.UNDEFINED) {
                    final String head = ki.getOriginal().split(":", 2)[0].trim();
                    if (ki.hasTraits()) {
                        r.notes.add("keyword matched by string, built traits: " + ki.getOriginal());
                    } else if (EngineStrings.has(head)) {
                        // AlternateAdditionalCost, deck-construction text and the
                        // like: read by string in cost / deck code, never traits.
                        r.notes.add("keyword matched by string in engine code (no traits): " + ki.getOriginal());
                    } else {
                        r.problems.add("unknown keyword, nothing in the engine reads it (silently ignored in play): "
                                + ki.getOriginal());
                    }
                }
            }
            for (final SpellAbility sa : st.getSpellAbilities()) {
                r.abilities++;
                walk(sa, tokenRefs);
            }
            for (final Trigger t : st.getTriggers()) {
                r.triggers++;
                if (t.getOverridingAbility() != null) {
                    walk(t.getOverridingAbility(), tokenRefs);
                }
            }
            for (final StaticAbility s : st.getStaticAbilities()) {
                r.statics++;
                collectTokens(s, tokenRefs);
            }
            for (final ReplacementEffect re : st.getReplacementEffects()) {
                r.replacements++;
                if (re.getOverridingAbility() != null) {
                    walk(re.getOverridingAbility(), tokenRefs);
                }
            }
            for (final Map.Entry<String, String> sv : st.getSVars().entrySet()) {
                checkSVar(r, c, st, sv.getKey(), sv.getValue(), tokenRefs);
            }
        }
        for (final String t : tokenRefs) {
            if (!db.getAllTokens().containsRule(t)) {
                r.problems.add("TokenScript$ " + t + " has no token script in this engine");
            }
        }
    }

    /**
     * Parse one SVar the way the engine will at resolution time.  The SVar's own
     * state is the SVar holder: an ALTERNATE face (a prepared spell, an adventure,
     * a back face) keeps its SVars on its own {@code CardState}, and parsing it
     * against the front face reports a missing SVar that is not missing.
     */
    private static void checkSVar(final Row r, final Card c, final CardState st, final String name,
                                  final String value, final Set<String> tokenRefs) {
        final String v = value == null ? "" : value.trim();
        try {
            if (v.startsWith("DB$") || v.startsWith("AB$") || v.startsWith("SP$") || v.startsWith("ST$")) {
                final SpellAbility sa = AbilityFactory.getAbility(v, c, st);
                walk(sa, tokenRefs);
                r.svarsParsed++;
            } else if (v.startsWith("Event$")) {
                ReplacementHandler.parseReplacement(v, c, false, st);
                r.svarsParsed++;
            } else if (v.startsWith("Mode$")) {
                final String mode = firstParam(v, "Mode");
                boolean isTrigger;
                try {
                    TriggerType.smartValueOf(mode);
                    isTrigger = true;
                } catch (final RuntimeException notATrigger) {
                    isTrigger = false;
                }
                if (isTrigger) {
                    final Trigger t = TriggerHandler.parseTrigger(v, c, false, st);
                    if (t.getOverridingAbility() != null) {
                        walk(t.getOverridingAbility(), tokenRefs);
                    }
                } else {
                    StaticAbility.create(v, c, st, false);
                }
                r.svarsParsed++;
            }
        } catch (final Throwable t) {
            r.problems.add("SVar " + name + " does not parse: " + oneLine(t));
        }
    }

    private static void walk(final SpellAbility sa, final Set<String> tokenRefs) {
        SpellAbility cur = sa;
        int guard = 0;
        while (cur != null && guard++ < 64) {
            collectTokens(cur, tokenRefs);
            if (cur.getApi() == ApiType.Charm) {
                // Charm choices are SVars; checkSVar parses them separately.
                break;
            }
            cur = cur.getSubAbility();
        }
    }

    private static void collectTokens(final CardTraitBase t, final Set<String> tokenRefs) {
        if (t.hasParam("TokenScript")) {
            for (final String s : t.getParam("TokenScript").split(",")) {
                if (!s.trim().isEmpty()) {
                    tokenRefs.add(s.trim());
                }
            }
        }
    }

    private static String firstParam(final String svar, final String key) {
        for (final String part : svar.split("\\|")) {
            final String p = part.trim();
            if (p.startsWith(key + "$")) {
                return p.substring(key.length() + 1).trim();
            }
        }
        return "";
    }

    private static String oneLine(final Throwable t) {
        Throwable root = t;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        final String s = t.getClass().getSimpleName() + ": " + t.getMessage()
                + (root != t ? " <- " + root.getClass().getSimpleName() + ": " + root.getMessage() : "");
        return s.replace('\n', ' ');
    }

    // ------------------------------------------------------------------
    // Report
    // ------------------------------------------------------------------

    private static String report(final Config cfg, final long initMs, final List<String> decks,
                                 final List<Row> rows, final List<String> notable) {
        final Json.JsonOut j = new Json.JsonOut();
        j.obj();
        j.key("engine").obj()
            .n("jar", cfg.forgeJar().getPath())
            .n("version", BuildInfo.getVersionString())
            .n("developmentBuild", BuildInfo.isDevelopmentVersion())
            .n("forgeHome", cfg.forgeHomeDir())
            .n("customCardsDir", ForgeConstants.USER_CUSTOM_CARDS_DIR)
            .n("customCardFiles", Bootstrap.customCardCount())
            .n("customEditionsDir", ForgeConstants.USER_CUSTOM_EDITIONS_DIR)
            .n("customTokensDir", ForgeConstants.USER_CUSTOM_TOKENS_DIR)
            .n("initMs", initMs);
        j.key("editions").obj();
        final Set<String> seen = new LinkedHashSet<>();
        for (final Row r : rows) {
            for (final String code : new String[] {r.requestedSet, r.resolvedSet}) {
                if (code == null || !seen.add(code.toUpperCase(Locale.ROOT))) {
                    continue;
                }
                final CardEdition e = FModel.getMagicDb().getEditions().get(code);
                if (e == null) {
                    j.nNull(code.toUpperCase(Locale.ROOT));
                    continue;
                }
                j.key(code.toUpperCase(Locale.ROOT)).obj()
                    .n("name", e.getName())
                    .n("type", e.getType() == null ? null : e.getType().name())
                    .n("entries", e.getAllCardsInSet().size())
                    .end();
            }
        }
        j.end();
        j.end();
        j.key("decks").arr();
        for (final String d : decks) {
            j.v(d);
        }
        j.end();
        j.key("cards").arr();
        for (final Row r : rows) {
            j.obj()
                .n("source", r.source)
                .n("section", r.section)
                .n("requested", r.requested)
                .n("requestedSet", r.requestedSet)
                .n("qty", r.qty)
                .n("verdict", r.verdict())
                .n("resolvedName", r.resolvedName)
                .n("resolvedSet", r.resolvedSet)
                .n("inDb", r.inDb)
                .n("unsupported", r.unsupported)
                .n("custom", r.custom)
                .n("path", r.path)
                .n("instantiate", r.instantiate)
                .n("abilities", r.abilities)
                .n("triggers", r.triggers)
                .n("statics", r.statics)
                .n("replacements", r.replacements)
                .n("svarsParsed", r.svarsParsed);
            strings(j, "states", r.states);
            strings(j, "problems", r.problems);
            strings(j, "notes", r.notes);
            strings(j, "log", r.log);
            j.end();
        }
        j.end();
        strings(j, "notableLog", notable);
        j.end();
        return j.done();
    }

    private static void strings(final Json.JsonOut j, final String key, final List<String> l) {
        j.key(key).arr();
        for (final String s : l) {
            j.v(s);
        }
        j.end();
    }

    // ------------------------------------------------------------------
    // The engine's own string constants
    // ------------------------------------------------------------------

    /**
     * Every {@code CONSTANT_Utf8} in the {@code forge/} classes of the running
     * jar, read once and only when a keyword needs it.  Forge matches many
     * keywords by string ({@code keyword.startsWith("etbCounter")},
     * {@code "AlternateAdditionalCost"}, deck-construction text), so
     * {@code Keyword.UNDEFINED} alone proves nothing; a keyword whose head is not a
     * string ANYWHERE in the engine's code, though, is one nothing can read.
     */
    private static final class EngineStrings {
        private static Set<String> strings;

        static synchronized boolean has(final String s) {
            if (strings == null) {
                strings = load();
            }
            return strings.contains(s);
        }

        private static Set<String> load() {
            final Set<String> out = new java.util.HashSet<>();
            final File jar = new File(ForgeConstants.class.getProtectionDomain().getCodeSource().getLocation().getPath());
            try (java.util.zip.ZipFile z = new java.util.zip.ZipFile(jar)) {
                final java.util.Enumeration<? extends java.util.zip.ZipEntry> en = z.entries();
                while (en.hasMoreElements()) {
                    final java.util.zip.ZipEntry e = en.nextElement();
                    if (e.getName().startsWith("forge/") && e.getName().endsWith(".class")) {
                        try (java.io.InputStream in = z.getInputStream(e)) {
                            utf8s(new java.io.DataInputStream(new java.io.BufferedInputStream(in)), out);
                        }
                    }
                }
            } catch (final IOException ex) {
                throw new IllegalStateException("cannot read engine jar " + jar, ex);
            }
            return out;
        }

        /** The constant pool of one class file, JVMS 4.4; only the Utf8 entries are kept. */
        private static void utf8s(final java.io.DataInputStream in, final Set<String> out) throws IOException {
            if (in.readInt() != 0xCAFEBABE) {
                return;
            }
            in.readUnsignedShort();
            in.readUnsignedShort();
            final int n = in.readUnsignedShort();
            for (int k = 1; k < n; k++) {
                final int tag = in.readUnsignedByte();
                switch (tag) {
                case 1: out.add(in.readUTF()); break;
                case 3: case 4: in.skipBytes(4); break;
                case 5: case 6: in.skipBytes(8); k++; break;
                case 7: case 8: case 16: case 19: case 20: in.skipBytes(2); break;
                case 9: case 10: case 11: case 12: case 17: case 18: in.skipBytes(4); break;
                case 15: in.skipBytes(3); break;
                default: return;
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // stdout/stderr tee (the same idea as Smoke's Watcher, without needles)
    // ------------------------------------------------------------------

    private static final class Tee extends OutputStream {
        private final OutputStream out;
        private final ByteArrayOutputStream line = new ByteArrayOutputStream(256);
        private final List<String> lines = new ArrayList<>();
        private boolean stopped;

        private Tee(final OutputStream out) {
            this.out = out;
        }

        static Tee install(final boolean stdout) {
            final PrintStream original = stdout ? System.out : System.err;
            final Tee t = new Tee(original);
            final PrintStream wrapped = new PrintStream(t, true, StandardCharsets.UTF_8);
            if (stdout) {
                System.setOut(wrapped);
            } else {
                System.setErr(wrapped);
            }
            return t;
        }

        synchronized List<String> lines() {
            return new ArrayList<>(lines);
        }

        synchronized void clear() {
            lines.clear();
        }

        synchronized void stop() {
            stopped = true;
        }

        @Override public synchronized void write(final int b) throws IOException {
            out.write(b);
            consume((byte) b);
        }

        @Override public synchronized void write(final byte[] b, final int off, final int len) throws IOException {
            out.write(b, off, len);
            for (int i = off; i < off + len; i++) {
                consume(b[i]);
            }
        }

        @Override public synchronized void flush() throws IOException {
            out.flush();
        }

        private void consume(final byte b) {
            if (stopped) {
                return;
            }
            if (b == '\n') {
                if (line.size() > 0 && lines.size() < 200_000) {
                    lines.add(line.toString(StandardCharsets.UTF_8));
                }
                line.reset();
            } else if (b != '\r' && line.size() < 8192) {
                line.write(b);
            }
        }
    }
}
