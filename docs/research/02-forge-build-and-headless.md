# 02 — Building against Forge, and running a headless AI-vs-human game

**Status of the claims below:** everything marked **VERIFIED** was established by reading the
bytecode of the installed jar, reading Forge source, or by actually compiling and running code on
this machine. Everything marked **GUESS** is inference I could not check.

Source citations are relative to the sparse checkout at
`…/scratchpad/forge-src` (Forge `master`, `versionCode` **2.0.15**, `-SNAPSHOT`).
The installed release is **2.0.14** — these are *not* the same code, and the difference bites
(see §6).

---

## 0. Executive summary — the recipe that works

**We do not need Maven, and we do not need to build Forge from source.** The shipped fat jar is a
complete compile-time and runtime dependency. And we do not need a JDK install either: the
installed JRE still carries the `jdk.compiler` module.

On this machine, **verified end to end**:

```bash
FORGE_JAR=/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar

# compile (no javac binary needed — the JRE ships the compiler module)
java -m jdk.compiler/com.sun.tools.javac.Main -cp "$FORGE_JAR" -d out src/mtgtable/*.java

# run, with no display of any kind
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -cp "out:$FORGE_JAR" mtgtable.HeadlessHumanVsAi <forgeHomeDir> "<deck>.dck"
```

Measured results of that exact run (`DISPLAY` unset, `GraphicsEnvironment.isHeadless() == true`):

| What | Result |
|---|---|
| `FModel.initialize(null, null)` | **2033 ms** |
| Card database | **95 126** printings, from 33 617 card scripts + 836 token scripts |
| AI vs AI, one full game | **3.6 s**, ended turn 9 |
| Human (our own GUI object) vs AI | **full game to turn 12**, `finishGame()` called on our GUI, `isMatchOver == true` |
| Swing windows opened | none |
| `HeadlessException` | none |

The three non-obvious things that make it work are in §4: **do not use `forge.GuiDesktop`**,
**`IGuiBase.isGuiThread()` must not return a constant**, and **`GuiBase.setInterface()` must happen
before anything touches `ForgeConstants`**.

---

## 1. The fat jar as a dependency — VERIFIED

`/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`
— 39 383 858 bytes, **24 668 entries**, 85 138 924 bytes uncompressed.

### 1.1 It contains everything

Class counts per package (from `unzip -l`):

| Package | Classes | Notes |
|---|---|---|
| `forge/game/**` | 899 | the rules engine |
| `forge/screens/**` | 397 | **Swing** — the desktop UI, we ignore all of it |
| `forge/gamemodes/**` | 364 | includes `net/` (94) — the netty client/server |
| `forge/ai/**` | 264 | AI opponent, incl. `ai/simulation/` |
| `forge/itemmanager/**` | 227 | Swing |
| `forge/gui/**` | 189 | `GuiBase`, `interfaces/IGuiBase`, `interfaces/IGuiGame` |
| `forge/toolbox/**` | 188 | Swing |
| `forge/util/**` | 126 | |
| `forge/deck/**` | 89 | `Deck`, `io/DeckSerializer`, `io/DeckStorage` |
| `forge/localinstance/**` | 65 | `properties/ForgeConstants`, `ForgeProfileProperties` |
| `forge/player/**` | 23 | `PlayerControllerHuman`, `GamePlayerUtil`, `LobbyPlayerHuman` |
| `forge/model/**` | 15 | `FModel` |

Every class the task asked about is present and was individually confirmed:
`forge.game.Game`, `forge.game.Match`, `forge.game.GameRules`, `forge.ai.PlayerControllerAi`,
`forge.ai.LobbyPlayerAi`, `forge.player.PlayerControllerHuman`, `forge.player.LobbyPlayerHuman`,
`forge.gui.GuiBase`, `forge.gui.interfaces.IGuiGame`, `forge.model.FModel`,
`forge.localinstance.properties.ForgeConstants`,
`forge.localinstance.properties.ForgeProfileProperties`, `forge.StaticData`,
`forge.CardStorageReader`, `forge.GuiDesktop`, `forge.gamemodes.net.server.FServerManager`,
`forge.deck.Deck`, `forge.deck.io.DeckSerializer`.

Note `forge/match/**` does **not** exist — match hosting lives at `forge/gamemodes/match/`
(`HostedMatch`, `AbstractGuiGame`).

### 1.2 Bytecode level

`forge/game/Game.class` has class-file major version **61 = Java 17**. `MANIFEST.MF` says
`Build-Jdk-Spec: 17`, `Implementation-Version: 2.0.14-SNAPSHOT-08.08`, `Main-Class: forge.view.Main`.
So our code can target 17 or 21; we run it on the installed Java 21.

The manifest also carries a long `Add-Opens:` list (java.desktop/java.awt, java.base/java.util,
java.base/java.lang.reflect, java.base/jdk.internal.misc, java.base/sun.nio.ch, …). **That manifest
attribute only applies when the jar is launched with `java -jar`.** When we put it on `-cp` and run
our own main class, those opens are *not* applied. None of my headless runs needed them, but if a
future code path hits an `InaccessibleObjectException`, that list is where the fix comes from
(re-add the specific `--add-opens` on the command line).

### 1.3 Bundled third-party libraries — VERIFIED from `META-INF/maven/*/pom.properties`

79 bundled artifacts. The ones that matter:

| Library | Version |
|---|---|
| `io.netty:netty-all` (and every netty sub-module) | **4.1.115.Final** |
| `com.google.guava:guava` | **33.3.1-android** |
| `org.apache.commons:commons-lang3` | 3.18.0 |
| `org.apache.commons:commons-text` | 1.12.0 |
| `org.apache.commons:commons-math3` | 3.6.1 |
| `com.thoughtworks.xstream:xstream` (+ `io.github.x-stream:mxparser`) | 1.4.21 |
| `org.eclipse.jetty:jetty-server / -servlet / -client / -http / -io / -security / -util` | **9.4.57.v20241219** |
| `javax.servlet:javax.servlet-api` | 3.1.0 |
| `org.jgrapht:jgrapht-core` | 1.5.2 |
| `org.jupnp:org.jupnp` + `org.jupnp.support` | 3.0.3 |
| `org.slf4j:slf4j-api` | 2.0.16 |
| `net.bytebuddy:byte-buddy` | 1.15.5 |
| `com.miglayout:miglayout-core / -swing` | 4.2 (Swing only) |
| `org.apfloat:apfloat` | 1.10.1 |
| `at.yawk.lz4:lz4-java` | 1.10.2 |
| `com.beust:jcommander` | 1.82 |
| sound/image: jlayer, mp3spi, tritonus-share, mp3-wav, twelvemonkeys imageio-jpeg 3.12.0, java-image-scaling | Swing/desktop only |

