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
package mtgtable;

import java.io.File;
import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Map;

import org.eclipse.jetty.util.ajax.JSON;

/**
 * Loader for the repo's {@code config.json}.
 *
 * <p>Deliberately tiny.  It exists so that no Java file anywhere in the bridge
 * hardcodes the Forge jar path, the deck path, or a port number.
 *
 * <p>Parsing is delegated to {@code org.eclipse.jetty.util.ajax.JSON}, which is
 * already inside the Forge fat jar.  <b>gson is NOT bundled in 2.0.14</b> (it is
 * a 2.0.15 dependency), so {@code import com.google.gson} would compile against
 * nothing.  Jetty's parser returns a {@code Map<String,Object>} for an object,
 * an {@code Object[]} for an array, a {@code Long} for an integral number and a
 * {@code Double} for a fractional one.
 */
public final class Config {

    /** Absolute path of the config file this instance was read from. */
    private final File file;
    /** Absolute path of the repo root, i.e. the config file's directory. */
    private final File root;
    private final Map<String, Object> values;

    private Config(final File file, final Map<String, Object> values) {
        this.file = file.getAbsoluteFile();
        this.root = this.file.getParentFile();
        this.values = values;
    }

    /**
     * Load the config from, in order of preference: the {@code mtgtable.config}
     * system property (set by {@code bridge/run.sh}), the {@code MTG_TABLE_CONFIG}
     * environment variable, or {@code ./config.json} relative to the working
     * directory.
     */
    public static Config load() {
        String path = System.getProperty("mtgtable.config");
        if (path == null || path.isEmpty()) {
            path = System.getenv("MTG_TABLE_CONFIG");
        }
        if (path == null || path.isEmpty()) {
            path = "config.json";
        }
        return load(new File(path));
    }

    /** Load the config from an explicit file. */
    @SuppressWarnings("unchecked")
    public static Config load(final File f) {
        if (!f.isFile()) {
            throw new IllegalStateException("config.json not found: " + f.getAbsolutePath());
        }
        final Object parsed;
        try (Reader r = Files.newBufferedReader(f.toPath(), StandardCharsets.UTF_8)) {
            parsed = JSON.parse(r);
        } catch (final IOException e) {
            throw new IllegalStateException("cannot read " + f.getAbsolutePath(), e);
        }
        if (!(parsed instanceof Map)) {
            throw new IllegalStateException(f.getAbsolutePath() + " is not a JSON object");
        }
        return new Config(f, (Map<String, Object>) parsed);
    }

    /** The config file itself. */
    public File file() {
        return file;
    }

    /** The repo root: the directory holding config.json. */
    public File root() {
        return root;
    }

    /** A required string value. */
    public String str(final String key) {
        final Object v = values.get(key);
        if (v == null) {
            throw new IllegalStateException("missing key \"" + key + "\" in " + file);
        }
        return String.valueOf(v);
    }

    /** A required integer value.  Jetty's parser hands integral numbers back as Long. */
    public int num(final String key) {
        final Object v = values.get(key);
        if (!(v instanceof Number)) {
            throw new IllegalStateException("key \"" + key + "\" is not a number in " + file);
        }
        return ((Number) v).intValue();
    }

    /**
     * An optional boolean value.
     *
     * <p>M6 uses it for exactly one key, {@code "manaLostPrompt"}, which decides
     * whether {@code FPref.UI_MANA_LOST_PROMPT} is set <b>in memory</b> for
     * every session (protocol amendment M40).  A missing key means
     * {@code dflt}: an older {@code config.json} still parses, and a checkout
     * that wants Forge's stock behaviour writes {@code false} rather than
     * deleting the line.
     */
    public boolean flag(final String key, final boolean dflt) {
        final Object v = values.get(key);
        if (v == null) {
            return dflt;
        }
        if (v instanceof Boolean) {
            return ((Boolean) v).booleanValue();
        }
        return Boolean.parseBoolean(String.valueOf(v));
    }

    /**
     * A required path value, resolved against the repo root when it is relative.
     * That is how {@code "forgeHome": "forge-home"} and
     * {@code "deck": "decks/pacho-shield.dck"} stay portable while the Java side
     * only ever handles absolute paths.
     */
    public File path(final String key) {
        final File f = new File(str(key));
        return (f.isAbsolute() ? f : new File(root, f.getPath())).getAbsoluteFile();
    }

    /**
     * The Forge fat jar.  The {@code FORGE_JAR} environment variable wins over
     * config.json, matching {@code tools/config.sh}, so a one-off run against a
     * different engine build needs no edit.
     */
    public File forgeJar() {
        final String env = System.getenv("FORGE_JAR");
        if (env != null && !env.isEmpty()) {
            return new File(env).getAbsoluteFile();
        }
        return path("forgeJar");
    }

    /**
     * The mtg-table-owned Forge home, guaranteed to end in {@link File#separator}
     * because {@code ForgeConstants} concatenates it with {@code "res/"} and
     * {@code "forge.profile.properties"} without inserting one.
     */
    public String forgeHomeDir() {
        final String p = path("forgeHome").getPath();
        return p.endsWith(File.separator) ? p : p + File.separator;
    }

    /** The deck file, as an absolute path. */
    public File deck() {
        return path("deck");
    }

    /** The loopback WebSocket port. */
    public int wsPort() {
        return num("wsPort");
    }

    /** The Vite dev-server port. */
    public int webPort() {
        return num("webPort");
    }
}