Also present but without `pom.properties` (confirmed by class lookup): **tinylog 2.7.0**
(`org.tinylog.Logger` — this is the logging backend, plus a bundled `tinylog.properties`),
**io.sentry** (`io.sentry.Sentry` — see §6.1), **rssreader**, **freemarker 2.3.33**.

Absent: **gson** (`com.google.gson.Gson` is *not* in the 2.0.14 jar even though the 2.0.15 source's
`forge-gui/pom.xml` declares `com.google.code.gson:gson:2.13.2` — version drift). Also absent:
testng, mockito (test scope, correctly excluded).

**Practical consequence:** jetty 9.4 and netty 4.1 are already on the classpath. If mtg-table's Java
side wants to serve WebSockets to the TypeScript front-end, it can use the bundled netty or jetty
rather than adding a server library and risking a version clash. Conversely, if we add our own
HTTP/JSON library, pin it against guava 33.3.1-**android** (the android flavour, which differs from
the jre flavour) and netty 4.1.115.

### 1.4 As a Maven/Gradle dependency

If we ever do use a build tool, this is a `system`-scoped dependency:

```xml
<dependency>
  <groupId>forge</groupId>
  <artifactId>forge-gui-desktop</artifactId>
  <version>2.0.14</version>
  <scope>system</scope>
  <systemPath>/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar</systemPath>
</dependency>
```

`system` scope is deprecated and is *not* transitively packaged, which is fine here because the jar
is already fat. **My recommendation is to skip Maven entirely** and drive `javac` from a script or
from npm scripts — see §2.5.

---

## 2. Building Forge from source

### 2.1 Java level and module graph — VERIFIED

Root `pom.xml`:
- `<maven.compiler.release>17</maven.compiler.release>` (line 25 area), `maven-compiler-plugin`
  pinned to `source/target/release = 17`.
- `maven-enforcer-plugin` requires **Maven `[3.8.1,)`** and **Java 17+**, plus
  `<requirePluginVersions/>` (every plugin must be version-pinned).
- `versionCode` = `2.0.15`, `snapshotName` = `-SNAPSHOT`, `revision = ${versionCode}${snapshotName}`
  (CI-friendly `${revision}` + `flatten-maven-plugin` 1.6.0).
- Modules: `forge-core, forge-game, forge-ai, forge-gui, forge-gui-mobile, forge-gui-mobile-dev,
  forge-gui-desktop, forge-lda, adventure-editor, forge-gui-android, forge-installer`.
  `forge-gui-ios` is deliberately gated behind a `-Pios` profile (comment in the pom explains it
  depends on locally-built artifacts that are not on Maven Central).
- A `maven-checkstyle-plugin` 3.1.2 execution runs at **validate** with
  `failOnViolation=true` — a source build will fail on style violations, including in test sources.
- `maven-surefire-plugin` 3.1.2 runs tests with a fixed `--add-opens` argLine
  (java.base/java.lang, java.time, java.text, java.util, java.util.regex, java.util.stream,
  java.lang.reflect, and java.desktop/javax.imageio.spi).

Dependency graph (from each module pom):

```
forge-core   -> guava 33.3.1-android, commons-lang3, commons-text, rssreader 3.8.2,
                slf4j-tinylog 2.7.0, tinylog-impl 2.7.0
forge-game   -> forge-core, jgrapht-core 1.5.2, io.sentry 8.21.1, (testng, test)
forge-ai     -> forge-core, forge-game, commons-math3
forge-gui    -> forge-core, forge-game, forge-ai, xstream 1.4.21, xmlpull,
                netty-all 4.1.115.Final, jupnp 3.0.5, lz4-java, jetty client/server/servlet,
                gson 2.13.2
forge-gui-desktop -> forge-core, forge-game, forge-ai, forge-gui,
                miglayout-swing 4.2, java-image-scaling, byte-buddy, freemarker,
                jlayer, jcommander, mp3-wav, imageio-jpeg, (testng + mockito, test)
forge-lda       -> forge-core, forge-game, forge-ai, forge-gui, forge-gui-desktop
forge-installer -> forge-gui-desktop, forge-gui-mobile-dev, izpack-panel 5.2.3
```

**The engine we care about is `forge-core → forge-game → forge-ai → forge-gui`.**
`forge-gui` is the highest module with no Swing and no libgdx — it contains `FModel`,
`ForgeConstants`, `IGuiBase`, `IGuiGame`, `AbstractGuiGame`, `HostedMatch`, and the whole
`forge.gamemodes.net` netty protocol. **That is the layer mtg-table should sit on.**
`forge-gui-desktop` is Swing and we only use it because it is the jar that happens to be installed.

### 2.2 Is anything published to a Maven repository? — VERIFIED (with one caveat)

- `distributionManagement` in the root pom points both `repository` and `snapshotRepository` at
  **`file:///${project.build.directory}/tmp`** — a throwaway local directory.
- **No `<repositories>` element exists in any pom** in the tree.
- No mention of **JitPack** anywhere in the repo.
- `.github/workflows/maven-publish.yml` has steps *named* "Build/Install/Publish Desktop to GitHub
  Packages Apache Maven", but what those steps actually run is
  `mvn … install … release:clean release:prepare release:perform`, and the artifacts that reach the
  outside world are uploaded by `ncipollo/release-action@v1` to **GitHub Releases** as an izpack
  installer + bz2 + jar. The `distributionManagement` those steps deploy to is the local `file://`
  URL above.
- `.mvn/maven.config` forces `--settings ./.mvn/local-settings.xml`, and that settings file only
  declares credentials (`${cardforge-repo.username}` / `.password`) for the `cardforge-repo` server.

**Conclusion: there is no public Maven coordinate for Forge.** You cannot write
`implementation 'forge:forge-game:2.0.14'` and have it resolve.
**GUESS (unverified):** I did not query `https://maven.pkg.github.com/Card-Forge/forge` over the
network, so I cannot rule out that some artifacts sit there from an old configuration — but nothing
in the repo would let a consumer resolve them, and no `<repositories>` entry points at it.

### 2.3 Maven wrapper — VERIFIED: there is none

No `mvnw`, no `mvnw.cmd`, no `.mvn/wrapper/`. `.mvn/` contains only `maven.config` and
`local-settings.xml`.

### 2.4 Installing Maven without sudo

Forge's own release workflow does exactly this, so copy it
(`.github/workflows/maven-publish.yml`, "Install old maven (3.8.1)"):

```bash
cd /home/justin-a/code/mtg-table/tools
curl -fLO https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.tar.gz
tar xf apache-maven-3.9.9-bin.tar.gz
export MAVEN_HOME=$PWD/apache-maven-3.9.9
export PATH=$MAVEN_HOME/bin:$PATH
mvn --version
```

The CI's literal command uses 3.8.1 from `archive.apache.org`; 3.9.x satisfies the `[3.8.1,)`
enforcer rule. **GUESS:** the 3.9.9 URL follows the same `archive.apache.org/dist/maven/maven-3/<v>/binaries/`
pattern the CI verifies for 3.8.1; I could not fetch it here to confirm the exact version exists.

**Maven also needs a JDK, which is not installed** — see §2.5.

Offline-friendly build of the desktop jar only, once Maven and a JDK exist:

```bash
# first run must be online: it populates ~/.m2/repository
mvn -B -U clean install -DskipTests -Dcheckstyle.skip=true -pl forge-gui-desktop -am
# every subsequent run can be fully offline
mvn -o -B clean install -DskipTests -Dcheckstyle.skip=true -pl forge-gui-desktop -am
```

`-pl forge-gui-desktop -am` builds only `forge-core, forge-game, forge-ai, forge-gui,
forge-gui-desktop` and skips the mobile/android/installer modules. The fat jar lands at
`forge-gui-desktop/target/forge-gui-desktop-2.0.15-SNAPSHOT-jar-with-dependencies.jar`
(assembly descriptor `forge-gui-desktop/src/main/assembly/jar-with-dependencies.xml`, which unpacks
every runtime dependency and merges `META-INF/services`).

If you only want the engine and not the Swing shell, `-pl forge-gui -am` is enough and drops
miglayout/freemarker/jlayer/imageio entirely.

**Caveat for our sparse checkout:** `forge-gui/res` is excluded from the checkout at
`…/scratchpad/forge-src` (there is no `forge-gui/res` directory). `ForgeConstants.RES_DIR` and the
release packaging both need it. A from-source build needs a full clone. We do not need one, because
`/home/justin-a/forge/res` already holds the released resources.

**Build time — GUESS.** `.github/workflows/test-build.yaml` runs `mvn -U -B clean test` on a
GitHub `ubuntu-latest` runner (2 vCPU) for Java 17 and 21, under Xvfb; `maven-publish.yml` uses
`-T 1C` and `_JAVA_OPTIONS=-Xmx2g`. Neither workflow records a duration and I could not query the
Actions API. On a 16-core machine like this one I would expect a cold `-pl forge-gui-desktop -am`
(dependency download included) in the 5–15 minute range, and a warm one in 2–5 minutes. Treat those
numbers as unverified.

### 2.5 There is no JDK on this machine — VERIFIED, and it does not matter

```
$ dpkg -l | grep -iE 'jdk|jre'
ii  default-jre / default-jre-headless / openjdk-21-jre / openjdk-21-jre-headless
$ apt-cache policy openjdk-21-jdk   ->  Installed: (none)
$ ls /usr/lib/jvm/java-21-openjdk-amd64/bin
java  jpackage  keytool  rmiregistry
```

**There is no `javac`, no `jar`, no `javap` binary.** The environment brief's "OpenJDK 21" is a JRE.

But the Debian JRE package still ships the compiler *modules*, which I verified by using them:

```bash
java --list-modules | grep -E 'compiler|jartool|jshell|jdeps'
#  java.compiler@21.0.12
#  jdk.compiler@21.0.12
#  jdk.jartool@21.0.12
#  jdk.jdeps@21.0.12
#  jdk.jshell@21.0.12
```

so all four tools are reachable as module entry points:

| Tool | Command |
|---|---|
| javac | `java -m jdk.compiler/com.sun.tools.javac.Main` |
| jar | `java -m jdk.jartool/sun.tools.jar.Main` |
| javap | `java -m jdk.jdeps/com.sun.tools.javap.Main` |
| jshell | `java -m jdk.jshell/jdk.internal.jshell.tool.JShellToolProvider` |

**One gotcha, VERIFIED:** `--release <n>` does **not** work in this image — even `--release 21`
fails with `error: release version 21 not supported`, because the JRE image has no `ct.sym`. Plain
compilation works and emits **Java 21 bytecode (major 65)**. `-source 17 -target 17` also works and
emits major 61, with a `system modules path not set` warning.

That is fine for us (we run on 21). Two options going forward:

- **Cheapest, zero-install:** keep using `java -m jdk.compiler/…`. Verified working against the fat
  jar with zero errors and zero warnings.
- **Nicer, still no sudo:** drop a Temurin 21 JDK tarball into `tools/` and put its `bin` on `PATH`.
  That restores `--release 17`, `javap`, and makes Maven usable.

---

## 3. Engine initialisation — what must happen before a `Game` can run

### 3.1 The ordering constraint (this is the one that bites)

`forge-gui/src/main/java/forge/localinstance/properties/ForgeConstants.java:37`

```java
public static final String ASSETS_DIR = GuiBase.getInterface().getAssetsDir();
```

and `ForgeConstants.java:232-240`

```java
static {
    ForgeProfileProperties.load(GuiBase.isUsingAppDirectory());
    USER_DIR             = ForgeProfileProperties.getUserDir();
    CACHE_DIR            = ForgeProfileProperties.getCacheDir();
    CACHE_CARD_PICS_DIR  = ForgeProfileProperties.getCardPicsDir();
    DECK_BASE_DIR        = ForgeProfileProperties.getDecksDir();
    DECK_CONSTRUCTED_DIR = ForgeProfileProperties.getDecksConstructedDir();
}
```

`ForgeConstants` is a `static final` constant holder whose class initializer calls
`GuiBase.getInterface()`. **`GuiBase.setInterface(...)` must therefore be the very first Forge call
we make.** Touch any `ForgeConstants` field first and you get an `ExceptionInInitializerError`
caused by `NullPointerException`.

`GuiBase` itself (`forge-gui/src/main/java/forge/gui/GuiBase.java:18-19`) is a plain static holder —
`getInterface()` / `setInterface(IGuiBase)` — no AWT.

### 3.2 Where Forge looks for `res/` and for user data — VERIFIED by printing the values

Everything derives from `ASSETS_DIR`, i.e. from **our** `IGuiBase.getAssetsDir()`:

| Constant | Value |
|---|---|
| `ASSETS_DIR` | whatever `getAssetsDir()` returns (must end in a separator) |
| `PROFILE_FILE` | `ASSETS_DIR + "forge.profile.properties"` |
| `PROFILE_TEMPLATE_FILE` | `PROFILE_FILE + ".example"` |
| `RES_DIR` | `ASSETS_DIR + "res/"` |
| `CARD_DATA_DIR` | `RES_DIR + "cardsfolder/"` |
| `TOKEN_DATA_DIR` | `RES_DIR + "tokenscripts/"` |
| `EDITIONS_DIR` | `RES_DIR + "editions/"` |
| `BLOCK_DATA_DIR` | `RES_DIR + "blockdata/"` |
| `SETLOOKUP_DIR` | `RES_DIR + "setlookup/"` |
| `FORMATS_DATA_DIR` | `RES_DIR + "formats/"` |
| `AI_PROFILE_DIR` | `RES_DIR + "ai/"` |
| `LANG_DIR` | `RES_DIR + "languages/"` |

`forge.GuiDesktop.getAssetsDir()` (`forge-gui-desktop/…/GuiDesktop.java:89-93`) returns `""` for a
release build (and `"../forge-gui/"` when the version string contains `git`), which is why
`forge.sh` does `cd $(dirname "$0")` first — for the stock desktop app, `ASSETS_DIR` is the
**current working directory**. Our own `IGuiBase` should return an absolute path instead and not
care about the cwd.

`ForgeProfileProperties.load()`
(`forge-gui/src/main/java/forge/localinstance/properties/ForgeProfileProperties.java:59-81`) then
reads `PROFILE_FILE` if it is readable, and falls back to platform defaults
(lines 158-204): on Linux `userDir = $HOME/.forge`, `cacheDir = $HOME/.cache/forge`. Recognised keys
(the file `/home/justin-a/forge/forge.profile.properties.example` documents all of them):

```
userDir=              # default $HOME/.forge
cacheDir=             # default $HOME/.cache/forge
cardPicsDir=          # default <cacheDir>/pics/cards/
cardPicsSubDirs=      # e.g. LEA->Alpha|ROE->Rise of Eldrazi
decksDir=             # default <userDir>/decks/
decksConstructedDir=  # default <decksDir>/constructed/
```

Relative paths are resolved against the *process* cwd (`getDir()` does `new File(retDir).getAbsolutePath()`),
and every returned path is forced to end in a separator. `load()` also calls
`FileUtil.ensureDirectoryExists` on userDir, cacheDir and cardPicsDir — **it creates directories as a
side effect.**

Two ways to steer this for mtg-table, both verified working:

1. **Write a `forge.profile.properties` next to `res/`** (what I did for the test runs):
   `assetsDir/forge.profile.properties` containing `userDir=…` and `cacheDir=…`.
2. **Return a different `getAssetsDir()`** and keep a whole mtg-table-owned Forge home, with
   `res` symlinked to `/home/justin-a/forge/res`. Also verified — the symlink works fine.

### 3.3 What `FModel.initialize` actually does — `forge-gui/src/main/java/forge/model/FModel.java:161-284`

Signature (VERIFIED against the 2.0.14 bytecode):

```java
public static void initialize(IProgressBar progressBar, Function<ForgePreferences, Void> adjustPrefs)
```

Both arguments may be `null`. In order it:

1. `ImageKeys.initializeDirs(...)` with the eight cache picture dirs (line 162).
2. Applies `adjustPrefs`, then `GamePlayerUtil.getGuiPlayer().setName(prefs.PLAYER_NAME)` (171-179).
3. `ExceptionHandler.pruneForgeLogs(MAX_LOG_FILES)` (182).
4. `Lang.createInstance` + `Localizer.getInstance().initialize(lang, ForgeConstants.LANG_DIR)` (184-185).
5. `loadDynamicGamedata()` — card types etc. (208).
6. Builds the `CardStorageReader`s for `CARD_DATA_DIR` and `TOKEN_DATA_DIR` (214-217), plus optional
   user custom card/token readers. **`CardStorageReader` reads `res/cardsfolder.zip` directly** —
   the installed tree has only `res/cardsfolder/cardsfolder.zip` (16.4 MB) and no unpacked folder,
   and it loaded 33 617 scripts from it. Laziness is controlled by the `LOAD_CARD_SCRIPTS_LAZILY`
   preference (213).
7. `CardTranslation.preloadTranslation` (232).
8. **Creates every directory in `ForgeConstants.PROFILE_DIRS`** (235-244) — 24 directories under
   userDir/cacheDir — and throws `RuntimeException("cannot create profile directory: …")` if any
   `mkdirs()` fails. So the user dir must be writable.
9. Sets format predicates (standard/pioneer/modern/commander/oathbreaker/brawl), filtered hands, and
   the mulligan rule (248-260).
10. `CardPreferences.load(); DeckPreferences.load(); ItemManagerConfig.load();` (268-270).
11. `AiProfileUtil.loadAllProfiles(ForgeConstants.AI_PROFILE_DIR)` (273-274).
12. Optionally builds the deck-generation LDA matrices if `DECKGEN_CARDBASED` and not lazy (277-283).

`StaticData` is built lazily by a memoized supplier (83-91) and reached via `FModel.getMagicDb()`;
you do not construct it yourself for a normal run. If you ever want the card database **without**
preferences/profile dirs at all, `forge-gui/tools/java/ForgeMatrixWriter.java:61-75` shows the
minimal path: `new StaticData(cardReader, tokenReader, null, null, editionsDir, customEditionsDir,
blockDataDir, setLookupDir, "", true, false, false, false, null)`.

### 3.4 Does any of it need a display? — VERIFIED: no, *provided* you avoid `GuiDesktop`

`grep -rn headless` over the source finds exactly three places:

- `forge-gui/tools/java/ForgeMatrixWriter.java:54,150-201` — a complete `HeadlessGui implements IGuiBase`.
  **This is the template to copy.**
- `forge-gui-desktop/src/test/java/forge/HeadlessStartupTest.java` — a test suite that forks JVMs
  with `-Djava.awt.headless=true` and asserts `GuiDesktop` loads, dialogs degrade instead of
  throwing, and `Main` starts. Its own comments say this is a regression guard for a crash where
  "the `GraphicsEnvironment` call sat in a static initializer, so merely loading the class threw
  `HeadlessException`".
- `forge-gui/src/main/java/forge/gamemodes/match/HostedMatch.java:397` — a comment about
  "headless AI sims (DeckBattler, SimulateMatch …)".

**That test and that fix are in the 2.0.15 source and are NOT in the installed 2.0.14 jar** — see §6.1.

Headless harnesses that exist in the engine itself:
- `forge-gui-desktop/src/main/java/forge/view/SimulateMatch.java` — the `sim` console mode (§3.5).
- `forge-ai/src/main/java/forge/ai/simulation/GameSimulator.java` + `SimulationController.java` —
  the AI's internal look-ahead, not a harness for us.
- `forge-gui-desktop/src/test/java/forge/gamesimulationtests/` and `forge/ai/simulation/` — TestNG
  suites; CI still runs them under Xvfb because they live in the Swing module.

`forge.view.Main` (`forge-gui-desktop/.../Main.java:102-118`) knows three console modes —
`sim`, `parse`, `server` — and **`server` prints `"Dedicated server mode.\nNot implemented."`**.
So there is no ready-made headless lobby host; `FServerManager` is driven by the GUI lobby.

### 3.5 `SimulateMatch` — the canonical AI-vs-AI recipe

`forge-gui-desktop/src/main/java/forge/view/SimulateMatch.java`:

```java
FModel.initialize(null, null);                                   // :40
GameRules rules = new GameRules(type);                           // :97
rules.setAppliedVariants(EnumSet.of(type));                      // :98
RegisteredPlayer rp = new RegisteredPlayer(deck);                // :151
rp.setPlayer(GamePlayerUtil.createAiPlayer(name, i-1, profile)); // :153
Match mc = new Match(rules, pp, "Test");                         // :170
final Game g1 = mc.createGame();                                 // :209
g1.setNoGUIUser();                                               // :210  <-- 2.0.15 only
TimeLimitedCodeBlock.runWithTimeout(() -> mc.startGame(g1),
        mc.getRules().getSimTimeout(), TimeUnit.SECONDS);        // :213
```

and deck loading (`:378-402`): a name ending in `.` + 3 chars is treated as a **file** under
`ForgeConstants.DECK_CONSTRUCTED_DIR` and read with `DeckSerializer.fromFile(f)`; anything else is
looked up by name in `FModel.getDecks().getConstructed()`.

CLI (from `argumentHelp()`, `:188-203`):
`sim -d <deck…> -D <dir> -n <games> -m <matchSize> -t <Bracket|RoundRobin|Swiss> -p <players>
-f <format> -s <seed> -a <aiProfile…> -c <secondsBeforeDraw> -q`.

### 3.6 The server / net path — worth knowing even though we won't use it directly

`forge.gamemodes.net` is a complete remote-play protocol, and it is **entirely inside `forge-gui`,
with no Swing**. The shape is:

- `ProtocolMethod` (`forge-gui/src/main/java/forge/gamemodes/net/ProtocolMethod.java:33-…`) is an
  enum of every call that crosses the wire, tagged `Mode.SERVER` (engine→client: `setGameView`,
  `openView`, `showCombat`, `showPromptMessage`, `updateButtons`, `getAbilityToPlay`,
  `assignCombatDamage`, `showOptionDialog`, `order`, `sideboard`, `chooseSingleEntityForEffect`,
  `applyDelta`, `applyYieldUpdate`, …) or `Mode.CLIENT` (client→engine: `useMana`, `selectPlayer`,
  `selectCard`, `undoLastAction`, …).
- `RemoteClientGuiGame extends NetworkGuiGame extends AbstractGuiGame implements IGuiGame`
  turns each `IGuiGame` call into a `ProtocolMethod` send over netty + Java serialisation.
- `FServerManager.startServer(int port)` hosts it; `server.preferences.example` gives the keys
  `NET_PORT=36743` and `UPnP=ASK|ALWAYS|NEVER`.

**This is almost certainly the seam endstep.cc uses**: the browser is a `IGuiGame` implementation on
the far end of a socket, and `ProtocolMethod` is exactly "what the engine says / what the player
clicked". For mtg-table I would **not** reuse Forge's Java-serialisation wire format (it is
`CObjectInputStream`/`WireClassFilter`-guarded Java serialization of `CardView`/`GameView` graphs,
which a TypeScript client cannot read). Instead implement `IGuiGame` ourselves and emit JSON — but
`ProtocolMethod` is the best available specification of the minimal message set, and
`DeltaPacket`/`TrackableSerializer` show how Forge does incremental state sync.

---

## 4. The concrete recipe

All of the following was compiled with `java -m jdk.compiler/com.sun.tools.javac.Main` and **run**.

### 4.1 Rule 1 — never construct `forge.GuiDesktop`

VERIFIED failure, with `DISPLAY` unset:

```
Exception in thread "main" java.lang.ExceptionInInitializerError
        at forge.view.Main.main(Main.java:57)
Caused by: java.awt.HeadlessException
        at java.desktop/sun.java2d.HeadlessGraphicsEnvironment.getDefaultScreenDevice(...)
        at forge.GuiDesktop.initializeScreenScale(GuiDesktop.java:353)
        at forge.GuiDesktop.<clinit>(GuiDesktop.java:359)
```

We implement `IGuiBase` ourselves, so this never happens.

### 4.2 Rule 2 — `isGuiThread()` must be real

`IGuiBase.isGuiThread()` cannot just `return true`. `FThreads.assertExecutedByEdt(boolean)`
(`forge-gui/src/main/java/forge/gui/FThreads.java:15-24`) throws
`IllegalStateException` when `isGuiThread() != mustBeEDT`, and every blocking human input starts with
`FThreads.assertExecutedByEdt(false)`
(`forge-gui/src/main/java/forge/gamemodes/match/input/InputSyncronizedBase.java:22`).

VERIFIED failure when `isGuiThread()` returned a constant `true`:

```
java.lang.IllegalStateException: forge.gamemodes.match.input.InputSyncronizedBase.awaitLatchRelease
  may not be accessed from the event dispatch thread.
    at forge.gui.FThreads.assertExecutedByEdt(FThreads.java:22)
    at forge.gamemodes.match.input.InputSyncronizedBase.showAndWait(InputSyncronizedBase.java:39)
    at forge.player.PlayerControllerHuman.mulliganKeepHand(PlayerControllerHuman.java:1496)
    at forge.game.mulligan.MulliganService.runPlayerMulligans(MulliganService.java:80)
    at forge.game.GameAction.startGame(GameAction.java:2351)
    at forge.game.Match.startGame(Match.java:92)
    at forge.gamemodes.match.HostedMatch.lambda$startGame$2(HostedMatch.java:297)
```

The fix, verified: run one dedicated single-thread executor as a stand-in EDT, dispatch
`invokeInEdtLater`/`invokeInEdtAndWait` onto it, and make `isGuiThread()` test whether the current
thread *is* that thread.

(There is an escape hatch at `FThreads.java:16` — `if (GuiBase.isNetPlay(null)) return;` skips the
assertion entirely, so returning `true` from `IGuiBase.hasNetGame()` also silences it. Do the
threading properly instead; the assertion is protecting a real deadlock.)

### 4.3 Rule 3 — deck files get renamed and moved out from under you

**VERIFIED, and this is a genuine hazard for the user's deck.**
`forge-core/src/main/java/forge/deck/io/DeckStorage.java:94-103`:

```java
private static void adjustFileLocation(final File file, final Deck result) {
    if (result == null) {
        file.delete();
    } else {
        String destFilename = result.getBestFileName() + FILE_EXTENSION;
        if (!file.getName().equals(destFilename)) {
            file.renameTo(new File(file.getParentFile().getParentFile(), destFilename));
        }
    }
}
```

and `forge-gui/src/main/java/forge/model/CardCollections.java:55-62` constructs the constructed-deck
storage with `moveWronglyNamedDecks = true`.

So the first time anything calls `FModel.getDecks().getConstructed()`, a deck file whose name does
not match its `Name=` metadata is **renamed to the metadata name and moved up one directory** (note
`getParentFile().getParentFile()`). I reproduced this: a copy of the user's deck at
`<user>/decks/constructed/Pacho SHIELD.dck` became `<user>/decks/Pacho SHIELD (Marvel Super Heroes).dck`
on every run, after which loading it by filename failed. An unparseable `.dck` is **deleted**.

The user's real file `/home/justin-a/.forge/decks/constructed/Pacho SHIELD.dck` is untouched (I never
pointed a run at `~/.forge`), but it *would* be hit, because its filename is `Pacho SHIELD.dck` while
its `Name=` is `Pacho SHIELD (Marvel Super Heroes)`.

Mitigations for mtg-table:
- Prefer `DeckSerializer.fromFile(new File(path))` — it does **not** rename anything. Verified.
- Give mtg-table its own `userDir` and copy decks in, rather than pointing at `~/.forge`.
- If we do want the by-name store, accept that it normalises filenames, and re-scan afterwards.

### 4.4 Source sketch — headless AI vs AI (compiled and run; full game in 3.6 s)

```java
package mtgtable;

import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.*;
import forge.game.player.RegisteredPlayer;
import forge.gui.GuiBase;
import forge.localinstance.properties.ForgeConstants;
import forge.model.FModel;
import forge.player.GamePlayerUtil;

import java.io.File;
import java.util.*;

public final class HeadlessAiVsAi {
    public static void main(String[] args) {
        System.setProperty("java.awt.headless", "true");

        // 1. GUI interface FIRST - ForgeConstants' static init calls GuiBase.getInterface().
        GuiBase.setInterface(new HeadlessGuiBase(args[0]));   // args[0] = forge home, e.g. /home/justin-a/forge/

        // 2. Preferences, card DB, decks, AI profiles.
        FModel.initialize(null, null);

        // 3. Deck. fromFile does not rename; the by-name store does (see 4.3).
        Deck deck = DeckSerializer.fromFile(
                new File(ForgeConstants.DECK_CONSTRUCTED_DIR + args[1]));   // "Pacho SHIELD.dck"

        // 4. Rules + two AI seats.
        GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);

        List<RegisteredPlayer> players = new ArrayList<>();
        RegisteredPlayer p1 = new RegisteredPlayer(deck);
        p1.setPlayer(GamePlayerUtil.createAiPlayer("AI-One", 0));
        players.add(p1);
        RegisteredPlayer p2 = new RegisteredPlayer(deck);
        p2.setPlayer(GamePlayerUtil.createAiPlayer("AI-Two", 1));
        players.add(p2);

        // 5. Run one game on this thread.
        Match match = new Match(rules, players, "mtg-table");
        Game game = match.createGame();
        // NOTE: SimulateMatch also calls game.setNoGUIUser() - that method does NOT exist in 2.0.14.
        try {
            match.startGame(game);
        } finally {
            game.setGameOver(GameEndReason.Draw);
        }

        for (GameLogEntry e : game.getGameLog().getLogEntries(GameLogEntryType.MATCH_RESULTS)) {
            System.out.println(e);
        }
        System.exit(0);
    }
}
```

Actual output of this program, `DISPLAY` unset:

```
headless    = true
FModel.initialize took 2033 ms
cards in DB = 95126
deck from file  = Pacho SHIELD (Marvel Super Heroes) (40 cards)
game took 3601 ms
RESULT: Match Result: AI-One: 0 AI-Two: 1
RESULT: Game Outcome: AI-Two has won because all opponents have lost
RESULT: Game Outcome: Turn 9
```

### 4.5 Source sketch — the `IGuiBase` (verified API for 2.0.14)

`IGuiBase` has **44 abstract methods + 4 defaults**, and the 2.0.14 interface is **byte-for-byte the same
method set** as the 2.0.15 source, so `forge-gui/tools/java/ForgeMatrixWriter.java:150-201` is a
valid template. Only the threading block differs from that template:

```java
public final class HeadlessGuiBase implements IGuiBase {
    private static final String EDT_NAME = "mtg-table-EDT";
    private final ExecutorService edt = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, EDT_NAME); t.setDaemon(true); return t;
    });
    private final String assetsDir;                     // MUST end with File.separator

    public HeadlessGuiBase(String forgeHome) {
        this.assetsDir = forgeHome.endsWith(File.separator) ? forgeHome : forgeHome + File.separator;
    }

    @Override public String  getAssetsDir()       { return assetsDir; }
    @Override public boolean isRunningOnDesktop() { return true; }   // false = mobile asset layout
    @Override public boolean isLibgdxPort()       { return false; }
    @Override public String  getCurrentVersion()  { return "mtg-table-headless"; }

    @Override public void invokeInEdtNow(Runnable r)   { r.run(); }
    @Override public void invokeInEdtLater(Runnable r) { edt.execute(r); }
    @Override public void invokeInEdtAndWait(Runnable r) {
        if (isGuiThread()) { r.run(); return; }
        try { edt.submit(r).get(); } catch (Exception e) { throw new RuntimeException(e); }
    }
    @Override public void runBackgroundTask(String msg, Runnable task) {
        Thread t = new Thread(task, "mtg-table-bg"); t.setDaemon(true); t.start();
    }
    /** Must be false on the game thread - see FThreads.assertExecutedByEdt. */
    @Override public boolean isGuiThread() { return EDT_NAME.equals(Thread.currentThread().getName()); }

    // everything else: no-op / null / identity, exactly as ForgeMatrixWriter's HeadlessGui does.
    // getImageFetcher, getSkinIcon, getUnskinnedIcon, getCardArt, createLayeredImage -> null
    // encodeSymbols -> str;  getScreenScale -> 1.0f;  getAvatarCount/getSleevesCount -> 0
    // download(svc, cb) -> cb.accept(false);  showXxxDialog -> default/initial value
    // createAudioClip/createAudioMusic -> null;  isSupportedAudioFormat -> false
    // getNewGuiGame -> null;  hostMatch -> null;  getUpnpPlatformService -> null; hasNetGame -> false
}
```

### 4.6 Source sketch — human vs AI (compiled and run; full game to turn 12)

The human seat goes through `HostedMatch`, which lives in `forge-gui` and is Swing-free:

```java
forge-gui/src/main/java/forge/gamemodes/match/HostedMatch.java:109
public void startMatch(GameRules gameRules, Set<GameType> appliedVariants,
                       List<RegisteredPlayer> players, RegisteredPlayer human, IGuiGame gui)
```

```java
GuiBase.setInterface(new HeadlessGuiBase(forgeHome));
FModel.initialize(null, null);

Deck deck = DeckSerializer.fromFile(new File(ForgeConstants.DECK_CONSTRUCTED_DIR + "Pacho SHIELD.dck"));

GameRules rules = new GameRules(GameType.Constructed);
rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
rules.setGamesPerMatch(1);

List<RegisteredPlayer> players = new ArrayList<>();
RegisteredPlayer human = new RegisteredPlayer(deck);
human.setPlayer(GamePlayerUtil.getGuiPlayer());                  // LobbyPlayerHuman
players.add(human);
RegisteredPlayer ai = new RegisteredPlayer(deck);
ai.setPlayer(GamePlayerUtil.createAiPlayer("Opponent", 1));      // LobbyPlayerAi
players.add(ai);

MyGuiGame gui = new MyGuiGame();          // extends AbstractGuiGame - this is the bridge to the browser
HostedMatch hosted = new HostedMatch();
hosted.setOnMatchOver(() -> { /* ... */ });
hosted.startMatch(rules, EnumSet.of(GameType.Constructed), players, human, gui);
// startMatch returns immediately; HostedMatch.java:283 runs the game on game.getAction().invoke(...)
```

Note the seat objects: **you never construct `PlayerControllerAi` or `PlayerControllerHuman`
yourself.** You set a `LobbyPlayer` on the `RegisteredPlayer`
(`LobbyPlayerAi` / `LobbyPlayerHuman`, both `IGameEntitiesFactory`), and the engine creates the
matching controller. `HostedMatch.startGame():220-243` then finds each `PlayerControllerHuman` and
does `humanController.setGui(gui)`, `gui.setGameView(gameView)`,
`gui.setOriginalGameController(p.getView(), humanController)`, and subscribes an event handler.
`GamePlayerUtil` overloads (VERIFIED in 2.0.14):
`createAiPlayer()`, `(String)`, `(String,String)`, `(String,int)`, `(String,int,String)`,
`(String,int,int)`, `(String,int,int,Set)`, `(String,int,int,Set,String)`; and
`getGuiPlayer()`, `getGuiPlayer(String,int,int,boolean)`.

### 4.7 The size of the browser bridge — VERIFIED by counting

- `IGuiGame` declares **87 abstract methods** (plus 19 defaults).
- `AbstractGuiGame` (`forge-gui/src/main/java/forge/gamemodes/match/AbstractGuiGame.java:39`)
  implements most of them. **Extending it leaves exactly 36 to write**, plus its own
  `protected abstract void updateCurrentPlayer(PlayerView)`.

The 36 (computed from the 2.0.14 bytecode, not guessed):

```
alertUser, assignCombatDamage, assignGenericAmount, chooseEntitiesForEffect,
chooseSingleEntityForEffect, confirm, disableOverlay, enableOverlay, finishGame,
flashIncorrectAction, getAbilityToPlay, getChoices, getGamestate, hideManaPool, hideZones,
isUiSetToSkipPhase, manipulateCardList, message, openView, openZones, order, restoreOldZones,
setCard, setPanelSelection, setPlayerAvatar, showCombat, showConfirmDialog, showErrorDialog,
showInputDialog, showManaPool, showOptionDialog, showPromptMessage, sideboard, tempShowZones,
updateButtons, updateShards
```

Two import traps: `IHasIcon` is `forge.game.player.IHasIcon` (not `forge.gui.interfaces`), and
`GameState` is `forge.game.GameState` (not `forge.gamemodes.match`).

**How the conversation actually flows** — captured live from my run:

```
[gui] updateButtons ok=Play/true cancel=Draw/true   thread=mtg-table-EDT
[gui] prompt: Human, you have won the coin toss.  Would you like to play or draw?
[gui] updateButtons ok=Keep/true cancel=Mulligan/true
[gui] prompt: Human, you are going first!  Do you want to keep your hand?
[gui] prompt: Cleanup Phase
              Select 1 card(s) to discard to bring your hand down to the maximum of 7 cards.
[gui] updateButtons ok=OK/false cancel=Cancel/false
...
[gui] prompt: Priority: Human / Turn: 12 (Opponent) / Phase: Declare Attackers Step / Stack: 1 to Resolve.
finishGame() called      isMatchOver = true
```

So the front-end contract is: `showPromptMessage` + `updateButtons` are the "what the engine says"
channel, and the answers go back through `getGameController()` (an `IGameController`):
`selectButtonOk()`, `selectButtonCancel()`, `selectCard(CardView, List, ITriggerEvent)`,
`selectPlayer(...)`, `selectAbility(SpellAbilityView)`, `passPriority()`, `useMana(byte)`,
`undoLastAction()`, `concede()`, `alphaStrike()`, `nextGameDecision(...)`,
`setShouldAutoYield(...)`. Note `updateButtons(owner, l1, l2, enable1, enable2, focus1)` with
`enable1 == false` means **the engine is waiting for a card click, not a button** — I confirmed this
is exactly what stalls a button-only client at the discard step, and that implementing
`selectCard` from `AbstractGuiGame.isSelecting()` / `isSelectable(CardView)` /
`getCurrentPlayer().getCards(ZoneType)` unblocks it and carries the game to completion.

Also critical: **the answer must not come from the game thread.** `updateButtons` is delivered on our
stand-in EDT (`InputProxy.java:73` does `FThreads.invokeInEdtLater(showMessage)`), and the game
thread is blocked on a `CountDownLatch` in `InputSyncronizedBase`. Answer from a third thread (for
mtg-table: the netty/WebSocket thread that receives the browser's click). That is exactly what the
real remote path does.

### 4.8 Command lines

```bash
FORGE=/home/justin-a/forge
JAR=$FORGE/forge-gui-desktop-2.0.14-jar-with-dependencies.jar

# compile
java -m jdk.compiler/com.sun.tools.javac.Main -cp "$JAR" -d out $(find src -name '*.java')

# run
java -Xmx4096m \
     -Djava.awt.headless=true \
     -Dio.netty.tryReflectionSetAccessible=true \
     -Dfile.encoding=UTF-8 \
     -cp "out:$JAR" \
     mtgtable.Server /home/justin-a/forge/ "Pacho SHIELD.dck"
```

`forge.sh` uses exactly `-Xmx4096m -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8`
(plus `-jar`). To that we add `-Djava.awt.headless=true`, which 2.0.14 does **not** set for itself.

Useful debug flag: **`-Dsentry.uncaught.handler.enabled=false`**. Sentry installs an uncaught-exception
handler that swallows startup crashes and leaves you with a silent `exit 1`; this flag makes the real
stack trace print. That is how I found the `GuiDesktop` `HeadlessException`.

---

## 5. Directory layout I'd recommend for mtg-table

Verified working (this is what all the runs above used):

```
<mtg-table-forge-home>/
  res -> /home/justin-a/forge/res          # symlink; read-only, 33k card scripts + editions
  forge.profile.properties                 # userDir=<mtg-table>/data   cacheDir=<mtg-table>/cache
<mtg-table>/data/                          # FModel creates 24 profile dirs here
<mtg-table>/data/decks/constructed/*.dck   # copies of the user's decks
<mtg-table>/cache/pics/cards/              # can be symlinked to /home/justin-a/.cache/forge/pics/cards
```

This keeps `/home/justin-a/forge` and `/home/justin-a/.forge` untouched, which matters because of
the deck-renaming behaviour in §4.3 and because `FModel.initialize` writes prefs and logs.

---

## 6. Version drift: 2.0.14 jar vs 2.0.15 source — VERIFIED, and it matters

The sparse checkout is `2.0.15-SNAPSHOT`; the installed jar is `2.0.14`. Differences I actually hit:

### 6.1 `Main` in 2.0.14 does not force headless and hides the crash

2.0.15's `Main.java:35-63` forces `java.awt.headless=true` for console modes *before any AWT class
loads*, and installs a printing uncaught-exception handler first, with a comment explaining that
Sentry otherwise reports and discards the exception "without ever reaching stderr".

The 2.0.14 bytecode has neither. Its help string is `"Known mode is 'sim', 'parse'"` (singular),
versus 2.0.15's `"Known modes are 'sim', 'parse', 'server'"`, and there is no `isCommandLineMode`
method and no `headless` string in the class.

Consequence, VERIFIED three ways (`DISPLAY` unset; `DISPLAY` set + `-Djava.awt.headless=true`;
`DISPLAY` unset with no flag):

```
$ java -cp $JAR forge.view.Main sim -d "Pacho SHIELD.dck" "Pacho SHIELD.dck" -n 1 -q
exit=1   (zero bytes on stdout, zero bytes on stderr)
```

**The installed Forge cannot run `sim` without a display at all**, and fails silently. With
`DISPLAY=:0` present and no headless flag, the same command works (AI vs AI, 1857 ms, exit 0).

This does not block us — our own `IGuiBase` bypasses `GuiDesktop` entirely, which I verified — but it
means: *do not* shell out to `forge.view.Main sim` as a headless subprocess with this jar.

### 6.2 `Game.setNoGUIUser()` does not exist in 2.0.14

`forge-game/src/main/java/forge/game/Game.java:1437` adds it, and `SimulateMatch.java:210` calls it.
It is **not** in the 2.0.14 `forge.game.Game` bytecode. Code copied verbatim from the source tree
will not compile against the installed jar.

### 6.3 Other drift

`gson` is a 2.0.15 dependency and is absent from the 2.0.14 jar; `jupnp` is 3.0.3 in the jar and
3.0.5 in the source pom; `HeadlessStartupTest`, `DeltaPacket`/`DeltaSyncManager` delta-sync and
`applyYieldUpdate` are newer. `IGuiBase` and `IGuiGame` themselves are identical between the two,
which is the good news — the bridge surface is stable.

**Recommendation:** develop against the installed 2.0.14 jar (zero build cost, verified working),
but write the bridge so the Forge jar path is a single configuration value. If we later want
2.0.15's headless fixes, replace the jar (or build from a full clone per §2.4) and re-compile — the
API we touch has not changed.

---

## 7. GPLv3 implications

Forge is GPL-3.0 (root `pom.xml` `<licenses>`, `LICENSE` in the repo, `LICENSE.txt` in the install).
Our Java bridge `import`s Forge classes, implements Forge interfaces (`IGuiBase`, `IGuiGame`), and
is loaded into the same JVM on the same classpath — that is linking by any reading of the GPL, so
**the bridge is a derivative work and must itself be GPLv3 (or a GPL-compatible licence), with its
complete corresponding source offered to anyone we distribute a binary to.** Practically: put the
whole `mtg-table` Java module under GPLv3, keep Forge's copyright notices intact, and do not add
dependencies whose licences are GPL-incompatible (the bundled stack — Apache-2.0, BSD, MIT, EPL/ASL
dual for jetty, CDDL for `javax.servlet-api` — is what Forge already ships, so it is settled for
them; anything *we* add is our problem to check). The TypeScript front-end that talks to the bridge
over a WebSocket is a **separate program**: it does not link Forge, it exchanges data across a
process boundary, so it is not derived from Forge and we may license it however we like — the
usual caveat being that this holds because the interface is a generic socket protocol carrying game
state, not a mechanism for the front-end to become part of Forge's own program. If mtg-table is only
ever run locally by the user and never distributed, the GPL's distribution triggers never fire at
all; the moment we publish a binary or a Docker image, they do. This is a practical reading, not
legal advice.

---

## 8. What I verified vs what I assumed

**Verified by execution on this machine:**
fat-jar contents and versions; bytecode level 61; absence of a JDK and presence of `jdk.compiler`;
`--release` being unusable; our classes compiling clean against the jar; `FModel.initialize` timing
and card counts; a full headless AI-vs-AI game; a full headless human-vs-AI game through
`HostedMatch` with our own `IGuiGame`; the `GuiDesktop` `HeadlessException` with stack trace; the
`FThreads.assertExecutedByEdt` failure and its fix; the deck rename/move behaviour; the silent
`exit 1` of `forge.view.Main sim` in three configurations; `setNoGUIUser` missing from 2.0.14.

**Verified by reading code only:** module dependency graph; enforcer rules; `distributionManagement`;
absence of `mvnw`; `ProtocolMethod` contents; `FServerManager`/`server` mode being unimplemented;
`ForgeProfileProperties` key names and defaults.

**Guesses, explicitly:** build wall-clock times; the exact Maven 3.9.9 download URL; whether any
Forge artifact happens to exist on GitHub Packages despite nothing in the repo pointing there; the
claim that endstep.cc uses the `ProtocolMethod`/`IGuiGame` seam (it fits their description exactly,
but I have no evidence from their site).

---

## 9. Open questions for the next step

1. Do we implement `IGuiGame` from scratch over JSON, or wrap `RemoteClientGuiGame` and translate
   `ProtocolMethod` events? The latter gets delta-sync and reconnect for free but drags Java
   serialization of `GameView`/`CardView` graphs into the wire format.
2. How do we serialise `CardView`/`PlayerView`/`GameView` to JSON for the browser, and how much of
   `TrackableProperty` do we need to mirror to make incremental updates work?
3. Do we ship 2.0.14 (works now) or move to a 2.0.15 build (headless fixes, `setNoGUIUser`,
   delta-sync) and accept a from-source build?
4. `SVar 'Any' not found in ability, fallback to Card (Quantum Reduction)` appeared on stderr for one
   of the user's own cards during every run — worth checking whether that card behaves correctly.
